/**
 * Night shift rules (America/Rio_Branco, UTC-5).
 *
 * The night window runs 22:00 → 06:00 (next day) local time.
 * Detection must always use the server clock (or a server-synced local clock)
 * to avoid being fooled by a wrong device clock.
 */

export const NIGHT_START = '22:00' as const;
export const NIGHT_END = '06:00' as const;
export const NIGHT_TZ = 'America/Rio_Branco' as const;

/** Hora (Acre) em que começa o período de preparação pré-noturna. */
export const PRE_NIGHT_START_HOUR = 18;
/** Hora (Acre) em que o turno noturno efetivamente começa. */
export const NIGHT_START_HOUR = 22;

/** Returns the hour (0-23) of the given date in America/Rio_Branco. */
export function getAcreHour(date: Date): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    hour12: false,
    timeZone: NIGHT_TZ,
  }).formatToParts(date);
  const h = parts.find((p) => p.type === 'hour')?.value ?? '0';
  // Intl sometimes returns "24" for midnight; normalize.
  const n = parseInt(h, 10) % 24;
  return Number.isFinite(n) ? n : 0;
}

/** True when the given date falls in the night window (22:00–06:00 Acre). */
export function isNightShift(date: Date = new Date()): boolean {
  const h = getAcreHour(date);
  return h >= NIGHT_START_HOUR || h < 6;
}

/**
 * True quando o horário está na janela de PRÉ-noite (18:00–21:59 Acre).
 * Usado apenas como informação operacional; não bloqueia edição de horários.
 */
export function isPreNightWindow(date: Date = new Date()): boolean {
  const h = getAcreHour(date);
  return h >= PRE_NIGHT_START_HOUR && h < NIGHT_START_HOUR;
}

/** Timestamp (ms UTC) do próximo 22:00 no fuso Acre, relativo à data informada. */
export function getNext22Ms(date: Date = new Date()): number {
  return getNightWindow(date).startsAt.getTime();
}

/**
 * Returns the exact night window (start/end Date, ISO date labels) that
 * corresponds to the given moment.
 * - If we are already in the night window, returns the current window.
 * - Otherwise, returns the next upcoming window.
 */
export function getNightWindow(date: Date = new Date()): {
  startsAt: Date;
  endsAt: Date;
  startLabel: string; // "DD/MM/AAAA HH:mm"
  endLabel: string;
} {
  const acreOffsetMin = -5 * 60; // Rio_Branco = UTC-5, no DST
  const asAcreMs = date.getTime() + acreOffsetMin * 60_000;
  const acre = new Date(asAcreMs);
  const y = acre.getUTCFullYear();
  const m = acre.getUTCMonth();
  const d = acre.getUTCDate();
  const h = acre.getUTCHours();

  // Determine the "shift day" (day when 22:00 starts)
  let shiftDay = new Date(Date.UTC(y, m, d));
  if (h < 6) {
    // We are past midnight of the ongoing shift → start was previous day
    shiftDay = new Date(Date.UTC(y, m, d - 1));
  }
  // startsAt = shiftDay 22:00 Acre → shiftDay 22:00 + 5h UTC
  const startsAt = new Date(shiftDay.getTime() + (22 - acreOffsetMin / 60) * 3600_000);
  const endsAt = new Date(startsAt.getTime() + 8 * 3600_000);

  const fmt = (dt: Date) =>
    new Intl.DateTimeFormat('pt-BR', {
      timeZone: NIGHT_TZ,
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(dt);

  return { startsAt, endsAt, startLabel: fmt(startsAt), endLabel: fmt(endsAt) };
}

/** Format a date as HH:mm:ss in Acre timezone. */
export function formatAcreClock(date: Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: NIGHT_TZ,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(date);
}



/**
 * Legacy compatibility helper.
 *
 * Night shift hours are now fully manual. The helper intentionally preserves
 * the operator's selected values and never forces 22:00 → 06:00.
 */
export function applyNightShiftLock(input: {
  now: Date;
  startTime: string;
  endTime: string;
  masterOverride?: boolean;
}): { startTime: string; endTime: string; locked: boolean; auditRequired: boolean } {
  return { startTime: input.startTime, endTime: input.endTime, locked: false, auditRequired: false };
}

