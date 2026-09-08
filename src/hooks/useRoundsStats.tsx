import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface RoundsStats {
  active: number;   // rondas em curso do usuário logado
  today: number;    // rondas iniciadas hoje pelo usuário logado
  loading: boolean;
}

/**
 * Consulta contadores reais de rondas do usuário logado.
 * A tabela `round_sessions` é isolada por RLS (auth.uid() = user_id),
 * portanto os contadores refletem apenas as sessões do próprio agente.
 * Atualiza via Realtime + refetch em focus/online.
 */
export function useRoundsStats(): RoundsStats {
  const { user } = useAuth();
  const [state, setState] = useState<RoundsStats>({ active: 0, today: 0, loading: false });

  useEffect(() => {
    if (!user?.id) {
      setState({ active: 0, today: 0, loading: false });
      return;
    }

    let alive = true;
    let debounce: number | null = null;

    const load = async () => {
      try {
        setState((s) => ({ ...s, loading: true }));

        // "hoje" no fuso local do usuário — usamos o início do dia como referência
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        const [{ count: activeCount }, { count: todayCount }] = await Promise.all([
          supabase
            .from('round_sessions')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('is_active', true),
          supabase
            .from('round_sessions')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .gte('created_at', startOfDay.toISOString()),
        ]);

        if (!alive) return;
        setState({
          active: activeCount ?? 0,
          today: todayCount ?? 0,
          loading: false,
        });
      } catch {
        if (alive) setState((s) => ({ ...s, loading: false }));
      }
    };

    const scheduleLoad = () => {
      if (debounce) window.clearTimeout(debounce);
      debounce = window.setTimeout(load, 250);
    };

    load();

    // Realtime: reagir a mudanças nas próprias sessões
    const channel = supabase
      .channel(`round-sessions-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'round_sessions', filter: `user_id=eq.${user.id}` },
        () => scheduleLoad(),
      )
      .subscribe();

    const onFocus = () => scheduleLoad();
    window.addEventListener('focus', onFocus);
    window.addEventListener('online', onFocus);

    return () => {
      alive = false;
      if (debounce) window.clearTimeout(debounce);
      supabase.removeChannel(channel);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('online', onFocus);
    };
  }, [user?.id]);

  return state;
}
