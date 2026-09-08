import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type UplinkStatus = 'online' | 'degraded' | 'offline';

interface OperationalMetrics {
  units: number;
  agentsActive: number;
  agentsRegistered: number;
  divisions: number;
  uplink: UplinkStatus;
  loading: boolean;
}

/**
 * Central operational KPIs surfaced in the hero Briefing panel.
 * - Real counts from `units` and `agents`
 * - `agentsRegistered` = total de agentes cadastrados (independente de status)
 * - `agentsActive` = agentes com is_active=true (subconjunto)
 * - Uplink status: online when Realtime channel subscribes, degraded on retry,
 *   offline when navigator reports no connection.
 */
export function useOperationalMetrics(): OperationalMetrics {
  const [units, setUnits] = useState(0);
  const [agentsActive, setAgentsActive] = useState(0);
  const [agentsRegistered, setAgentsRegistered] = useState(0);
  const [uplink, setUplink] = useState<UplinkStatus>(
    typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'degraded'
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase.rpc('get_public_operational_counts');
        if (cancelled) return;
        if (!error && data && data.length > 0) {
          const row = data[0] as { units_count: number; agents_total: number; agents_active: number };
          setUnits(row.units_count ?? 0);
          setAgentsActive(row.agents_active ?? 0);
          setAgentsRegistered(row.agents_total ?? 0);
        } else {
          // Fallback for authenticated users (respects RLS)
          const [u, active, total] = await Promise.all([
            supabase.from('units').select('id', { count: 'exact', head: true }),
            supabase.from('agents').select('id', { count: 'exact', head: true }).eq('is_active', true),
            supabase.from('agents').select('id', { count: 'exact', head: true }),
          ]);
          if (cancelled) return;
          setUnits(u.count ?? 0);
          setAgentsActive(active.count ?? 0);
          setAgentsRegistered(total.count ?? 0);
        }
      } catch {
        // silent — hero has fallbacks
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // Uplink probe via Realtime channel
  useEffect(() => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setUplink('offline');
      return;
    }
    const channel = supabase.channel('hero-uplink-probe');
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') setUplink('online');
      else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') setUplink('degraded');
      else if (status === 'CLOSED') setUplink('offline');
    });

    const onOnline = () => setUplink('degraded');
    const onOffline = () => setUplink('offline');
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  return {
    units,
    agentsActive,
    agentsRegistered,
    divisions: 4,
    uplink,
    loading,
  };
}
