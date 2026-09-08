/**
 * Fila offline para ações de ronda (Seção 39). Se a rede cair no meio de uma
 * ação (iniciar/pausar/retomar/finalizar/+5min), a ação fica na fila local em
 * vez de ser perdida. Quando a conexão volta, tenta reenviar em ordem.
 *
 * Importante: isto NUNCA finge sucesso antes da confirmação do servidor — o
 * item só sai da fila depois que a chamada real (RPC) retornar sem erro.
 */

export type PatrolQueuedAction =
  | { type: 'start'; slotId: string }
  | { type: 'pause'; slotId: string }
  | { type: 'resume'; slotId: string }
  | { type: 'complete'; slotId: string }
  | { type: 'extend'; slotId: string; minutes: number };

interface QueueItem {
  id: string;
  action: PatrolQueuedAction;
  createdAt: number;
  attempts: number;
}

const STORAGE_KEY = 'plantaopro_patrol_offline_queue_v1';

function readQueue(): QueueItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function writeQueue(items: QueueItem[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    /* quota — ignore, a fila é best-effort */
  }
}

export function enqueuePatrolAction(action: PatrolQueuedAction): void {
  const items = readQueue();
  items.push({ id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, action, createdAt: Date.now(), attempts: 0 });
  writeQueue(items);
}

export function getQueueLength(): number {
  return readQueue().length;
}

/** Tenta reenviar todos os itens em ordem. Para no primeiro erro (mantém a
 * ordem causal: pausar antes de retomar, etc). Usa os executores passados
 * pelo chamador para não criar dependência circular com api.ts. */
export async function flushPatrolQueue(executors: {
  start: (slotId: string) => Promise<unknown>;
  pause: (slotId: string) => Promise<unknown>;
  resume: (slotId: string) => Promise<unknown>;
  complete: (slotId: string) => Promise<unknown>;
  extend: (slotId: string, minutes: number) => Promise<unknown>;
}): Promise<{ synced: number; remaining: number }> {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return { synced: 0, remaining: getQueueLength() };

  const items = readQueue();
  if (items.length === 0) return { synced: 0, remaining: 0 };

  let synced = 0;
  const remaining: QueueItem[] = [];

  for (const item of items) {
    try {
      const a = item.action;
      if (a.type === 'start') await executors.start(a.slotId);
      else if (a.type === 'pause') await executors.pause(a.slotId);
      else if (a.type === 'resume') await executors.resume(a.slotId);
      else if (a.type === 'complete') await executors.complete(a.slotId);
      else if (a.type === 'extend') await executors.extend(a.slotId, a.minutes);
      synced++;
    } catch {
      remaining.push({ ...item, attempts: item.attempts + 1 });
      // Para a fila aqui: ações seguintes do mesmo slot dependem de ordem.
      break;
    }
  }

  // Mantém os itens que ainda não tentamos processar nesta rodada.
  const processedIds = new Set(items.slice(0, items.length - remaining.length + synced).map((i) => i.id));
  const untouched = items.filter((i) => !processedIds.has(i.id) && !remaining.some((r) => r.id === i.id));
  writeQueue([...remaining, ...untouched]);

  return { synced, remaining: remaining.length + untouched.length };
}

export function clearPatrolQueue(): void {
  writeQueue([]);
}
