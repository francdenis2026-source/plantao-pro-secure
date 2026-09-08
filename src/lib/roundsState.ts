/**
 * Máquina de estados explícita do Gestor de Rondas.
 *
 * Regra dura: nenhum contador de agente pode existir antes de o cronômetro
 * global efetivamente iniciar. Enquanto houver `scheduledStartMs` no futuro,
 * o estado é obrigatoriamente `before_start` e o único número exibido é o
 * tempo restante até o início do primeiro agente.
 */

export type RoundsPhase =
  | 'idle'          // sem cronograma pronto / sem programação
  | 'before_start'  // agendado, ainda NÃO chegou a hora — só regressiva geral
  | 'running'       // agente atual em ronda ativa
  | 'paused'        // pausa/intervalo manual
  | 'done';         // cronograma concluído

export interface RoundsStateInput {
  /** Cronograma já validado (pelo menos 1 linha). */
  hasSchedule: boolean;
  /** Tempo total do cronograma em segundos. */
  totalSec: number;
  /** Horário absoluto (ms) programado para iniciar. `null` = sem programação. */
  scheduledStartMs: number | null;
  /** Horário absoluto (ms) em que o cronômetro global foi iniciado. `null` = não iniciado. */
  startedAtMs: number | null;
  /** Indicador de pausa manual. */
  paused: boolean;
  /** Agora, em ms (server time). */
  nowMs: number;
  /** Tolerância em ms para considerar "no horário" (default 1s). */
  toleranceMs?: number;
}

export interface RoundsStateOutput {
  phase: RoundsPhase;
  /** Segundos restantes até o início programado. `null` se não aplicável. */
  secondsUntilStart: number | null;
  /** Segundos decorridos desde `startedAtMs`. `null` se não iniciado. */
  elapsedSec: number | null;
  /** Somente `true` quando é seguro mostrar contadores por agente. */
  canShowAgentCountdown: boolean;
}

export function computeRoundsState(input: RoundsStateInput): RoundsStateOutput {
  const {
    hasSchedule,
    totalSec,
    scheduledStartMs,
    startedAtMs,
    paused,
    nowMs,
    toleranceMs = 1000,
  } = input;

  if (!hasSchedule) {
    return { phase: 'idle', secondsUntilStart: null, elapsedSec: null, canShowAgentCountdown: false };
  }

  // Programação pendente tem precedência absoluta enquanto o cronômetro global
  // ainda não iniciou. Nunca conta tempo de agente antes disso.
  if (startedAtMs == null && scheduledStartMs != null) {
    const diffMs = scheduledStartMs - nowMs;
    if (diffMs > toleranceMs) {
      return {
        phase: 'before_start',
        secondsUntilStart: Math.max(0, Math.ceil(diffMs / 1000)),
        elapsedSec: null,
        canShowAgentCountdown: false,
      };
    }
  }

  if (startedAtMs == null) {
    return { phase: 'idle', secondsUntilStart: null, elapsedSec: null, canShowAgentCountdown: false };
  }

  const elapsedSec = Math.max(0, (nowMs - startedAtMs) / 1000);

  if (elapsedSec >= totalSec) {
    return { phase: 'done', secondsUntilStart: null, elapsedSec, canShowAgentCountdown: false };
  }

  if (paused) {
    return { phase: 'paused', secondsUntilStart: null, elapsedSec, canShowAgentCountdown: true };
  }

  return { phase: 'running', secondsUntilStart: null, elapsedSec, canShowAgentCountdown: true };
}
