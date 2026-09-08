import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Conta visitantes únicos do site em tempo real via Supabase Realtime Presence.
 *
 * Diferente de `useOnlinePresence` (que rastreia agentes/tabs autenticados na
 * área operacional), este hook rastreia QUALQUER navegador que abrir o site,
 * logado ou não. É público — usa somente a anon key.
 *
 * Estratégia de identificação:
 *   - Um `visitor_id` estável é gerado uma vez por navegador e persistido em
 *     localStorage. Múltiplas abas do mesmo navegador COMPARTILHAM o mesmo id
 *     e, no `presenceState()`, aparecem sob a MESMA chave — portanto contam
 *     como 1 visitante único.
 *   - IP e MAC NÃO são acessíveis via JavaScript no navegador (privacidade e
 *     restrição do runtime). Presence é a fonte de verdade prática e não
 *     depende de rastreamento invasivo.
 *
 * Expiração / cleanup:
 *   - O canal Realtime tem heartbeat próprio (~30s). Se o socket cair sem
 *     aviso, a presença é removida automaticamente após o timeout do servidor.
 *   - Para remoção IMEDIATA em cenários controlados (fechar aba, navegar para
 *     outro site, minimizar por muito tempo) chamamos `untrack()` explicitamente
 *     em `pagehide` / `beforeunload` / `visibilitychange=hidden` — isso propaga
 *     um evento `leave` para os demais assinantes em <1s.
 *   - `VISITOR_HIDDEN_TIMEOUT_MS` (padrão 60 s) controla depois de quanto tempo
 *     em background o visitante é considerado offline. Ao voltar ao foco, o
 *     `track()` é reemitido.
 */

const CHANNEL = 'site-visitors';
const STORAGE_KEY = 'plantaopro:visitor_id';

/** Após este tempo em segundo plano, o visitante é considerado offline. */
export const VISITOR_HIDDEN_TIMEOUT_MS = 60_000;

function getVisitorId(): string {
  try {
    let id = localStorage.getItem(STORAGE_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(STORAGE_KEY, id);
    }
    return id;
  } catch {
    return crypto.randomUUID();
  }
}

type Listener = (count: number) => void;

let sharedChannel: ReturnType<typeof supabase.channel> | null = null;
let refCount = 0;
let lastCount = 0;
let hiddenTimer: ReturnType<typeof setTimeout> | null = null;
let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
let listenersInstalled = false;
const listeners = new Set<Listener>();

/** Heartbeat: re-emite track periodicamente para renovar a presença no servidor. */
const HEARTBEAT_MS = 20_000;

async function trackVisitor(channel: ReturnType<typeof supabase.channel>) {
  try {
    await channel.track({
      joined_at: new Date().toISOString(),
      path: typeof window !== 'undefined' ? window.location.pathname : '/',
      ts: Date.now(),
    });
  } catch {
    /* noop */
  }
}

function startHeartbeat() {
  if (heartbeatTimer) return;
  heartbeatTimer = setInterval(() => {
    if (sharedChannel && document.visibilityState !== 'hidden') {
      void trackVisitor(sharedChannel);
    }
  }, HEARTBEAT_MS);
}

function stopHeartbeat() {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
}

function installLifecycleListeners() {
  if (listenersInstalled || typeof window === 'undefined') return;
  listenersInstalled = true;

  const removeNow = () => {
    if (!sharedChannel) return;
    try {
      sharedChannel.untrack();
    } catch {
      /* noop */
    }
  };

  window.addEventListener('pagehide', removeNow);
  window.addEventListener('beforeunload', removeNow);

  document.addEventListener('visibilitychange', () => {
    if (!sharedChannel) return;
    if (document.visibilityState === 'hidden') {
      if (hiddenTimer) clearTimeout(hiddenTimer);
      hiddenTimer = setTimeout(removeNow, VISITOR_HIDDEN_TIMEOUT_MS);
    } else {
      if (hiddenTimer) {
        clearTimeout(hiddenTimer);
        hiddenTimer = null;
      }
      void trackVisitor(sharedChannel);
    }
  });

  // Ao voltar online (Wi-Fi restaurado), força re-track.
  window.addEventListener('online', () => {
    if (sharedChannel) void trackVisitor(sharedChannel);
  });
}

function ensureChannel() {
  if (sharedChannel) return sharedChannel;
  const visitorId = getVisitorId();
  const channel = supabase.channel(CHANNEL, {
    config: { presence: { key: visitorId } },
  });
  channel
    .on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState();
      lastCount = Object.keys(state).length;
      listeners.forEach((l) => l(lastCount));
    })
    .on('presence', { event: 'join' }, () => {
      const state = channel.presenceState();
      lastCount = Object.keys(state).length;
      listeners.forEach((l) => l(lastCount));
    })
    .on('presence', { event: 'leave' }, () => {
      const state = channel.presenceState();
      lastCount = Object.keys(state).length;
      listeners.forEach((l) => l(lastCount));
    })
    .subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await trackVisitor(channel);
        startHeartbeat();
      }
    });
  sharedChannel = channel;
  installLifecycleListeners();
  return channel;
}


export function useVisitorPresence(): number {
  const [count, setCount] = useState(lastCount);

  useEffect(() => {
    ensureChannel();
    refCount += 1;
    listeners.add(setCount);
    setCount(lastCount);

    return () => {
      listeners.delete(setCount);
      refCount -= 1;
      if (refCount <= 0 && sharedChannel) {
        try {
          sharedChannel.untrack();
        } catch {
          /* noop */
        }
        stopHeartbeat();
        supabase.removeChannel(sharedChannel);
        sharedChannel = null;
        refCount = 0;
      }

    };
  }, []);

  return count;
}
