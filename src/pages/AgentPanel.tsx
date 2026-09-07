import { useEffect, useState, useCallback, useRef, lazy, Suspense, type ReactNode } from 'react';
import { LoadingBackdrop } from '@/components/ui/loading-backdrop';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useAgentProfile } from '@/hooks/useAgentProfile';
import { useBackNavigation } from '@/hooks/useBackNavigation';
import { useSessionPersistence } from '@/hooks/useSessionPersistence';
import { useShiftNotifications } from '@/hooks/useShiftNotifications';
import { useBHReminder } from '@/hooks/useBHReminder';
import { useBHReminderHour } from '@/components/agent-panel/BHReminderSettings';
import { useAlarmNotifications } from '@/hooks/useAlarmNotifications';
import { useShiftLifecycleNotifications } from '@/hooks/useShiftLifecycleNotifications';
import { useTrackAgentPresence } from '@/hooks/useOnlineAgents';

const TeamMembersCard = lazy(() => import('@/components/agent-panel/TeamMembersCard').then(m => ({ default: m.TeamMembersCard })));
import { OnDutyOverlay } from '@/components/agent-panel/OnDutyOverlay';
const ShiftOperationsCenter = lazy(() => import('@/components/agent-panel/ShiftOperationsCenter').then(m => ({ default: m.ShiftOperationsCenter })));
const ShiftBriefingCard = lazy(() => import('@/components/agent-panel/ShiftBriefingCard').then(m => ({ default: m.ShiftBriefingCard })));
import { NotificationsPanel } from '@/components/agent-panel/NotificationsPanel';
import { AgentRoleSelector } from '@/components/agent-panel/AgentRoleSelector';
import { ShiftSetupPrompt } from '@/components/agent-panel/ShiftSetupPrompt';
import { ShiftAlertsBanner, useShiftAlertsBanner } from '@/components/agent-panel/ShiftAlertsBanner';
import { BHReminderSettings } from '@/components/agent-panel/BHReminderSettings';
import { BirthdayCard } from '@/components/agent-panel/BirthdayCard';
import { ProfileCompletionAlert } from '@/components/agent-panel/ProfileCompletionAlert';
// TacticalRadar removido do painel: agora vive apenas em /dashboard e /diretorio para eliminar duplicidade com TeamMembersCard.
import { SessionMonitorBanner } from '@/components/SessionMonitorBanner';
const DiagnosticReportButton = lazy(() => import('@/components/DiagnosticReportButton').then(m => ({ default: m.DiagnosticReportButton })));
import { SafeModeToggle } from '@/components/SafeModeToggle';
import { CopyrightFooter } from '@/components/CopyrightFooter';
import { AnnouncementsMural } from '@/components/AnnouncementsMural';
import { ThemedPanelBackground } from '@/components/ThemedPanelBackground';
import { PublicSecurityBackdrop } from '@/components/agent-panel/PublicSecurityBackdrop';
import { NetworkStatusPill } from '@/components/agent-panel/NetworkStatusPill';
import { useQueryClient } from '@tanstack/react-query';
import { OfflineIndicator } from '@/components/OfflineIndicator';
import { useNetworkStatus } from '@/hooks/useOfflineCache';
import { AgentPanelHeader } from '@/components/agent-panel/AgentPanelHeader';
import { UnitSummaryCard } from '@/components/agent-panel/UnitSummaryCard';
import { AdminAnnouncementsPanel } from '@/components/agent-panel/AdminAnnouncementsPanel';
const AdDisplaySystem = lazy(() => import('@/components/agent-panel/AdDisplaySystem').then(m => ({ default: m.AdDisplaySystem })));
import { usePromosEnabled } from '@/hooks/usePromosEnabled';
import { AgentHeroPanel } from '@/components/agent-panel/AgentHeroPanel';
import { PanelHeroHUD } from '@/components/panel/PanelHeroHUD';
import { AutoRoundBanner } from '@/components/rounds/AutoRoundBanner';
import { useCompactMode } from '@/hooks/useCompactMode';
import { cn } from '@/lib/utils';

// Lazy-loaded tab-specific components (code-splitting por aba interna)
const ProfessionalShiftTimer = lazy(() => import('@/components/agent-panel/ProfessionalShiftTimer').then(m => ({ default: m.ProfessionalShiftTimer })));
const BHTracker = lazy(() => import('@/components/agent-panel/BHTracker').then(m => ({ default: m.BHTracker })));
const ShiftScheduleCard = lazy(() => import('@/components/agent-panel/ShiftScheduleCard').then(m => ({ default: m.ShiftScheduleCard })));
const NextShiftCountdown = lazy(() => import('@/components/agent-panel/NextShiftCountdown').then(m => ({ default: m.NextShiftCountdown })));
const ChatPanel = lazy(() => import('@/components/agent-panel/ChatPanel').then(m => ({ default: m.ChatPanel })));
const SwapRequestsCard = lazy(() => import('@/components/agent-panel/SwapRequestsCard').then(m => ({ default: m.SwapRequestsCard })));
const LeaveRequestCard = lazy(() => import('@/components/agent-panel/LeaveRequestCard').then(m => ({ default: m.LeaveRequestCard })));
const NotificationsAndAlertsCard = lazy(() => import('@/components/agent-panel/NotificationsAndAlertsCard').then(m => ({ default: m.NotificationsAndAlertsCard })));
const AgentSettingsCard = lazy(() => import('@/components/agent-panel/AgentSettingsCard').then(m => ({ default: m.AgentSettingsCard })));
const AgentEventsCard = lazy(() => import('@/components/agent-panel/AgentEventsCard').then(m => ({ default: m.AgentEventsCard })));


const ShiftCalendarOverview = lazy(() => import('@/components/agent-panel/ShiftCalendarOverview').then(m => ({ default: m.ShiftCalendarOverview })));
const RecentShiftCyclesCard = lazy(() => import('@/components/agent-panel/RecentShiftCyclesCard').then(m => ({ default: m.RecentShiftCyclesCard })));
const BHEvolutionChart = lazy(() => import('@/components/agent-panel/BHEvolutionChart').then(m => ({ default: m.BHEvolutionChart })));
const BHHistoryTracker = lazy(() => import('@/components/agent-panel/BHHistoryTracker').then(m => ({ default: m.BHHistoryTracker })));

const PasswordChangeRequest = lazy(() => import('@/components/agent-panel/PasswordChangeRequest').then(m => ({ default: m.PasswordChangeRequest })));
const SmartAlarmClock = lazy(() => import('@/components/agent-panel/SmartAlarmClock').then(m => ({ default: m.SmartAlarmClock })));
const RoundsHistoryCard = lazy(() => import('@/components/agent-panel/RoundsHistoryCard').then(m => ({ default: m.RoundsHistoryCard })));
// AgentsDirectoryCard agora vive somente na rota /diretorio (abas Equipe/Unidade/Sistema).
const RoundsManager = lazy(() => import('@/components/home/RoundsManager').then(m => ({ default: ((m as any).RoundsManager ?? (m as any).default) as React.ComponentType<{ customTrigger?: ReactNode }> })));
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Users, MessageCircle, Calendar, Clock, ArrowRightLeft, CalendarOff, Settings, User, CalendarDays, Shield, Zap, Key, Bell, BellRing, Megaphone, Radio, ChevronDown } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { notify } from '@/lib/notify';
import { SectionBoundary } from '@/components/ui/section-boundary';
import { LoadingState } from '@/components/ui/data-states';

function ModuleFallback({ compact = false }: { compact?: boolean }) {
  return (
    <div
      aria-busy="true"
      className={cn(
        'w-full rounded-xl border border-amber-500/20 bg-slate-900/60',
        compact ? 'min-h-[120px]' : 'min-h-[160px]',
      )}
    >
      <LoadingState label="Carregando módulo" compact={compact} />
    </div>
  );
}

export default function AgentPanel() {
  const { user, isLoading, masterSession, isAdmin } = useAuth();
  const { agent, isLoading: isLoadingAgent } = useAgentProfile();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('equipe');
  const [shiftsFilter, setShiftsFilter] = useState<'hoje' | 'semana' | 'mes'>('semana');

  const [mountedTabs, setMountedTabs] = useState<Set<string>>(() => new Set(['equipe']));
  const { compact, toggle: toggleCompact } = useCompactMode();
  const [hasShifts, setHasShifts] = useState(true);
  const { enabled: promosEnabled } = usePromosEnabled();
  const [isVerifyingSession, setIsVerifyingSession] = useState(false);
  const [sessionMissing, setSessionMissing] = useState(false);

  // Shift alerts banner control
  const { isDismissed: isShiftBannerDismissed, setIsDismissed: setShiftBannerDismissed, forceShow: forceShowShiftBanner, reactivateBanner: reactivateShiftBanner } = useShiftAlertsBanner();

  // ESC key navigation - goes back to previous page or home
  useBackNavigation({ enabled: true, fallbackPath: '/' });

  // Session persistence with retry logic
  const { 
    isOnline, 
    isRetrying, 
    retryCount, 
    maxRetries,
    manualRetry 
  } = useSessionPersistence({
    onConnectionLost: () => {
      notify.warning('Conexão perdida', {
        description: 'Tentando reconectar automaticamente...',
      });
    },
    onConnectionRestored: () => {
      notify.success('Conexão restaurada', {
        description: 'Sua sessão foi recuperada com sucesso.',
      });
    },
    onMaxRetriesReached: () => {
      notify.error('Falha na reconexão', {
        description: 'Não foi possível restaurar a sessão. Por favor, faça login novamente.',
      });
    },
  });



  // Auto-sync on reconnect: when the device comes back online, refresh only
  // ACTIVE React Query caches (mounted hooks) so stale data updates instantly
  // and previous error states clear — without triggering a heavy refetch
  // storm across every inactive query.
  const queryClient = useQueryClient();
  const wasOfflineRef = useRef(false);
  const handleTabChange = useCallback((value: string) => {
    setActiveTab(value);
    setMountedTabs((current) => {
      if (current.has(value)) return current;
      const next = new Set(current);
      next.add(value);
      return next;
    });
  }, []);

  useEffect(() => {
    if (!isOnline) {
      wasOfflineRef.current = true;
      return;
    }
    if (wasOfflineRef.current) {
      wasOfflineRef.current = false;
      notify.info('Sincronizando dados', {
        description: 'Atualizando informações após reconexão...',
      });
      // Only refetch queries currently mounted — light on CPU/network
      queryClient.invalidateQueries({ refetchType: 'active' });
      // Clear stale errors from mutations so buttons re-enable cleanly
      queryClient.getMutationCache().clear();
    }
  }, [isOnline, queryClient]);







  // Start perf monitor (LCP/CLS/INP/long tasks). No-op in prod unless
  // localStorage.perf_logs === '1'. Logs surface in the browser console.
  useEffect(() => {
    void import('@/lib/perfMonitor').then((m) => m.startPerfMonitor());
  }, []);

  // Idle-time prefetch: warm up the heaviest lazy chunks so switching to
  // any tab is instant. Uses requestIdleCallback with a setTimeout fallback.
  // Also pre-mounts all tabs (hidden) so clicks never trigger a Suspense
  // fallback — the DOM já está pronto, apenas alterna visibilidade.
  const ALL_TAB_KEYS = ['equipe', 'plantoes', 'bh', 'folgas', 'agenda', 'permutas', 'rondas', 'chat', 'config'] as const;
  useEffect(() => {
    const preloadNextTabs = () => {
      // Fire and forget — Vite dedupes and browser cache handles re-entry.
      void import('@/components/agent-panel/ProfessionalShiftTimer');
      void import('@/components/agent-panel/NextShiftCountdown');
      void import('@/components/agent-panel/ShiftScheduleCard');
      void import('@/components/agent-panel/ShiftCalendarOverview');
      void import('@/components/agent-panel/RecentShiftCyclesCard');
      void import('@/components/agent-panel/ChatPanel');
      void import('@/components/agent-panel/LeaveRequestCard');
      void import('@/components/agent-panel/AgentEventsCard');
      void import('@/components/agent-panel/BHTracker');
      void import('@/components/agent-panel/BHEvolutionChart');
      void import('@/components/agent-panel/BHHistoryTracker');

      void import('@/components/agent-panel/SwapRequestsCard');
      void import('@/components/agent-panel/NotificationsAndAlertsCard');
      void import('@/components/agent-panel/AgentSettingsCard');
      void import('@/components/agent-panel/PasswordChangeRequest');
      void import('@/components/agent-panel/SmartAlarmClock');
      void import('@/components/agent-panel/RoundsHistoryCard');
      void import('@/components/agent-panel/ShiftOperationsCenter');
      void import('@/components/agent-panel/ShiftBriefingCard');
      void import('@/components/DiagnosticReportButton');
      void import('@/components/home/RoundsManager');
    };

    // Mount everything immediately (hidden via `data-[state=inactive]:hidden`)
    // so any subsequent tab click is instant — no chunk fetch, no fallback.
    const mountAllTabs = () => {
      setMountedTabs((current) => {
        if (ALL_TAB_KEYS.every((k) => current.has(k))) return current;
        return new Set(ALL_TAB_KEYS);
      });
    };

    const ric = (window as any).requestIdleCallback as
      | ((cb: () => void, opts?: { timeout: number }) => number)
      | undefined;
    if (ric) {
      const id1 = ric(preloadNextTabs, { timeout: 400 });
      const id2 = ric(mountAllTabs, { timeout: 1200 });
      return () => {
        (window as any).cancelIdleCallback?.(id1);
        (window as any).cancelIdleCallback?.(id2);
      };
    }
    const t1 = window.setTimeout(preloadNextTabs, 120);
    const t2 = window.setTimeout(mountAllTabs, 400);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, []);

  // Hover/pointerdown prefetch: se o usuário aponta uma aba antes do
  // idle callback disparar, montamos aquela aba imediatamente para
  // eliminar qualquer flash de loading.
  const handleTabPointerEnter = useCallback((value: string) => {
    setMountedTabs((current) => {
      if (current.has(value)) return current;
      const next = new Set(current);
      next.add(value);
      return next;
    });
  }, []);



  // Shift notifications - checks for upcoming shifts and sends reminders
  useShiftNotifications({
    agentId: agent?.id || '',
    enabled: !!agent?.id,
    reminderHoursBefore: [24, 1], // 24h and 1h before
  });

  // Get saved BH reminder hour preference
  const bhReminderHour = useBHReminderHour(agent?.id || '');

  // BH daily reminder - reminds to register BH if not done today
  useBHReminder({
    agentId: agent?.id || '',
    enabled: !!agent?.id,
    reminderHour: bhReminderHour, // Use saved preference
  });

  // Alarm notifications for shifts
  useAlarmNotifications({
    agentId: agent?.id || '',
    enabled: !!agent?.id,
    alarmBeforeMinutes: 60, // 1 hour before shift
  });

  // Web push: 1h antes + fim do plantão
  useShiftLifecycleNotifications({ agentId: agent?.id, enabled: !!agent?.id });

  // Publica presença do agente em tempo real
  useTrackAgentPresence(agent?.id, {
    unit_id: (agent as any)?.unit_id,
    team: agent?.team,
    name: agent?.name,
  });



  useEffect(() => {
    if (agent?.id) {
      checkAgentShifts();
    }
  }, [agent?.id]);

  const checkAgentShifts = async () => {
    if (!agent?.id) return;
    try {
      const { count, error } = await (supabase as any)
        .from('agent_shifts')
        .select('*', { count: 'exact', head: true })
        .eq('agent_id', agent.id);

      if (!error) {
        setHasShifts((count || 0) > 0);
      }
    } catch (error) {
      console.error('Error checking shifts:', error);
    }
  };

  // Track if we had a valid session to prevent aggressive redirects during hydration
  const hadSessionRef = useRef(false);
  
  // Mark that we had a session once user/agent loads successfully
  useEffect(() => {
    if (user || agent) {
      hadSessionRef.current = true;
    }
  }, [user, agent]);

  // Redirect only if master session is accessing agent panel (not allowed)
  // IMPORTANT: Do NOT redirect to home when user is temporarily null - this causes session loops
  useEffect(() => {
    if (isLoading || isLoadingAgent) return;

    // Master session must never access the agent panel
    if (masterSession && !user) {
      navigate('/master', { replace: true });
    }
  }, [user, masterSession, isLoading, isLoadingAgent, navigate]);

  // CRÍTICO: Só redireciona para home se NUNCA teve sessão válida neste ciclo.
  // Isso previne logout durante hidratação/refresh de token.
  useEffect(() => {
    if (isLoading || isLoadingAgent) return;
    
    // Se já teve sessão válida, NÃO redireciona - permite tempo de recuperação
    if (hadSessionRef.current) return;
    
    // Se não há user/master, fazemos UMA verificação de sessão.
    // Importante: não redirecionar automaticamente (evita loop infinito); deixa o usuário decidir.
    if (!user && !masterSession) {
      let cancelled = false;
      setIsVerifyingSession(true);
      setSessionMissing(false);

      const timer = window.setTimeout(async () => {
        try {
          const { data } = await supabase.auth.getSession();
          const hasSession = !!data?.session;

          if (cancelled) return;
          if (hasSession || hadSessionRef.current) {
            setSessionMissing(false);
            return;
          }

          setSessionMissing(true);
        } finally {
          if (!cancelled) setIsVerifyingSession(false);
        }
      }, 2500);

      return () => {
        cancelled = true;
        window.clearTimeout(timer);
      };
    }

    // Reset se recuperou user/master
    setSessionMissing(false);
    setIsVerifyingSession(false);
  }, [user, masterSession, isLoading, isLoadingAgent, navigate]);

  // If an admin account lands here (no linked agent profile), route to the admin area instead
  useEffect(() => {
    if (isLoading || isLoadingAgent) return;
    if (user && isAdmin && !agent) {
      navigate('/admin', { replace: true });
    }
  }, [user, isAdmin, agent, isLoading, isLoadingAgent, navigate]);


  // Loading state - mostrar indicador profissional durante carregamento
  if (isLoading || isLoadingAgent) {
    return (
      <div className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <LoadingBackdrop />
        <div className="relative flex flex-col items-center gap-4">
          <div className="relative">
            <div className="p-4 bg-primary/10 border border-primary/30 rounded-2xl animate-pulse">
              <Shield className="h-10 w-10 text-primary" />
            </div>
            <Loader2 className="absolute -bottom-1 -right-1 h-5 w-5 text-primary animate-spin" />
          </div>
          <p className="text-zinc-300 text-sm tracking-wide">Carregando painel...</p>
        </div>
      </div>
    );
  }

  // Sem sessão - mostrar loading enquanto verifica
  if (!user && !masterSession) {
    // Se está verificando sessão, mostra loading
    if (isVerifyingSession) {
      return (
        <div className="relative min-h-screen flex items-center justify-center overflow-hidden">
          <LoadingBackdrop />
          <div className="relative flex flex-col items-center gap-4">
            <div className="p-4 bg-primary/10 border border-primary/30 rounded-2xl">
              <Shield className="h-10 w-10 text-primary animate-pulse" />
            </div>
            <p className="text-zinc-300 text-sm tracking-wide">Verificando sessão...</p>
          </div>
        </div>
      );
    }
    
    // Se sessão realmente não existe, redireciona para home
    if (sessionMissing) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 p-4">
          <div className="max-w-md w-full bg-zinc-900/80 backdrop-blur-xl rounded-2xl border border-amber-500/30 p-8 shadow-2xl">
            <div className="flex flex-col items-center gap-6">
              <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl">
                <Shield className="h-10 w-10 text-amber-400" />
              </div>
              <div className="text-center space-y-2">
                <h3 className="text-xl font-bold text-zinc-100">Sessão não encontrada</h3>
                <p className="text-zinc-400 text-sm leading-relaxed">
                  Por favor, faça login novamente para acessar seu painel.
                </p>
              </div>
              <Button
                onClick={() => navigate('/')}
                className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl"
              >
                Ir para Login
              </Button>
            </div>
          </div>
        </div>
      );
    }
    
    // Retornar loading enquanto ainda não determinou o estado
    return (
      <div className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <LoadingBackdrop />
        <div className="relative flex flex-col items-center gap-4">
          <div className="p-4 bg-primary/10 border border-primary/30 rounded-2xl">
            <Shield className="h-10 w-10 text-primary animate-pulse" />
          </div>
          <p className="text-zinc-300 text-sm tracking-wide">Conectando...</p>
        </div>
      </div>
    );
  }

  // CRÍTICO: Se é admin sem perfil de agente, mostrar loading enquanto redireciona
  // para evitar flash da tela de erro
  if (user && isAdmin && !agent) {
    return (
      <div className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <LoadingBackdrop />
        <div className="relative flex flex-col items-center gap-5">
          <div className="p-4 bg-indigo-500/10 border border-indigo-500/30 rounded-2xl">
            <Shield className="h-10 w-10 text-indigo-400" />
          </div>
          <div className="text-center space-y-1">
            <p className="text-zinc-100 font-medium">Acesso Administrativo</p>
            <p className="text-zinc-400 text-sm">Redirecionando para o painel...</p>
          </div>
        </div>
      </div>
    );
  }

  // Apenas bloquear se o cadastro foi rejeitado ou se is_active=false
  // REMOVIDO: Verificação de approval_status='pending' - usuários entram direto após cadastro
  if (agent && (agent.approval_status === 'rejected' || agent.is_active === false)) {
    const isRejected = agent.approval_status === 'rejected';

    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 p-4">
        <div className="max-w-md w-full bg-zinc-900/80 backdrop-blur-xl rounded-2xl border border-rose-500/30 p-8 shadow-2xl">
          <div className="flex flex-col items-center gap-6">
            <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl">
              <Shield className="h-10 w-10 text-rose-400" />
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-xl font-bold text-zinc-100">
                {isRejected ? 'Cadastro Rejeitado' : 'Acesso Bloqueado'}
              </h3>
              <p className="text-zinc-400 text-sm leading-relaxed">
                {isRejected
                  ? 'Seu cadastro foi rejeitado pela administração. Entre em contato com a coordenação.'
                  : 'Seu acesso está temporariamente desativado. Procure a administração.'}
              </p>
            </div>
            <div className="flex flex-col w-full gap-3 pt-2">
              <Button
                onClick={() => window.location.reload()}
                className="w-full h-12 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-medium rounded-xl border border-zinc-700"
              >
                Recarregar Página
              </Button>
              <Button
                variant="ghost"
                onClick={async () => {
                  try { await supabase.auth.signOut(); } catch { /* ignore */ }
                  window.location.replace('/');
                }}
                className="w-full h-12 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-xl"
              >
                Encerrar Sessão
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show error state if no agent - AFTER all hooks
  // Mas apenas para usuários normais, não admins
  if (!agent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 p-4">
        <div className="max-w-md w-full bg-zinc-900/80 backdrop-blur-xl rounded-2xl border border-amber-500/30 p-8 shadow-2xl">
          <div className="flex flex-col items-center gap-6">
            <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl">
              <User className="h-10 w-10 text-amber-400" />
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-xl font-bold text-zinc-100">Perfil Não Encontrado</h3>
              <p className="text-zinc-400 text-sm leading-relaxed">
                Não foi possível carregar seus dados. O sistema está tentando reconectar automaticamente.
              </p>
            </div>
            <div className="flex flex-col w-full gap-3 pt-2">
              <Button
                onClick={() => window.location.reload()}
                className="w-full h-12 bg-amber-600 hover:bg-amber-500 text-white font-semibold rounded-xl shadow-lg shadow-amber-500/20"
              >
                Tentar Novamente
              </Button>
              <Button
                variant="ghost"
                onClick={async () => {
                  try { await supabase.auth.signOut(); } catch { /* ignore */ }
                  window.location.replace('/');
                }}
                className="w-full h-12 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-xl"
              >
                Encerrar Sessão
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
    <ThemedPanelBackground team={agent?.team || null} showTeamImage={false} lowEffects>
      <PublicSecurityBackdrop minimal />
      <NetworkStatusPill />
      <div className="hud-scope typoclear flex-1 flex flex-col w-full min-w-0 min-h-0">




      {/* Session Monitor Banner - Visual session status */}
      <SessionMonitorBanner />

      {/* Auto-Round Banner — ronda iniciada automaticamente pelo sistema */}
      <AutoRoundBanner />



      <div className="flex-1 flex flex-col w-full min-w-0 min-h-0 no-swipe-back">
        <main 
          data-compact={compact ? 'true' : 'false'}
          className={`flex-1 w-full min-w-0 overflow-y-auto overflow-x-hidden no-swipe-back ${compact ? 'px-1.5 py-1.5 sm:p-2 md:p-2.5' : 'px-2 py-1.5 sm:p-2.5 md:p-3 lg:p-4'}`}
          style={{
            WebkitOverflowScrolling: 'touch',
            overscrollBehavior: 'contain',
            overscrollBehaviorX: 'none',
            scrollBehavior: 'auto',
            touchAction: 'pan-y pinch-zoom',
            paddingTop: 'max(env(safe-area-inset-top, 0px), 6px)',
            paddingLeft: 'max(env(safe-area-inset-left, 0px), 6px)',
            paddingRight: 'max(env(safe-area-inset-right, 0px), 6px)',
            paddingBottom: 'max(env(safe-area-inset-bottom, 12px), 24px)',
          }}
        >
          <div className={`agent-panel-inner w-full mx-auto pb-12 sm:pb-16 ${compact ? 'max-w-[820px] space-y-1.5 md:space-y-2' : 'max-w-[960px] space-y-2 md:space-y-2.5'}`}>
            {/* Main Tabs - sticky combined block (header + tabs) */}
            <Tabs value={activeTab} onValueChange={handleTabChange} className={compact ? 'space-y-1.5 md:space-y-2' : 'space-y-2 md:space-y-2.5'}>
              {/* Sticky combined block: Professional Header + Tabs Control Panel */}
              <div
                role="region"
                aria-label="Cabeçalho e navegação do painel"
                className={cn(
                  // Full-bleed sticky wrapper — background REMOVIDO para que o
                  // backdrop SVG (escudo/radar/grade) apareça atrás. Os cards
                  // internos já têm bg escuro próprio, então legibilidade
                  // permanece intacta.
                  'sticky top-0 z-50 relative left-1/2 -translate-x-1/2 w-screen',
                  'focus-within:ring-1 focus-within:ring-amber-500/40',
                  'pt-0.5 pb-0.5'
                )}
              >

                <div
                  className={cn(
                    'mx-auto w-full',
                    compact ? 'max-w-[820px] space-y-1 px-1.5 sm:px-2 md:px-2.5' : 'max-w-[960px] space-y-1.5 px-2 sm:px-2.5 md:px-3 lg:px-3.5'
                  )}
                >


                {/* Professional Header Bar */}
                <AgentPanelHeader 
                  agent={{
                    id: agent.id,
                    name: agent.name,
                    team: agent.team,
                    role: (agent as any).role,
                    blood_type: (agent as any).blood_type,
                    avatar_url: (agent as any).avatar_url,
                    unit_id: (agent as any).unit_id
                  }}
                  isOnline={isOnline}
                  onReactivateShiftBanner={reactivateShiftBanner}
                  isShiftBannerDismissed={isShiftBannerDismissed}
                  compact={compact}
                  onToggleCompact={toggleCompact}
                />

                {/* Control Panel Container - Modern Glass Design */}
                <div className="relative tactical-strip bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-xl border border-amber-500/40 shadow-md overflow-hidden">

                {/* Decorative accent (removed the always-on gradient overlay to cut repaints during scroll) */}


                
                {/* Control Panel Header - Compact & Professional */}
                <div className={cn(
                  'relative flex items-center justify-between gap-2 border-b border-amber-500/20',
                  compact ? 'px-1.5 py-0.5 md:px-2 md:py-1' : 'px-2 py-1 md:px-2.5 md:py-1.5'
                )}>
                  <div className="flex items-center gap-1.5 md:gap-2 min-w-0">
                    <div className="p-0.5 md:p-1 rounded-md bg-gradient-to-br from-amber-400 via-amber-500 to-orange-600 shadow-sm shadow-amber-500/30 ring-1 ring-amber-300/30 shrink-0">
                      <Shield className="h-3 w-3 md:h-3.5 md:w-3.5 text-black" />
                    </div>
                    <div className="leading-tight min-w-0">
                      <h2 className="text-[10px] md:text-xs font-black text-amber-100 tracking-wider uppercase truncate">
                        Painel de Controle
                      </h2>
                      <p className="hidden lg:block text-[9px] md:text-[10px] text-amber-400/80 font-medium tracking-wide">
                        Sistema Operacional Integrado
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 bg-emerald-500/15 px-1 py-0.5 md:px-1.5 rounded border border-emerald-500/40 shrink-0">
                    <Zap className="h-2 w-2 md:h-2.5 md:w-2.5 text-emerald-400" />
                    <span className="text-[8px] md:text-[9px] font-bold text-emerald-300 tracking-wider">ONLINE</span>
                  </div>
                </div>

                
                {/* Tabs Grid - Compact, readable */}
                <div className={compact ? 'p-1 md:p-1.5' : 'p-1.5 md:p-2'}>
                  <TabsList className={cn(
                    'bg-gradient-to-br from-slate-800/95 via-slate-900/90 to-slate-800/95 border border-amber-500/20 h-auto grid grid-cols-5 sm:grid-cols-5 lg:grid-cols-10 rounded-lg shadow-inner w-full',
                    compact ? 'p-0.5 gap-0.5 md:p-1 md:gap-1' : 'p-1 gap-1 md:p-1.5 md:gap-1.5'
                  )}>

                    {([
                      {
                        value: 'equipe', label: 'Equipe', full: 'Minha Equipe', Icon: Users,
                        trigger: 'hover:bg-amber-500/15 hover:border-amber-500/50 data-[state=active]:bg-gradient-to-br data-[state=active]:from-amber-400 data-[state=active]:via-amber-500 data-[state=active]:to-orange-600 data-[state=active]:text-black data-[state=active]:border-amber-300',
                        icon: 'text-amber-400 group-data-[state=active]:text-black',
                        text: 'text-amber-200 group-data-[state=active]:text-black',
                      },
                      {
                        value: 'plantoes', label: 'Plantões', full: 'Meus Plantões', Icon: Calendar,
                        trigger: 'hover:bg-orange-500/15 hover:border-orange-500/50 data-[state=active]:bg-gradient-to-br data-[state=active]:from-orange-400 data-[state=active]:via-orange-500 data-[state=active]:to-red-600 data-[state=active]:text-white data-[state=active]:border-orange-300',
                        icon: 'text-orange-400 group-data-[state=active]:text-white',
                        text: 'text-orange-200 group-data-[state=active]:text-white',
                      },
                      {
                        value: 'bh', label: 'B.Horas', full: 'Banco de Horas', Icon: Clock,
                        trigger: 'hover:bg-emerald-500/15 hover:border-emerald-500/50 data-[state=active]:bg-gradient-to-br data-[state=active]:from-emerald-400 data-[state=active]:via-green-500 data-[state=active]:to-teal-600 data-[state=active]:text-black data-[state=active]:border-emerald-300',
                        icon: 'text-emerald-400 group-data-[state=active]:text-black',
                        text: 'text-emerald-200 group-data-[state=active]:text-black',
                      },
                      {
                        value: 'folgas', label: 'Folgas', full: 'Folgas e Férias', Icon: CalendarOff,
                        trigger: 'hover:bg-purple-500/15 hover:border-purple-500/50 data-[state=active]:bg-gradient-to-br data-[state=active]:from-purple-400 data-[state=active]:via-violet-500 data-[state=active]:to-indigo-600 data-[state=active]:text-white data-[state=active]:border-purple-300',
                        icon: 'text-purple-400 group-data-[state=active]:text-white',
                        text: 'text-purple-200 group-data-[state=active]:text-white',
                      },
                      {
                        value: 'agenda', label: 'Agenda', full: 'Agenda Operacional', Icon: CalendarDays,
                        trigger: 'hover:bg-cyan-500/15 hover:border-cyan-500/50 data-[state=active]:bg-gradient-to-br data-[state=active]:from-cyan-400 data-[state=active]:via-sky-500 data-[state=active]:to-blue-600 data-[state=active]:text-black data-[state=active]:border-cyan-300',
                        icon: 'text-cyan-400 group-data-[state=active]:text-black',
                        text: 'text-cyan-200 group-data-[state=active]:text-black',
                      },
                      {
                        value: 'permutas', label: 'Permutas', full: 'Permutas de Plantão', Icon: ArrowRightLeft,
                        trigger: 'hover:bg-yellow-500/15 hover:border-yellow-500/50 data-[state=active]:bg-gradient-to-br data-[state=active]:from-yellow-400 data-[state=active]:via-amber-500 data-[state=active]:to-orange-600 data-[state=active]:text-black data-[state=active]:border-yellow-300',
                        icon: 'text-yellow-400 group-data-[state=active]:text-black',
                        text: 'text-yellow-200 group-data-[state=active]:text-black',
                      },
                      {
                        value: 'rondas', label: 'Rondas', full: 'Histórico de Rondas', Icon: Radio,
                        trigger: 'hover:bg-red-500/15 hover:border-red-500/50 data-[state=active]:bg-gradient-to-br data-[state=active]:from-red-400 data-[state=active]:via-rose-500 data-[state=active]:to-pink-600 data-[state=active]:text-white data-[state=active]:border-red-300',
                        icon: 'text-red-400 group-data-[state=active]:text-white',
                        text: 'text-red-200 group-data-[state=active]:text-white',
                      },
                      {
                        value: 'chat', label: 'Chat', full: 'Chat Interno', Icon: MessageCircle,
                        trigger: 'hover:bg-blue-500/15 hover:border-blue-500/50 data-[state=active]:bg-gradient-to-br data-[state=active]:from-blue-400 data-[state=active]:via-indigo-500 data-[state=active]:to-violet-600 data-[state=active]:text-white data-[state=active]:border-blue-300',
                        icon: 'text-blue-400 group-data-[state=active]:text-white',
                        text: 'text-blue-200 group-data-[state=active]:text-white',
                      },
                      {
                        value: 'config', label: 'Config', full: 'Configurações', Icon: Settings,
                        trigger: 'hover:bg-slate-500/15 hover:border-slate-400/50 data-[state=active]:bg-gradient-to-br data-[state=active]:from-slate-400 data-[state=active]:via-gray-500 data-[state=active]:to-zinc-600 data-[state=active]:text-white data-[state=active]:border-slate-300',
                        icon: 'text-slate-400 group-data-[state=active]:text-white',
                        text: 'text-slate-200 group-data-[state=active]:text-white',
                      },
                    ] as const).map(({ value, label, full, Icon, trigger, icon, text }) => (
                      <TabsTrigger
                        key={value}
                        value={value}
                        aria-label={full}
                        title=""
                        onPointerEnter={() => handleTabPointerEnter(value)}
                        onFocus={() => handleTabPointerEnter(value)}
                        className={cn(
                          'group flex flex-col items-center justify-center gap-1.5 md:gap-1.5 rounded-lg font-medium border border-slate-600/50 bg-slate-800/60',
                          'px-2 py-3 md:px-2 md:py-2.5 min-h-[76px] sm:min-h-[80px] md:min-h-[58px]',
                          trigger
                        )}
                      >
                        <Icon className={cn('h-6 w-6 md:h-[18px] md:w-[18px]', icon)} strokeWidth={1.75} />
                        <span className={cn('text-[13px] leading-tight md:text-[13px] font-semibold tracking-normal truncate max-w-full', text)}>
                          {label}
                        </span>
                      </TabsTrigger>

                    ))}
                  </TabsList>
                </div>

              </div>
              </div>
              </div>


              <TabsContent value="equipe" forceMount hidden={activeTab !== 'equipe'} className="space-y-4 md:space-y-3 mt-0 overflow-visible data-[state=inactive]:hidden">
                {mountedTabs.has('equipe') && <>
                {/* Shift Alerts Banner */}
                <ShiftAlertsBanner
                  agentId={agent.id}
                  onDismissedChange={setShiftBannerDismissed}
                  forceShow={forceShowShiftBanner}
                />

                {/* On Duty Overlay - Discreto e minimizável */}
                <OnDutyOverlay agentId={agent.id} />

                {/* Centro de Operações (checklist, radar, PDF, HUD 3-2-1) */}
                <Suspense fallback={null}>
                  <ShiftOperationsCenter
                    agentId={agent.id}
                    agentName={agent.name}
                    agentTeam={agent.team}
                    unitId={agent.unit_id}
                  />
                </Suspense>

                {/* Briefing de Entrada (Chefe/Apoio) */}
                <Suspense fallback={null}>
                  <ShiftBriefingCard
                    agentId={agent.id}
                    agentName={agent.name}
                    agentTeam={agent.team}
                    unitId={agent.unit_id}
                    agentRole={(agent as any).role}
                  />
                </Suspense>

                {/* HERO PANEL - Futuristic Status Dashboard */}
                <AgentHeroPanel
                  agentId={agent.id}
                  agentName={agent.name}
                  agentTeam={agent.team}
                />

                {/* Profile Completion Alert */}
                <ProfileCompletionAlert agentId={agent.id} agentName={agent.name} />

                {/* Shift Setup Prompt */}
                <ShiftSetupPrompt
                  agentId={agent.id}
                  agentName={agent.name}
                  hasShifts={hasShifts}
                  onComplete={checkAgentShifts}
                />

                {/* Ad Display System temporariamente desativado a pedido do administrador */}
                {promosEnabled && (
                  <Suspense fallback={<ModuleFallback compact={compact} />}>
                    <AdDisplaySystem />
                  </Suspense>
                )}



                
                {/* Admin Announcements Panel - Priority Display */}
                <AdminAnnouncementsPanel 
                  agentId={agent.id}
                  agentUnitId={agent.unit_id}
                  agentTeam={agent.team}
                />

                {/* Unit Summary Card */}
                <UnitSummaryCard unitId={agent.unit_id} />
                
                <div className="flex w-full min-w-0 flex-col gap-4 overflow-visible xl:grid xl:grid-cols-[minmax(0,1fr)_320px] xl:items-start xl:gap-3">
                  <div className="w-full min-w-0 overflow-visible">
                    <TeamMembersCard 
                      unitId={agent.unit_id} 
                      team={agent.team} 
                      currentAgentId={agent.id}
                      currentAgentName={agent.name}
                      unitName={agent.unit?.name}
                    />
                  </div>
                  <div className="grid w-full min-w-0 grid-cols-1 gap-4 overflow-visible sm:grid-cols-2 xl:grid-cols-1 xl:gap-3">
                    <BirthdayCard 
                      agentId={agent.id}
                      team={agent.team}
                      unitId={agent.unit_id}
                    />
                    {/* Atalho para o diretório agregado (equipe/unidade/sistema).
                        Radar tático e diretório completo foram movidos para a página
                        /diretorio para eliminar duplicidade dentro do painel. */}
                    <a
                      href="/diretorio"
                      className="flex items-center justify-between gap-2 rounded-lg border border-amber-500/25 bg-slate-900/70 backdrop-blur-xl px-3 py-2.5 text-xs hover:border-amber-400/50 hover:bg-slate-900/85 transition-colors"
                    >
                      <div>
                        <div className="font-semibold text-amber-300 text-[12.5px]">Diretório Agregado</div>
                        <div className="text-[10.5px] text-muted-foreground leading-tight">
                          Equipe · Unidade · Sistema
                        </div>
                      </div>
                      <span className="text-amber-400">→</span>
                    </a>
                  </div>
                </div>
                </>}
              </TabsContent>

              <TabsContent value="plantoes" forceMount hidden={activeTab !== 'plantoes'} className="mt-0 data-[state=inactive]:hidden">
                {mountedTabs.has('plantoes') && <SectionBoundary label="plantoes" loadingLabel="Carregando plantões" fallback={<ModuleFallback compact={compact} />}>
                <div className="flex flex-col gap-3 md:gap-4">
                  {/* Filtros rápidos por período */}
                  <div
                    role="tablist"
                    aria-label="Filtro de período"
                    className="flex items-center gap-1 p-1 rounded-lg bg-slate-900/70 border border-slate-700/70 w-full"
                  >
                    {([
                      { id: 'hoje', label: 'Hoje' },
                      { id: 'semana', label: 'Semana' },
                      { id: 'mes', label: 'Mês' },
                    ] as const).map((f) => {
                      const active = shiftsFilter === f.id;
                      return (
                        <button
                          key={f.id}
                          role="tab"
                          aria-selected={active}
                          onClick={() => setShiftsFilter(f.id)}
                          className={
                            'flex-1 min-w-0 px-2 sm:px-3 py-1.5 text-[11px] sm:text-xs font-semibold uppercase tracking-widest rounded-md transition-colors ' +
                            (active
                              ? 'bg-amber-500 text-slate-950 shadow'
                              : 'text-slate-300 hover:bg-slate-800/70')
                          }
                        >
                          {f.label}
                        </button>
                      );
                    })}
                  </div>

                  {/* Linha 1 — Cronômetro + Próximo plantão (sempre lado a lado a partir de lg) */}
                  <section
                    aria-label="Status do plantão"
                    className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-4 items-stretch"
                  >
                    <div className="min-w-0 flex rounded-xl bg-gradient-to-br from-emerald-500/10 via-slate-900/40 to-slate-900/10 border border-emerald-500/20 p-1">
                      <div className="w-full flex flex-col [&>*]:flex-1 [&>*]:h-full">
                        <ProfessionalShiftTimer agentId={agent.id} />
                      </div>
                    </div>
                    <div className="min-w-0 flex rounded-xl bg-gradient-to-br from-amber-500/10 via-slate-900/40 to-slate-900/10 border border-amber-500/20 p-1">
                      <div className="w-full flex flex-col [&>*]:flex-1 [&>*]:h-full">
                        <NextShiftCountdown agentId={agent.id} agentName={agent.name} agentUnitId={agent.unit_id} agentTeam={agent.team} />
                      </div>
                    </div>
                  </section>

                  {/* Linha 2 — Escala da semana + Visão mensal (Semana/Mês) */}
                  {(shiftsFilter === 'semana' || shiftsFilter === 'mes') && (
                    <section
                      aria-label="Escala e visão mensal"
                      className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-4 items-stretch"
                    >
                      <div className="min-w-0 flex">
                        <div className="w-full flex flex-col [&>*]:flex-1 [&>*]:h-full">
                          <ShiftScheduleCard agentId={agent.id} />
                        </div>
                      </div>
                      {shiftsFilter === 'mes' && (
                        <div className="min-w-0 flex">
                          <div className="w-full flex flex-col [&>*]:flex-1 [&>*]:h-full">
                            <ShiftCalendarOverview agentId={agent.id} />
                          </div>
                        </div>
                      )}
                    </section>
                  )}

                  {/* Linha 3 — Histórico de ciclos (apenas Mês) */}
                  {shiftsFilter === 'mes' && (
                    <section aria-label="Ciclos recentes" className="w-full">
                      <RecentShiftCyclesCard agentId={agent.id} />
                    </section>
                  )}

                  {/* Dica quando o filtro esconde blocos */}
                  {shiftsFilter === 'hoje' && (
                    <p className="text-[11px] text-slate-500 text-center italic">
                      Mostrando apenas o plantão de hoje. Use <span className="text-amber-400">Semana</span> ou <span className="text-amber-400">Mês</span> para ver a escala completa.
                    </p>
                  )}
                </div>

                </SectionBoundary>}
              </TabsContent>


              <TabsContent value="bh" forceMount hidden={activeTab !== 'bh'} className="space-y-2.5 md:space-y-3 mt-0 data-[state=inactive]:hidden">
                {mountedTabs.has('bh') && <SectionBoundary label="bh" loadingLabel="Carregando bh" fallback={<ModuleFallback compact={compact} />}>
                <BHTracker agentId={agent.id} />
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5 md:gap-3">
                  <BHEvolutionChart agentId={agent.id} />
                  <BHHistoryTracker agentId={agent.id} />
                </div>
                </SectionBoundary>}
              </TabsContent>

              <TabsContent value="folgas" forceMount hidden={activeTab !== 'folgas'} className="space-y-2.5 md:space-y-3 mt-0 data-[state=inactive]:hidden">
                {mountedTabs.has('folgas') && <SectionBoundary label="folgas" loadingLabel="Carregando folgas" fallback={<ModuleFallback compact={compact} />}>
                <LeaveRequestCard 
                  agentId={agent.id} 
                  agentTeam={agent.team}
                  agentUnitId={agent.unit_id}
                />
                </SectionBoundary>}
              </TabsContent>

              <TabsContent value="agenda" forceMount hidden={activeTab !== 'agenda'} className="space-y-2.5 md:space-y-3 mt-0 data-[state=inactive]:hidden">
                {mountedTabs.has('agenda') && <SectionBoundary label="agenda" loadingLabel="Carregando agenda" fallback={<ModuleFallback compact={compact} />}>
                <AgentEventsCard agentId={agent.id} />
                </SectionBoundary>}
              </TabsContent>


              <TabsContent value="permutas" forceMount hidden={activeTab !== 'permutas'} className="space-y-2.5 md:space-y-3 mt-0 data-[state=inactive]:hidden">
                {mountedTabs.has('permutas') && <SectionBoundary label="permutas" loadingLabel="Carregando permutas" fallback={<ModuleFallback compact={compact} />}>
                <SwapRequestsCard 
                  agentId={agent.id} 
                  unitId={agent.unit_id}
                  team={agent.team}
                />
                </SectionBoundary>}
              </TabsContent>

              <TabsContent value="rondas" forceMount hidden={activeTab !== 'rondas'} className="space-y-4 md:space-y-3 mt-0 overflow-visible data-[state=inactive]:hidden">
                {mountedTabs.has('rondas') && <SectionBoundary label="rondas" loadingLabel="Carregando rondas" fallback={<ModuleFallback compact={compact} />}>
                <div className="relative z-10 w-full min-w-0 max-w-full overflow-hidden rounded-2xl border-2 border-amber-500/50 bg-gradient-to-br from-slate-900/98 via-slate-950/98 to-amber-950/35 p-3 shadow-xl shadow-amber-500/10 sm:p-4 md:p-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="shrink-0 rounded-xl border border-amber-500/40 bg-amber-500/15 p-2.5 sm:p-3">
                        <Radio className="h-5 w-5 text-amber-400 sm:h-6 sm:w-6" />
                      </div>
                      <div className="min-w-0 flex-1 space-y-1">
                        <h3 className="text-lg font-black leading-tight text-amber-200 tracking-tight sm:text-xl md:text-lg break-words">
                          Gestor de Rondas
                        </h3>
                        <p className="text-xs leading-relaxed text-slate-300 sm:text-sm break-words">
                          Monte a escala, inicie o cronômetro e acompanhe as rondas em tempo real.
                        </p>
                      </div>
                    </div>
                    <div className="self-start shrink-0 rounded-full border border-emerald-500/40 bg-emerald-500/15 px-2.5 py-1 text-[10px] font-black text-emerald-300 sm:self-auto sm:px-3 sm:text-xs whitespace-nowrap">
                      PRONTO PARA OPERAR
                    </div>
                  </div>
                  <Suspense fallback={<div className="flex items-center justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-amber-500" /></div>}>
                    <div className="mt-4 flex w-full min-w-0 max-w-full sm:mt-5">
                      <RoundsManager
                        customTrigger={
                          <button
                            type="button"
                            className="group flex min-h-[64px] w-full min-w-0 max-w-full items-center justify-between gap-2 rounded-xl border border-amber-500/50 bg-amber-500/15 px-3 py-3 text-left shadow-lg shadow-amber-500/10 transition-all duration-200 hover:border-amber-400/70 hover:bg-amber-500/20 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 sm:gap-3 sm:px-4"
                          >
                            <span className="flex min-w-0 flex-1 items-center gap-2.5 sm:gap-3">
                              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-amber-500/45 bg-slate-950/70 sm:h-11 sm:w-11">
                                <Radio className="h-4 w-4 text-amber-300 sm:h-5 sm:w-5" />
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="block text-sm font-black leading-tight text-amber-100 sm:text-base break-words">
                                  Abrir Gestor de Rondas
                                </span>
                                <span className="block text-[11px] font-semibold text-slate-300 sm:text-xs break-words">
                                  Central tática de escala e acompanhamento
                                </span>
                              </span>
                            </span>
                            <Zap className="h-4 w-4 shrink-0 text-amber-300 transition-transform group-hover:scale-110 sm:h-5 sm:w-5" />
                          </button>
                        }
                      />
                    </div>
                  </Suspense>
                </div>
                <RoundsHistoryCard agentId={agent.id} />
                </SectionBoundary>}
              </TabsContent>




              <TabsContent value="chat" forceMount hidden={activeTab !== 'chat'} className="space-y-2.5 md:space-y-3 mt-0 data-[state=inactive]:hidden">
                {mountedTabs.has('chat') && <SectionBoundary label="chat" loadingLabel="Carregando chat" fallback={<ModuleFallback compact={compact} />}>
                <ChatPanel 
                  agentId={agent.id} 
                  unitId={agent.unit_id}
                  team={agent.team}
                  agentName={agent.name}
                  agentRole={(agent as any).role}
                  agentAvatarUrl={(agent as any).avatar_url}
                />
                </SectionBoundary>}
              </TabsContent>

              <TabsContent value="config" forceMount hidden={activeTab !== 'config'} className="space-y-1.5 md:space-y-2 mt-0 data-[state=inactive]:hidden">
                {mountedTabs.has('config') && <SectionBoundary label="config" loadingLabel="Carregando configurações" fallback={<ModuleFallback compact={compact} />}>
                {/* ══════════ SEÇÃO 1: CONTA & SEGURANÇA ══════════ */}
                <Collapsible defaultOpen>
                  <CollapsibleTrigger className="group w-full flex items-center justify-between gap-2 px-2.5 py-1.5 md:px-3 md:py-2 rounded-md border border-purple-500/25 bg-purple-500/[0.06] hover:bg-purple-500/[0.10] transition-colors">
                    <span className="flex items-center gap-2 text-[11px] md:text-xs font-bold uppercase tracking-wider text-purple-300/90">
                      <Key className="h-3.5 w-3.5" />
                      Conta &amp; Segurança
                    </span>
                    <ChevronDown className="h-3.5 w-3.5 text-purple-300/70 transition-transform group-data-[state=open]:rotate-180" />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pt-1.5 md:pt-2">
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-2">
                      <AgentSettingsCard
                        agentId={agent.id}
                        agentName={agent.name}
                        currentEmail={agent.email}
                        currentAvatarUrl={(agent as any).avatar_url}
                        onUpdate={() => window.location.reload()}
                      />
                      <div className="bg-gradient-to-br from-purple-900/40 to-slate-900/90 border border-purple-500/40 rounded-lg p-2.5 md:p-3 space-y-1.5 shadow-md">
                        <h3 className="font-semibold text-xs md:text-sm flex items-center gap-1.5 text-slate-100">
                          <Key className="h-3.5 w-3.5 text-purple-400" />
                          Segurança da Conta
                        </h3>
                        <p className="text-[11px] md:text-xs text-slate-400 leading-snug">
                          Altere sua senha via solicitação ao administrador.
                        </p>
                        <div className="flex flex-wrap gap-1.5 md:gap-2">
                          <PasswordChangeRequest
                            agentId={agent.id}
                            agentName={agent.name}
                          />
                        </div>
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>

                {/* ══════════ SEÇÃO 2: NOTIFICAÇÕES & ALERTAS ══════════ */}
                <Collapsible>
                  <CollapsibleTrigger className="group w-full flex items-center justify-between gap-2 px-2.5 py-1.5 md:px-3 md:py-2 rounded-md border border-amber-500/25 bg-amber-500/[0.06] hover:bg-amber-500/[0.10] transition-colors">
                    <span className="flex items-center gap-2 text-[11px] md:text-xs font-bold uppercase tracking-wider text-amber-300/90">
                      <BellRing className="h-3.5 w-3.5" />
                      Notificações &amp; Alertas
                    </span>
                    <ChevronDown className="h-3.5 w-3.5 text-amber-300/70 transition-transform group-data-[state=open]:rotate-180" />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pt-1.5 md:pt-2">
                    <NotificationsAndAlertsCard agentId={agent.id} />
                  </CollapsibleContent>
                </Collapsible>

                {/* ══════════ SEÇÃO 3: LEMBRETES INTELIGENTES ══════════ */}
                <Collapsible>
                  <CollapsibleTrigger className="group w-full flex items-center justify-between gap-2 px-2.5 py-1.5 md:px-3 md:py-2 rounded-md border border-cyan-500/25 bg-cyan-500/[0.06] hover:bg-cyan-500/[0.10] transition-colors">
                    <span className="flex items-center gap-2 text-[11px] md:text-xs font-bold uppercase tracking-wider text-cyan-300/90">
                      <Clock className="h-3.5 w-3.5" />
                      Lembretes Inteligentes
                    </span>
                    <ChevronDown className="h-3.5 w-3.5 text-cyan-300/70 transition-transform group-data-[state=open]:rotate-180" />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pt-1.5 md:pt-2">
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-2">
                      <SmartAlarmClock agentId={agent.id} />
                      <BHReminderSettings agentId={agent.id} />
                    </div>
                  </CollapsibleContent>
                </Collapsible>

                {/* ══════════ SEÇÃO 4: DIAGNÓSTICO ══════════ */}
                <Collapsible>
                  <CollapsibleTrigger className="group w-full flex items-center justify-between gap-2 px-2.5 py-1.5 md:px-3 md:py-2 rounded-md border border-slate-500/25 bg-slate-500/[0.06] hover:bg-slate-500/[0.10] transition-colors">
                    <span className="flex items-center gap-2 text-[11px] md:text-xs font-bold uppercase tracking-wider text-slate-300/90">
                      <Settings className="h-3.5 w-3.5" />
                      Diagnóstico
                    </span>
                    <ChevronDown className="h-3.5 w-3.5 text-slate-300/70 transition-transform group-data-[state=open]:rotate-180" />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pt-1.5 md:pt-2">
                    <div className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 border border-slate-600/50 rounded-lg p-2.5 md:p-3 space-y-1.5 shadow-md">
                      <p className="text-[11px] md:text-xs text-slate-400 leading-snug">
                        Resolva problemas de conexão ou sessão.
                      </p>
                      <div className="flex flex-wrap gap-1.5 md:gap-2">
                        <DiagnosticReportButton />
                        <SafeModeToggle variant="compact" />
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
                </SectionBoundary>}
              </TabsContent>

            </Tabs>

            {/* Mural de Comunicados Rápidos */}
            <AnnouncementsMural className="mt-4" />

            {/* Footer Copyright - Compacto */}
            <CopyrightFooter className="border-t border-border/30 mt-2" />
          </div>
        </main>
      </div>
      </div>
    </ThemedPanelBackground>

    </>
  );
}
