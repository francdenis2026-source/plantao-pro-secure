import { describe, it, expect, vi, afterEach } from 'vitest';
import { getShiftBounds, isShiftActive } from './shiftTime';

/**
 * Testes garantem que o status de plantão muda EXATAMENTE no `end_time`,
 * inclusive em turnos que cruzam a meia-noite (madrugada / virada de dia).
 * Fonte de verdade única: src/lib/shiftTime.ts.
 */

afterEach(() => {
  vi.useRealTimers();
});

describe('getShiftBounds', () => {
  it('turno diurno padrão (07:00 → 19:00)', () => {
    const { start, end } = getShiftBounds({
      shift_date: '2026-07-11',
      start_time: '07:00',
      end_time: '19:00',
    });
    expect(start.getHours()).toBe(7);
    expect(end.getHours()).toBe(19);
    expect(end.getDate()).toBe(start.getDate());
  });

  it('turno noturno cruzando meia-noite (19:00 → 07:00)', () => {
    const { start, end } = getShiftBounds({
      shift_date: '2026-07-11',
      start_time: '19:00',
      end_time: '07:00',
    });
    expect(start.getHours()).toBe(19);
    expect(end.getHours()).toBe(7);
    // Fim deve cair no dia seguinte
    expect(end.getDate()).toBe(start.getDate() + 1);
    // Duração real = 12h
    expect(end.getTime() - start.getTime()).toBe(12 * 60 * 60 * 1000);
  });

  it('turno madrugada estrita (22:00 → 06:00) tem 8h', () => {
    const { start, end } = getShiftBounds({
      shift_date: '2026-07-11',
      start_time: '22:00',
      end_time: '06:00',
    });
    expect(end.getTime() - start.getTime()).toBe(8 * 60 * 60 * 1000);
  });

  it('convenção legada: end_time ausente → 24h', () => {
    const { start, end } = getShiftBounds({
      shift_date: '2026-07-11',
      start_time: '07:00',
      end_time: null,
    });
    expect(end.getTime() - start.getTime()).toBe(24 * 60 * 60 * 1000);
  });

  it('convenção legada: end_time = start_time → 24h', () => {
    const { start, end } = getShiftBounds({
      shift_date: '2026-07-11',
      start_time: '07:00',
      end_time: '07:00',
    });
    expect(end.getTime() - start.getTime()).toBe(24 * 60 * 60 * 1000);
  });
});

describe('isShiftActive — transição exata no end_time', () => {
  const shiftDay = {
    shift_date: '2026-07-11',
    start_time: '07:00',
    end_time: '19:00',
  };

  it('ativo 1 segundo antes do end_time', () => {
    const oneSecBeforeEnd = new Date('2026-07-11T18:59:59');
    expect(isShiftActive(shiftDay, oneSecBeforeEnd)).toBe(true);
  });

  it('INATIVO no instante exato do end_time', () => {
    const exactlyEnd = new Date('2026-07-11T19:00:00');
    expect(isShiftActive(shiftDay, exactlyEnd)).toBe(false);
  });

  it('inativo 1 segundo depois do end_time', () => {
    const afterEnd = new Date('2026-07-11T19:00:01');
    expect(isShiftActive(shiftDay, afterEnd)).toBe(false);
  });

  it('inativo antes do start_time', () => {
    const beforeStart = new Date('2026-07-11T06:59:59');
    expect(isShiftActive(shiftDay, beforeStart)).toBe(false);
  });

  it('ativo no instante exato do start_time', () => {
    const exactlyStart = new Date('2026-07-11T07:00:00');
    expect(isShiftActive(shiftDay, exactlyStart)).toBe(true);
  });
});

describe('isShiftActive — turno noturno (virada de meia-noite)', () => {
  const nightShift = {
    shift_date: '2026-07-11',
    start_time: '19:00',
    end_time: '07:00',
  };

  it('ativo às 23:59 (antes da virada)', () => {
    expect(isShiftActive(nightShift, new Date('2026-07-11T23:59:00'))).toBe(true);
  });

  it('ativo às 00:00 do dia seguinte', () => {
    expect(isShiftActive(nightShift, new Date('2026-07-12T00:00:00'))).toBe(true);
  });

  it('ativo às 03:00 da madrugada', () => {
    expect(isShiftActive(nightShift, new Date('2026-07-12T03:00:00'))).toBe(true);
  });

  it('ativo às 06:59 (1 min antes do fim)', () => {
    expect(isShiftActive(nightShift, new Date('2026-07-12T06:59:00'))).toBe(true);
  });

  it('INATIVO exatamente às 07:00 do dia seguinte (end_time)', () => {
    expect(isShiftActive(nightShift, new Date('2026-07-12T07:00:00'))).toBe(false);
  });

  it('inativo às 07:01 do dia seguinte', () => {
    expect(isShiftActive(nightShift, new Date('2026-07-12T07:01:00'))).toBe(false);
  });

  it('inativo antes do início (18:59 do dia do plantão)', () => {
    expect(isShiftActive(nightShift, new Date('2026-07-11T18:59:00'))).toBe(false);
  });
});

describe('isShiftActive — turno estrito 22:00 → 06:00', () => {
  const strictNight = {
    shift_date: '2026-07-11',
    start_time: '22:00',
    end_time: '06:00',
  };

  it('ativo às 22:00', () => {
    expect(isShiftActive(strictNight, new Date('2026-07-11T22:00:00'))).toBe(true);
  });

  it('ativo às 05:59 do dia seguinte', () => {
    expect(isShiftActive(strictNight, new Date('2026-07-12T05:59:59'))).toBe(true);
  });

  it('INATIVO exatamente às 06:00 do dia seguinte', () => {
    expect(isShiftActive(strictNight, new Date('2026-07-12T06:00:00'))).toBe(false);
  });
});

describe('isShiftActive — convenção legada 24h', () => {
  const legacy24h = {
    shift_date: '2026-07-11',
    start_time: '07:00',
    end_time: '07:00',
  };

  it('ativo 1 segundo antes de completar 24h', () => {
    expect(isShiftActive(legacy24h, new Date('2026-07-12T06:59:59'))).toBe(true);
  });

  it('INATIVO exatamente 24h após início', () => {
    expect(isShiftActive(legacy24h, new Date('2026-07-12T07:00:00'))).toBe(false);
  });
});
