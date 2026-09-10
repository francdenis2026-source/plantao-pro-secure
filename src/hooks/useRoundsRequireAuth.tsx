import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

const KEY = 'rounds_require_auth';

/** Liga/desliga a exigência de login para usar o Gestor de Rondas —
 * controlado pelo administrador. Sem registro na tabela ainda, considera
 * desligado (acesso aberto, comportamento atual). Leitura pública
 * (inclusive visitante não logado, que é justamente quem precisa saber
 * se pode acessar a ferramenta). */
export function useRoundsRequireAuth() {
  const [requireAuth, setRequireAuthState] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const { data } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', KEY)
      .maybeSingle();
    const value = data?.value as { enabled?: boolean } | null;
    setRequireAuthState(value?.enabled === true);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel('rounds_require_auth_settings')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'system_settings', filter: `key=eq.${KEY}` },
        () => load(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, []);

  const setRoundsRequireAuth = async (next: boolean) => {
    const { error } = await supabase
      .from('system_settings')
      .upsert(
        { key: KEY, value: { enabled: next }, updated_at: new Date().toISOString() },
        { onConflict: 'key' },
      );
    if (error) throw error;
    setRequireAuthState(next);
  };

  return { requireAuth, loading, setRoundsRequireAuth };
}
