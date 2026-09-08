import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Rastreia presença de agentes em tempo real via Supabase Realtime Presence.
 * Canal singleton para toda a aplicação. Retorna um Set de agent IDs online.
 *
 * Uso:
 *   const online = useOnlineAgents(); // Set<string>
 *   const isOnline = online.has(agent.id);
 *
 * Para publicar a própria presença (chamado pelo painel do agente logado):
 *   useTrackAgentPresence(agentId, unitId, team, name);
 */

type Meta = { agent_id: string; unit_id?: string | null; team?: string | null; name?: string | null; online_at: string };
type Listener = (ids: Set<string>) => void;

const CHANNEL = 'agents-presence';
let sharedChannel: ReturnType<typeof supabase.channel> | null = null;
let refCount = 0;
let currentSet: Set<string> = new Set();
const listeners = new Set<Listener>();

function ensureChannel() {
  if (sharedChannel) return sharedChannel;
  const ch = supabase.channel(CHANNEL, {
    config: { presence: { key: crypto.randomUUID() } },
  });
  ch.on('presence', { event: 'sync' }, () => {
    const state = ch.presenceState<Meta>();
    const ids = new Set<string>();
    Object.values(state).forEach((metas) => {
      metas.forEach((m) => {
        if (m?.agent_id) ids.add(m.agent_id);
      });
    });
    currentSet = ids;
    listeners.forEach((l) => l(currentSet));
  });
  ch.subscribe();
  sharedChannel = ch;
  return ch;
}

export function useOnlineAgents(): Set<string> {
  const [ids, setIds] = useState<Set<string>>(currentSet);

  useEffect(() => {
    ensureChannel();
    refCount += 1;
    listeners.add(setIds);
    setIds(new Set(currentSet));

    return () => {
      listeners.delete(setIds);
      refCount -= 1;
      if (refCount <= 0 && sharedChannel) {
        supabase.removeChannel(sharedChannel);
        sharedChannel = null;
        refCount = 0;
        currentSet = new Set();
      }
    };
  }, []);

  return ids;
}

/**
 * Publica a presença do próprio agente no canal compartilhado.
 * Deve ser chamado uma vez no painel do agente logado.
 */
export function useTrackAgentPresence(
  agentId?: string | null,
  extra?: { unit_id?: string | null; team?: string | null; name?: string | null }
) {
  useEffect(() => {
    if (!agentId) return;
    const ch = ensureChannel();
    let cancelled = false;

    const track = async () => {
      if (cancelled) return;
      try {
        await ch.track({
          agent_id: agentId,
          unit_id: extra?.unit_id ?? null,
          team: extra?.team ?? null,
          name: extra?.name ?? null,
          online_at: new Date().toISOString(),
        } satisfies Meta);
      } catch {
        // ignore
      }
    };

    // Re-emit periodically so presence stays fresh
    track();
    const interval = setInterval(track, 60_000);

    return () => {
      cancelled = true;
      clearInterval(interval);
      try {
        ch.untrack();
      } catch {
        // ignore
      }
    };
  }, [agentId, extra?.unit_id, extra?.team, extra?.name]);
}
