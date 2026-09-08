/**
 * Preferências do lembrete automático de rondas.
 *
 * Persistência em duas camadas:
 *   1) localStorage (cache imediato, por usuário — chave namespaced).
 *   2) profiles.reminder_settings (Supabase) — sincroniza entre dispositivos.
 *
 * Observável via evento `reminder-settings:change` para o hook global reagir
 * em tempo real sem refresh.
 */

import { supabase } from '@/integrations/supabase/client';
import { z } from 'zod';

export type ReminderInterval = 15 | 30 | 60;

export interface ReminderSettings {
  enabled: boolean;
  intervalMin: ReminderInterval;
  /**
   * Quando `true`, TODOS os avisos são exibidos exclusivamente in-app
   * (toasts + diálogos SVG). Nenhuma `Notification` nativa do navegador
   * é criada e o app não solicita permissão de notificação.
   */
  inAppOnly: boolean;
}

const BASE_KEY = 'plantaopro_reminder_settings_v1';
const EVENT = 'reminder-settings:change';

/**
 * Contrato de validação — números inteiros, no intervalo [15, 60] minutos,
 * restritos aos passos operacionais suportados (15, 30, 60).
 * Rejeita strings, decimais, negativos, NaN e valores fora da lista.
 */
export const ALLOWED_INTERVALS = [15, 30, 60] as const;

export const ReminderSettingsSchema = z.object({
  enabled: z.boolean(),
  intervalMin: z
    .number({ invalid_type_error: 'Intervalo deve ser numérico' })
    .int('Intervalo deve ser um número inteiro')
    .min(15, 'Intervalo mínimo é 15 minutos')
    .max(60, 'Intervalo máximo é 60 minutos')
    .refine((v) => (ALLOWED_INTERVALS as readonly number[]).includes(v), {
      message: 'Intervalo deve ser 15, 30 ou 60 minutos',
    }),
  inAppOnly: z.boolean(),
});

export type ReminderValidation =
  | { ok: true; value: ReminderSettings }
  | { ok: false; errors: Record<string, string> };

export function validateReminderSettings(raw: unknown): ReminderValidation {
  const parsed = ReminderSettingsSchema.safeParse(raw);
  if (parsed.success) {
    return { ok: true, value: parsed.data as ReminderSettings };
  }
  const errors: Record<string, string> = {};
  for (const issue of parsed.error.issues) {
    errors[issue.path.join('.') || '_'] = issue.message;
  }
  return { ok: false, errors };
}

const DEFAULTS: ReminderSettings = { enabled: true, intervalMin: 30, inAppOnly: false };

/**
 * Guard central: usar sempre antes de `new Notification(...)` ou
 * `Notification.requestPermission()`. Retorna false quando o usuário
 * escolheu "somente in-app", ou quando o browser não suporta.
 */
export function areNativeNotificationsAllowed(): boolean {
  if (typeof window === 'undefined') return false;
  if (typeof Notification === 'undefined') return false;
  try {
    const s = readLocal();
    return !s.inAppOnly;
  } catch {
    return true;
  }
}

// ID do usuário ativo — definido em runtime por `bindReminderUser`. Enquanto
// não houver usuário, usamos a chave legada para não perder preferências
// definidas antes do login.
let currentUserId: string | null = null;

function storageKey(userId?: string | null): string {
  const id = userId ?? currentUserId;
  return id ? `${BASE_KEY}:${id}` : BASE_KEY;
}

/**
 * Sanitiza entrada arbitrária (localStorage, backend, patch parcial) usando o
 * schema zod. Qualquer campo inválido cai para o default seguro.
 */
function normalize(raw: unknown): ReminderSettings {
  if (!raw || typeof raw !== 'object') return { ...DEFAULTS };
  const merged = { ...DEFAULTS, ...(raw as Partial<ReminderSettings>) };
  const parsed = ReminderSettingsSchema.safeParse(merged);
  return parsed.success ? (parsed.data as ReminderSettings) : { ...DEFAULTS };
}

function readLocal(userId?: string | null): ReminderSettings {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return { ...DEFAULTS };
    return normalize(JSON.parse(raw));
  } catch {
    return { ...DEFAULTS };
  }
}

function writeLocal(next: ReminderSettings, userId?: string | null) {
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(next));
  } catch { /* ignore */ }
}

export function getReminderSettings(): ReminderSettings {
  return readLocal();
}

/**
 * Aplica um patch às preferências APÓS validação rigorosa (zod).
 * Retorna a discriminated union — não escreve nada em caso de erro,
 * de forma que o backend e o cache nunca recebem valores inválidos.
 */
export function setReminderSettings(patch: Partial<ReminderSettings>): ReminderValidation {
  const candidate = { ...readLocal(), ...patch };
  const result = validateReminderSettings(candidate);
  if (!result.ok) return result;

  const next = result.value;
  writeLocal(next);
  try {
    window.dispatchEvent(new CustomEvent<ReminderSettings>(EVENT, { detail: next }));
  } catch { /* ignore */ }
  // Fire-and-forget: sincroniza com o backend para o usuário atual.
  if (currentUserId) void persistToProfile(currentUserId, next);
  return { ok: true, value: next };
}

export function subscribeReminderSettings(
  handler: (s: ReminderSettings) => void,
): () => void {
  const listener = (e: Event) => {
    const detail = (e as CustomEvent<ReminderSettings>).detail;
    handler(detail ?? readLocal());
  };
  window.addEventListener(EVENT, listener);
  const storageListener = (e: StorageEvent) => {
    if (e.key === storageKey()) handler(readLocal());
  };
  window.addEventListener('storage', storageListener);
  return () => {
    window.removeEventListener(EVENT, listener);
    window.removeEventListener('storage', storageListener);
  };
}

// ─── Sincronização com Supabase ────────────────────────────────────────────

async function persistToProfile(userId: string, settings: ReminderSettings): Promise<void> {
  try {
    // upsert por user_id — garante criação do perfil se ainda não existir.
    await supabase
      .from('profiles')
      .update({ reminder_settings: settings as unknown as never })
      .eq('user_id', userId);
  } catch { /* ignore — cache local já foi atualizado */ }
}

async function loadFromProfile(userId: string): Promise<ReminderSettings | null> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('reminder_settings')
      .eq('user_id', userId)
      .maybeSingle();
    if (error || !data) return null;
    return normalize((data as { reminder_settings?: unknown }).reminder_settings);
  } catch {
    return null;
  }
}

/**
 * Vincula as preferências ao usuário autenticado: reidrata do backend
 * (sobrescreve o cache local) e passa a persistir toda mudança futura no
 * perfil correspondente. Chame no bootstrap após obter o `user.id`.
 */
export async function bindReminderUser(userId: string | null): Promise<ReminderSettings> {
  currentUserId = userId;
  if (!userId) return readLocal();

  // Se ainda não há cache para esse usuário, migra a preferência legada.
  const legacyRaw = localStorage.getItem(BASE_KEY);
  if (legacyRaw && !localStorage.getItem(storageKey(userId))) {
    try { localStorage.setItem(storageKey(userId), legacyRaw); } catch { /* ignore */ }
  }

  const remote = await loadFromProfile(userId);
  if (remote) {
    writeLocal(remote, userId);
    try {
      window.dispatchEvent(new CustomEvent<ReminderSettings>(EVENT, { detail: remote }));
    } catch { /* ignore */ }
    return remote;
  }

  // Sem registro remoto ainda — envia o cache local para materializar.
  const local = readLocal(userId);
  void persistToProfile(userId, local);
  return local;
}
