import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { formatCPF } from '@/lib/validators';

export interface DiagnosticInfo {
  source: 'edge-function' | 'direct-id' | 'direct-cpf' | 'direct-email' | 'cached' | 'unknown';
  fetchedAt: number | null;
  attempts: number;
}

interface AgentProfile {
  id: string;
  name: string;
  cpf: string | null;
  matricula: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  team: string | null;
  birth_date: string | null;
  age: number | null;
  is_active: boolean | null;
  is_frozen?: boolean | null;
  approval_status?: string | null;
  unit_id: string | null;
  role: string | null;
  blood_type: string | null;
  avatar_url: string | null;
  license_status: string | null;
  license_expires_at: string | null;
  license_notes: string | null;
  unit: {
    id: string;
    name: string;
    municipality: string;
  } | null;
}

// IMPORTANT: use explicit FK join to units for consistent embedding
const AGENT_SELECT_QUERY = `
  id,
  name,
  cpf,
  matricula,
  email,
  phone,
  address,
  team,
  birth_date,
  age,
  is_active,
  unit_id,
  role,
  blood_type,
  avatar_url,
  license_status,
  license_expires_at,
  license_notes,
  unit:units(
    id,
    name,
    municipality
  )
`;

export function useAgentProfile() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const [agent, setAgent] = useState<AgentProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  // Prevent duplicate fetches - MUST be refs before any other state to maintain hook order
  const fetchingRef = useRef(false);
  const lastEmailRef = useRef<string | null>(null);
  const mountedRef = useRef(true);
  const retryCountRef = useRef(0);
  const retryTimerRef = useRef<number | null>(null);
  
  // CRÍTICO: Mantém o agente em cache para evitar "piscar" durante refresh de token
  const cachedAgentRef = useRef<AgentProfile | null>(null);
  
  // Diagnostic info - added after refs to maintain hook order stability
  const diagnosticInfoRef = useRef<DiagnosticInfo>({
    source: 'unknown',
    fetchedAt: null,
    attempts: 0,
  });

  useEffect(() => {
    mountedRef.current = true;

    // IMPORTANTE: Esperar auth terminar de carregar antes de decidir
    if (isAuthLoading) {
      return;
    }

    // Reset state if no user AND we never had a cached agent
    if (!user?.id && !user?.email) {
      // Se temos cache, mantém por mais tempo antes de limpar
      if (cachedAgentRef.current) {
        // Delay para dar tempo de recuperação de sessão
        const clearTimer = setTimeout(() => {
          if (!user?.id && !user?.email && mountedRef.current) {
            setAgent(null);
            cachedAgentRef.current = null;
            setIsLoading(false);
          }
        }, 3000);
        return () => clearTimeout(clearTimer);
      }
      
      setAgent(null);
      setIsLoading(false);
      lastEmailRef.current = null;
      fetchingRef.current = false;
      return;
    }

    // Build a cache key from both id and email
    const cacheKey = `${user.id || ''}-${user.email || ''}`;
    
    // Skip if already fetching or cache key hasn't changed and we have an agent
    if (fetchingRef.current) {
      return;
    }
    
    // Se temos agente em cache e o cacheKey é o mesmo, usa o cache
    if (lastEmailRef.current === cacheKey && (agent || cachedAgentRef.current)) {
      if (!agent && cachedAgentRef.current) {
        setAgent(cachedAgentRef.current);
      }
      setIsLoading(false);
      return;
    }

    const fetchAgentProfile = async () => {
      // Prevent concurrent fetches
      if (fetchingRef.current || !mountedRef.current) return;
      fetchingRef.current = true;
      let scheduledRetry = false;

      try {
        setIsLoading(true);
        setError(null);

        let foundAgent = null;
        let dataSource: DiagnosticInfo['source'] = 'unknown';

        // 0) Primary: backend function (token is automatically attached by the client).
        // Avoid calling getSession() here because it can trigger refresh-token storms on some devices.
        try {
          const { data, error: fnError } = await supabase.functions.invoke('agent-profile', {
            body: {},
          });

          if (!fnError && (data as any)?.success && (data as any)?.data) {
            foundAgent = (data as any).data;
            dataSource = 'edge-function';
          }
        } catch {
          // Ignore and fall back to direct table queries below.
        }

        // 1) Most reliable: link by auth user id (agents.id is created to match auth.uid())
        if (!foundAgent && mountedRef.current) {
          const { data: idData, error: idError } = await (supabase as any)
            .from('agents')
            .select(AGENT_SELECT_QUERY)
            .eq('id', user.id)
            .maybeSingle();

          if (idError) throw idError;
          if (idData) {
            foundAgent = idData;
            dataSource = 'direct-id';
          }
        }

        // 2) Fallback: Extract CPF from virtual email (format: cpf@agent.plantaopro.com)
        if (!foundAgent && mountedRef.current) {
          const emailParts = user.email!.split('@');
          const localPart = emailParts[0] || '';
          const cpfDigits = localPart.replace(/\D/g, '');
          const looksLikeCpf = cpfDigits.length === 11;

          if (looksLikeCpf) {
            const { data, error: fetchError } = await (supabase as any)
              .from('agents')
              .select(AGENT_SELECT_QUERY)
              .eq('cpf', cpfDigits)
              .maybeSingle();

            if (fetchError) throw fetchError;

            if (data) {
              foundAgent = data;
              dataSource = 'direct-cpf';
            } else {
              // Try formatted CPF (legacy format: 000.000.000-00)
              const cpfFormatted = formatCPF(cpfDigits);
              const { data: formattedData, error: formattedError } = await (supabase as any)
                .from('agents')
                .select(AGENT_SELECT_QUERY)
                .eq('cpf', cpfFormatted)
                .maybeSingle();

              if (formattedError) throw formattedError;
              if (formattedData) {
                foundAgent = formattedData;
                dataSource = 'direct-cpf';
              }
            }
          }
        }

        // 3) Last fallback: try email lookup (only works if agents.email is filled)
        if (!foundAgent && mountedRef.current) {
          const { data: emailData, error: emailError } = await (supabase as any)
            .from('agents')
            .select(AGENT_SELECT_QUERY)
            .eq('email', user.email)
            .maybeSingle();

          if (emailError) throw emailError;
          if (emailData) {
            foundAgent = emailData;
            dataSource = 'direct-email';
          }
        }

        if (mountedRef.current) {
          if (foundAgent) {
            // Normalize: backend function may return partials; ensure required keys exist
            const normalized: AgentProfile = {
              id: (foundAgent as any).id,
              name: (foundAgent as any).name,
              cpf: (foundAgent as any).cpf ?? null,
              matricula: (foundAgent as any).matricula ?? null,
              email: (foundAgent as any).email ?? null,
              phone: (foundAgent as any).phone ?? null,
              address: (foundAgent as any).address ?? null,
              team: (foundAgent as any).team ?? null,
              birth_date: (foundAgent as any).birth_date ?? null,
              age: (foundAgent as any).age ?? null,
              is_active: (foundAgent as any).is_active ?? null,
              is_frozen: (foundAgent as any).is_frozen ?? null,
              approval_status: (foundAgent as any).approval_status ?? null,
              unit_id: (foundAgent as any).unit_id ?? null,
              role: (foundAgent as any).role ?? null,
              blood_type: (foundAgent as any).blood_type ?? null,
              avatar_url: (foundAgent as any).avatar_url ?? null,
              license_status: (foundAgent as any).license_status ?? null,
              license_expires_at: (foundAgent as any).license_expires_at ?? null,
              license_notes: (foundAgent as any).license_notes ?? null,
              unit: ((foundAgent as any).unit as AgentProfile['unit']) ?? null,
            };

            setAgent(normalized);
            cachedAgentRef.current = normalized;
            // Cache key based on user id + email
            lastEmailRef.current = `${user.id || ''}-${user.email || ''}`;
            retryCountRef.current = 0;
            
            // Update diagnostic info
            diagnosticInfoRef.current = {
              source: dataSource,
              fetchedAt: Date.now(),
              attempts: retryCountRef.current + 1,
            };
          } else {
            // CRÍTICO: Evitar mostrar "Perfil não carregou" por flutuação temporária.
            // Faz até 3 retentativas com backoff antes de assumir "não encontrado".
            retryCountRef.current += 1;
            const attempt = retryCountRef.current;

            if (attempt <= 3) {
              const delays = [400, 900, 1600];
              const delay = delays[attempt - 1] ?? 1600;

              // Force refetch by clearing cache key
              lastEmailRef.current = null;

              if (retryTimerRef.current) {
                window.clearTimeout(retryTimerRef.current);
              }
              retryTimerRef.current = window.setTimeout(() => {
                fetchingRef.current = false;
                // Trigger by toggling loading; effect deps are unchanged, so we call fetch directly.
                fetchAgentProfile();
              }, delay);

              // Keep loading during retries
              setIsLoading(true);
              scheduledRetry = true;
              return;
            }

            setAgent(null);
            // Do NOT cache "not found" to allow retry after auth hydration / transient failures
            lastEmailRef.current = null;
          }
        }
      } catch (err) {
        console.error('Error fetching agent profile:', err);
        if (mountedRef.current) {
          setError(err as Error);
        }
      } finally {
        // If we're scheduling a retry, keep loading.
        if (mountedRef.current && !scheduledRetry) setIsLoading(false);
        fetchingRef.current = false;
      }
    };

    // Small delay to debounce rapid auth state changes
    const timer = setTimeout(fetchAgentProfile, 100);

    return () => {
      clearTimeout(timer);
      if (retryTimerRef.current) {
        window.clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
      mountedRef.current = false;
      fetchingRef.current = false;
    };
  }, [user?.id, user?.email]);

  // Function to manually refetch profile
  const refetch = async () => {
    if (!user?.email || fetchingRef.current) return;
    
    lastEmailRef.current = null; // Force refetch
    fetchingRef.current = false;
    retryCountRef.current = 0;
    
    // Trigger useEffect by forcing a state update
    setIsLoading(true);
  };

  return { agent, isLoading, error, refetch, _diagnosticInfo: diagnosticInfoRef.current };
}
