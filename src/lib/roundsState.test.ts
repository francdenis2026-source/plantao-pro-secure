import { describe, it, expect } from 'vitest';
import { computeRoundsState } from './roundsState';

const TOTAL_SEC = 8 * 3600; // 22:00 → 06:00

describe('computeRoundsState — states', () => {
  it('idle: sem cronograma', () => {
    const s = computeRoundsState({
      hasSchedule: false,
      totalSec: 0,
      scheduledStartMs: null,
      startedAtMs: null,
      paused: false,
      nowMs: Date.now(),
    });
    expect(s.phase).toBe('idle');
    expect(s.canShowAgentCountdown).toBe(false);
  });

  it('before_start: 22:30 programado, agora 22:00 — nada de contador de agente', () => {
    const now = new Date('2026-07-15T22:00:00-05:00').getTime();
    const scheduled = new Date('2026-07-15T22:30:00-05:00').getTime();
    const s = computeRoundsState({
      hasSchedule: true,
      totalSec: TOTAL_SEC,
      scheduledStartMs: scheduled,
      startedAtMs: null,
      paused: false,
      nowMs: now,
    });
    expect(s.phase).toBe('before_start');
    expect(s.canShowAgentCountdown).toBe(false);
    expect(s.secondsUntilStart).toBe(30 * 60);
    expect(s.elapsedSec).toBeNull();
  });

  it('running: exatamente no horário programado inicia do zero', () => {
    const scheduled = new Date('2026-07-15T22:30:00-05:00').getTime();
    // Simula que auto-start armou startedAtMs = scheduled ao bater a hora
    const s = computeRoundsState({
      hasSchedule: true,
      totalSec: TOTAL_SEC,
      scheduledStartMs: scheduled,
      startedAtMs: scheduled,
      paused: false,
      nowMs: scheduled,
    });
    expect(s.phase).toBe('running');
    expect(s.canShowAgentCountdown).toBe(true);
    expect(s.elapsedSec).toBe(0);
    expect(s.secondsUntilStart).toBeNull();
  });

  it('running: 1h após início', () => {
    const scheduled = new Date('2026-07-15T22:30:00-05:00').getTime();
    const s = computeRoundsState({
      hasSchedule: true,
      totalSec: TOTAL_SEC,
      scheduledStartMs: scheduled,
      startedAtMs: scheduled,
      paused: false,
      nowMs: scheduled + 3600_000,
    });
    expect(s.phase).toBe('running');
    expect(s.elapsedSec).toBe(3600);
  });

  it('paused: mantém elapsed mas sinaliza pausa', () => {
    const started = Date.now() - 60_000;
    const s = computeRoundsState({
      hasSchedule: true,
      totalSec: TOTAL_SEC,
      scheduledStartMs: null,
      startedAtMs: started,
      paused: true,
      nowMs: Date.now(),
    });
    expect(s.phase).toBe('paused');
    expect(s.canShowAgentCountdown).toBe(true);
  });

  it('done: elapsed >= total', () => {
    const started = Date.now() - (TOTAL_SEC + 10) * 1000;
    const s = computeRoundsState({
      hasSchedule: true,
      totalSec: TOTAL_SEC,
      scheduledStartMs: null,
      startedAtMs: started,
      paused: false,
      nowMs: Date.now(),
    });
    expect(s.phase).toBe('done');
    expect(s.canShowAgentCountdown).toBe(false);
  });

  it('regressão: agendado no futuro NÃO pode contabilizar tempo de agente', () => {
    const now = new Date('2026-07-15T22:00:00-05:00').getTime();
    const scheduled = new Date('2026-07-15T22:30:00-05:00').getTime();
    const s = computeRoundsState({
      hasSchedule: true,
      totalSec: TOTAL_SEC,
      scheduledStartMs: scheduled,
      startedAtMs: null, // <- crítico: cronômetro ainda não foi armado
      paused: false,
      nowMs: now,
    });
    expect(s.phase).toBe('before_start');
    expect(s.canShowAgentCountdown).toBe(false);
    expect(s.elapsedSec).toBeNull();
  });

  it('tolerância: dentro de 1s do horário programado já é considerado running quando startedAt cai junto', () => {
    const scheduled = new Date('2026-07-15T22:30:00-05:00').getTime();
    const s = computeRoundsState({
      hasSchedule: true,
      totalSec: TOTAL_SEC,
      scheduledStartMs: scheduled,
      startedAtMs: scheduled,
      paused: false,
      nowMs: scheduled + 500,
    });
    expect(s.phase).toBe('running');
  });
});
