import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Relógio global sincronizado com a rede (não confia no horário do sistema local).
 *
 * Fonte primária: RPC `get_server_now()` no backend (Lovable Cloud).
 * Fallback: HTTP `Date` header retornado pelo próprio endpoint Supabase (mesma origem).
 *
 * Todo o app compartilha o mesmo offset em memória (module-scope),
 * então múltiplos consumidores não disparam múltiplas sincronizações.
 */

// O relógio exibido NÃO deve avançar com Date.now(), porque Date.now() é
// exatamente a hora de parede do dispositivo. Depois da primeira sincronização,
// congelamos o horário absoluto do servidor e avançamos apenas com
// performance.now(), que é monotônico e não muda quando o usuário corrige/erra
// manualmente o relógio do aparelho.
let serverBaseMs: number | null = null;
let monotonicBaseMs = 0;
let lastSyncAtMonotonic = 0;
let syncing: Promise<void> | null = null;

const SYNC_INTERVAL_MS = 5 * 60_000; // ressincroniza a cada 5 min

async function fetchServerNow(): Promise<number | null> {
  // 1) RPC oficial
  try {
    const t0 = performance.now();
    const { data, error } = await supabase.rpc('get_server_now');
    const t1 = performance.now();
    if (!error && data) {
      const server = new Date(data as unknown as string).getTime();
      if (Number.isFinite(server)) {
        // corrige metade do round-trip
        return server + Math.round((t1 - t0) / 2);
      }
    }
  } catch {
    /* ignore */
  }

  // 2) Fallback: header Date do próprio Supabase (HEAD request)
  try {
    const url = (import.meta as any).env?.VITE_SUPABASE_URL as string | undefined;
    if (url) {
      const t0 = performance.now();
      const res = await fetch(`${url}/auth/v1/health`, { method: 'HEAD', cache: 'no-store' });
      const t1 = performance.now();
      const h = res.headers.get('date');
      if (h) {
        const server = new Date(h).getTime();
        if (Number.isFinite(server)) return server + Math.round((t1 - t0) / 2);
      }
    }
  } catch {
    /* ignore */
  }

  return null;
}

export async function syncServerTime(force = false): Promise<void> {
  const now = performance.now();
  if (!force && serverBaseMs != null && now - lastSyncAtMonotonic < SYNC_INTERVAL_MS) return;
  if (syncing) return syncing;
  syncing = (async () => {
    const serverMs = await fetchServerNow();
    if (serverMs != null) {
      serverBaseMs = serverMs;
      monotonicBaseMs = performance.now();
      lastSyncAtMonotonic = monotonicBaseMs;
    }
  })();
  try {
    await syncing;
  } finally {
    syncing = null;
  }
}

/** Data corrente estimada do servidor (rede), sem depender do relógio local. */
export function getServerDate(): Date {
  if (serverBaseMs == null) {
    // Único fallback possível antes da primeira resposta do backend.
    return new Date();
  }
  return new Date(serverBaseMs + (performance.now() - monotonicBaseMs));
}

/** Offset atual entre servidor e relógio de parede do dispositivo, em ms. */
export function getServerOffsetMs(): number {
  if (serverBaseMs == null) return 0;
  return getServerDate().getTime() - Date.now();
}

/**
 * Hook: retorna a Date "de rede" atualizada no intervalo escolhido (default 1s).
 * Faz uma sincronização inicial e ressincroniza periodicamente.
 */
export function useServerTime(tickMs = 1000): Date {
  const [now, setNow] = useState<Date>(() => getServerDate());

  useEffect(() => {
    let alive = true;

    // sincroniza ao montar
    syncServerTime().then(() => { if (alive) setNow(getServerDate()); });

    const tick = window.setInterval(() => {
      if (alive) setNow(getServerDate());
    }, tickMs);

    // ressync periódica
    const resync = window.setInterval(() => { syncServerTime(true); }, SYNC_INTERVAL_MS);

    // ressync ao voltar do background / recuperar rede
    const onFocus = () => { syncServerTime(true); };
    const onOnline = () => { syncServerTime(true); };
    window.addEventListener('focus', onFocus);
    window.addEventListener('online', onOnline);

    return () => {
      alive = false;
      window.clearInterval(tick);
      window.clearInterval(resync);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('online', onOnline);
    };
  }, [tickMs]);

  return now;
}

/**
 * Retorna horas/minutos/segundos da hora do servidor em um fuso específico.
 * Uso padrão para todos os relógios do app: `useServerClockParts()` = Rio Branco.
 * Se a sync com o servidor falhar, `useServerTime` já retorna a Date local
 * como fallback — mantendo a UI consistente.
 */
export function useServerClockParts(
  timeZone: string = 'America/Rio_Branco',
  tickMs = 1000,
): { hours: number; minutes: number; seconds: number; date: Date } {
  const date = useServerTime(tickMs);
  try {
    const fmt = new Intl.DateTimeFormat('en-GB', {
      timeZone,
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    const parts = fmt.formatToParts(date);
    const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? '0');
    let h = get('hour');
    if (h === 24) h = 0; // Intl pode devolver 24 em alguns runtimes
    return { hours: h, minutes: get('minute'), seconds: get('second'), date };
  } catch {
    return {
      hours: date.getHours(),
      minutes: date.getMinutes(),
      seconds: date.getSeconds(),
      date,
    };
  }
}

