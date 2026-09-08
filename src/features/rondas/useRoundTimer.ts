import { useMemo } from 'react';
import { useServerTime } from '@/hooks/useServerTime';
import type { PatrolSlot } from './types';

export interface RoundTimerState {
  /** Segundos restantes até scheduled_end (0 se já venceu). Só faz sentido quando active. */
  secondsRemaining: number;
  /** Segundos decorridos desde started_at, descontando pausas (cronômetro). */
  secondsElapsed: number;
  /** Duração total planejada do slot, em segundos. */
  totalSeconds: number;
  isPaused: boolean;
  isLate: boolean;
  isOverdue: boolean;
  progressPct: number; // 0-100, quanto do tempo planejado já passou
}

/**
 * Fonte da verdade: os timestamps persistidos no banco (scheduled_start,
 * scheduled_end, started_at, paused_at, paused_seconds), nunca um contador
 * local. `useServerTime` já mantém um relógio sincronizado com o servidor
 * (não com o relógio do dispositivo), então o resultado é o mesmo antes e
 * depois de um reload, e é o mesmo em duas abas/dispositivos diferentes.
 */
export function useRoundTimer(slot: PatrolSlot | null | undefined): RoundTimerState | null {
  const serverNow = useServerTime(1000);

  return useMemo(() => {
    if (!slot) return null;

    const scheduledStart = new Date(slot.scheduled_start).getTime();
    const scheduledEnd = new Date(slot.scheduled_end).getTime();
    const totalSeconds = Math.max(0, Math.round((scheduledEnd - scheduledStart) / 1000));
    const nowMs = serverNow.getTime();

    const startedAtMs = slot.started_at ? new Date(slot.started_at).getTime() : null;
    const pausedAtMs = slot.paused_at ? new Date(slot.paused_at).getTime() : null;
    const isPaused = pausedAtMs != null;

    let secondsElapsed = 0;
    if (startedAtMs != null) {
      const rawElapsedMs = (isPaused ? pausedAtMs! : nowMs) - startedAtMs;
      const pausedMs = slot.paused_seconds * 1000;
      secondsElapsed = Math.max(0, Math.round((rawElapsedMs - pausedMs) / 1000));
    }

    const secondsRemaining = Math.max(0, Math.round((scheduledEnd - nowMs) / 1000));
    const isOverdue = nowMs > scheduledEnd && slot.status !== 'completed';
    const isLate = slot.status === 'late' || (slot.status === 'pending' && nowMs > scheduledStart);

    const progressPct = totalSeconds > 0
      ? Math.min(100, Math.max(0, Math.round(((totalSeconds - secondsRemaining) / totalSeconds) * 100)))
      : 0;

    return { secondsRemaining, secondsElapsed, totalSeconds, isPaused, isLate, isOverdue, progressPct };
  }, [slot, serverNow]);
}

export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}
