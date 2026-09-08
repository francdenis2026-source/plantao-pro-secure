import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Conta usuários online via Supabase Realtime Presence.
 * Usa um canal compartilhado (singleton) para evitar múltiplas subscrições
 * concorrentes no mesmo tab (que quebravam com "cannot add presence
 * callbacks after subscribe()").
 */

type Listener = (count: number) => void;

let sharedChannel: ReturnType<typeof supabase.channel> | null = null;
let refCount = 0;
let lastCount = 0;
const listeners = new Set<Listener>();

function ensureChannel(channelName: string) {
  if (sharedChannel) return sharedChannel;
  const clientId = crypto.randomUUID();
  const channel = supabase.channel(channelName, {
    config: { presence: { key: clientId } },
  });
  channel
    .on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState();
      lastCount = Object.keys(state).length;
      listeners.forEach((l) => l(lastCount));
    })
    .subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({ online_at: new Date().toISOString() });
      }
    });
  sharedChannel = channel;
  return channel;
}


export function useOnlinePresence(channelName = 'online-users') {
  const [count, setCount] = useState(lastCount);

  useEffect(() => {
    ensureChannel(channelName);
    refCount += 1;
    listeners.add(setCount);
    setCount(lastCount);

    return () => {
      listeners.delete(setCount);
      refCount -= 1;
      if (refCount <= 0 && sharedChannel) {
        supabase.removeChannel(sharedChannel);
        sharedChannel = null;
        refCount = 0;
      }
    };
  }, [channelName]);

  return count;
}
