import { describe, it, expect } from 'vitest';
import {
  KIND_DEFAULTS,
  KIND_LABEL,
  inferKind,
  isNightShiftSelection,
  shiftCrossesDay,
  shiftDurationMinutes,
  type ShiftKind,
} from '../ShiftEditDialog';

/**
 * Testes de lógica do seletor "Tipo de turno" no ShiftEditDialog.
 * Valida que a opção Noturno existe, tem defaults corretos (19→07)
 * e que o cálculo de intervalo cruza corretamente para o dia seguinte.
 */
describe('ShiftEditDialog · Tipo de turno', () => {
  it('expõe a opção Noturno 12h no seletor', () => {
    const kinds = Object.keys(KIND_LABEL) as ShiftKind[];
    expect(kinds).toContain('night');
    expect(KIND_LABEL.night).toMatch(/Noturno/i);
    expect(KIND_LABEL.night).toMatch(/19.*07/);
  });

  it('Noturno tem defaults 19:00 → 07:00', () => {
    expect(KIND_DEFAULTS.night).toEqual({ start: '19:00', end: '07:00' });
  });

  it('inferKind identifica 19:00→07:00 como Noturno (não fica travado no Diurno)', () => {
    const kind = inferKind({
      shift_date: '2026-07-10',
      start_time: '19:00:00',
      end_time: '07:00:00',
      shift_type: 'night',
      is_vacation: false,
    });
    expect(kind).toBe('night');
  });

  it('não confunde Diurno (07→19) com Noturno', () => {
    const kind = inferKind({
      shift_date: '2026-07-10',
      start_time: '07:00:00',
      end_time: '19:00:00',
      shift_type: 'regular',
      is_vacation: false,
    });
    expect(kind).toBe('regular');
  });

  it('cálculo de duração para Noturno cruza o dia (19→07 = 12h)', () => {
    expect(shiftCrossesDay('night', '19:00', '07:00')).toBe(true);
    expect(shiftDurationMinutes('night', '19:00', '07:00')).toBe(12 * 60);
    expect(isNightShiftSelection('night', '19:00', '07:00')).toBe(true);
  });

  it('Diurno (07→19) não cruza dia e dura 12h', () => {
    expect(shiftCrossesDay('regular', '07:00', '19:00')).toBe(false);
    expect(shiftDurationMinutes('regular', '07:00', '19:00')).toBe(12 * 60);
    expect(isNightShiftSelection('regular', '07:00', '19:00')).toBe(false);
  });

  it('identifica alerta noturno quando o intervalo cruza a meia-noite', () => {
    expect(isNightShiftSelection('regular', '19:00', '07:00')).toBe(true);
    expect(shiftCrossesDay('regular', '19:00', '07:00')).toBe(true);
  });

  it('todos os tipos válidos estão disponíveis no seletor', () => {
    const kinds = Object.keys(KIND_LABEL) as ShiftKind[];
    expect(kinds).toEqual(expect.arrayContaining(['24h', 'regular', 'night', 'vacation']));
    expect(kinds).toHaveLength(4);
  });
});
