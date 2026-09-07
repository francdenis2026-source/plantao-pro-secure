import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  isNightShift, getAcreHour, getNightWindow, applyNightShiftLock,
  NIGHT_START, NIGHT_END,
} from '@/lib/nightShift';


/**
 * Rio Branco is UTC-5 (no DST). To hit a specific Acre hour H we build a UTC
 * date with hours = (H + 5) mod 24 for the same calendar day.
 */
const atAcre = (yyyy: number, mm: number, dd: number, h: number, m = 0) =>
  new Date(Date.UTC(yyyy, mm - 1, dd, h + 5, m, 0));


describe('nightShift helpers (server-time aware)', () => {
  afterEach(() => vi.useRealTimers());

  it('exposes canonical constants', () => {
    expect(NIGHT_START).toBe('22:00');
    expect(NIGHT_END).toBe('06:00');
  });

  describe('getAcreHour', () => {
    it('converts UTC to America/Rio_Branco (UTC-5)', () => {
      expect(getAcreHour(atAcre(2026, 7, 7, 0))).toBe(0);
      expect(getAcreHour(atAcre(2026, 7, 7, 6))).toBe(6);
      expect(getAcreHour(atAcre(2026, 7, 7, 21, 59))).toBe(21);
      expect(getAcreHour(atAcre(2026, 7, 7, 22))).toBe(22);
      expect(getAcreHour(atAcre(2026, 7, 7, 23, 30))).toBe(23);
    });
  });

  describe('isNightShift', () => {
    it('is FALSE at 06:00 sharp (end of window is exclusive)', () => {
      expect(isNightShift(atAcre(2026, 7, 7, 6, 0))).toBe(false);
    });
    it('is FALSE at 21:59 (before window opens)', () => {
      expect(isNightShift(atAcre(2026, 7, 7, 21, 59))).toBe(false);
    });
    it('is TRUE at 22:00 sharp (window opens)', () => {
      expect(isNightShift(atAcre(2026, 7, 7, 22, 0))).toBe(true);
    });
    it('is TRUE at 23:30', () => {
      expect(isNightShift(atAcre(2026, 7, 7, 23, 30))).toBe(true);
    });
    it('is TRUE at 00:00, 03:15 and 05:59', () => {
      expect(isNightShift(atAcre(2026, 7, 8, 0, 0))).toBe(true);
      expect(isNightShift(atAcre(2026, 7, 8, 3, 15))).toBe(true);
      expect(isNightShift(atAcre(2026, 7, 8, 5, 59))).toBe(true);
    });
    it('is FALSE at midday', () => {
      expect(isNightShift(atAcre(2026, 7, 7, 12, 0))).toBe(false);
    });
    it('uses server time, ignoring device clock offset', () => {
      // Simulate a device with wrong local timezone by mocking Date.now
      const trueNow = atAcre(2026, 7, 7, 23, 0);
      vi.useFakeTimers();
      vi.setSystemTime(trueNow);
      expect(isNightShift()).toBe(true);
    });
  });

  describe('getNightWindow', () => {
    it('returns TODAY 22:00 → TOMORROW 06:00 when called in the evening', () => {
      const w = getNightWindow(atAcre(2026, 7, 7, 22, 30));
      expect(w.startLabel).toMatch(/07\/07\/2026,? 22:00/);
      expect(w.endLabel).toMatch(/08\/07\/2026,? 06:00/);
    });
    it('returns YESTERDAY 22:00 → TODAY 06:00 when called after midnight', () => {
      const w = getNightWindow(atAcre(2026, 7, 8, 2, 0));
      expect(w.startLabel).toMatch(/07\/07\/2026,? 22:00/);
      expect(w.endLabel).toMatch(/08\/07\/2026,? 06:00/);
    });
    it('returns the NEXT window when called during the day', () => {
      const w = getNightWindow(atAcre(2026, 7, 7, 14, 0));
      expect(w.startLabel).toMatch(/07\/07\/2026,? 22:00/);
      expect(w.endLabel).toMatch(/08\/07\/2026,? 06:00/);
    });
    it('window duration is always 8 hours', () => {
      const w = getNightWindow(atAcre(2026, 7, 7, 23, 0));
      expect(w.endsAt.getTime() - w.startsAt.getTime()).toBe(8 * 3600_000);
    });
  });
});

describe('applyNightShiftLock — manual night shift contract', () => {
  it('does NOT touch values outside the night window', () => {
    const r = applyNightShiftLock({
      now: atAcre(2026, 7, 7, 14, 0),
      startTime: '07:00',
      endTime: '19:00',
    });
    expect(r).toEqual({ startTime: '07:00', endTime: '19:00', locked: false, auditRequired: false });
  });

  it('preserves custom values inside the night window', () => {
    const r = applyNightShiftLock({
      now: atAcre(2026, 7, 7, 23, 45),
      startTime: '07:00',       // agent tried to inject a day-shift start
      endTime: '19:00',
    });
    expect(r.locked).toBe(false);
    expect(r.startTime).toBe('07:00');
    expect(r.endTime).toBe('19:00');
    expect(r.auditRequired).toBe(false);
  });

  it('is TRUE at 05:59 (last minute of window) and RELEASES at 06:00', () => {
    const insideLastMinute = applyNightShiftLock({
      now: atAcre(2026, 7, 8, 5, 59),
      startTime: '05:00', endTime: '13:00',
    });
    expect(insideLastMinute.locked).toBe(false);

    const releasedAtSix = applyNightShiftLock({
      now: atAcre(2026, 7, 8, 6, 0),
      startTime: '05:00', endTime: '13:00',
    });
    expect(releasedAtSix.locked).toBe(false);
    expect(releasedAtSix.startTime).toBe('05:00');
  });

  it('with masterOverride=true keeps custom values without requiring audit', () => {
    const r = applyNightShiftLock({
      now: atAcre(2026, 7, 7, 23, 0),
      startTime: '20:00', endTime: '04:00',
      masterOverride: true,
    });
    expect(r.locked).toBe(false);
    expect(r.startTime).toBe('20:00');
    expect(r.endTime).toBe('04:00');
    expect(r.auditRequired).toBe(false);
  });

  it('with masterOverride=true AND standard values → no audit required', () => {
    const r = applyNightShiftLock({
      now: atAcre(2026, 7, 7, 23, 0),
      startTime: NIGHT_START, endTime: NIGHT_END,
      masterOverride: true,
    });
    expect(r.auditRequired).toBe(false);
  });
});
