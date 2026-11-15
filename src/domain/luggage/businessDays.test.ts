import { describe, expect, test } from 'vitest';
import { addBusinessDays, addDays, isBusinessDay, rollBack, rollForward } from './businessDays';

// 2026-11-16 is a Monday.
describe('businessDays', () => {
  test('addDays moves by calendar days across month ends', () => {
    expect(addDays('2026-11-30', 2)).toBe('2026-12-02');
    expect(addDays('2026-11-03', -4)).toBe('2026-10-30');
  });

  test('isBusinessDay is false on weekends', () => {
    expect(isBusinessDay('2026-11-16')).toBe(true);
    expect(isBusinessDay('2026-11-21')).toBe(false);
    expect(isBusinessDay('2026-11-22')).toBe(false);
  });

  test('addBusinessDays skips weekends forwards and backwards', () => {
    expect(addBusinessDays('2026-11-19', 3)).toBe('2026-11-24');
    expect(addBusinessDays('2026-11-24', -3)).toBe('2026-11-19');
    expect(addBusinessDays('2026-11-21', 1)).toBe('2026-11-23');
    expect(addBusinessDays('2026-11-21', -1)).toBe('2026-11-20');
    expect(addBusinessDays('2026-11-16', 0)).toBe('2026-11-16');
  });

  test('rollBack and rollForward land on business days', () => {
    expect(rollBack('2026-11-22')).toBe('2026-11-20');
    expect(rollForward('2026-11-21')).toBe('2026-11-23');
    expect(rollBack('2026-11-18')).toBe('2026-11-18');
    expect(rollForward('2026-11-18')).toBe('2026-11-18');
  });

  test('handles leap years', () => {
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(addDays('2028-02-29', 1)).toBe('2028-03-01');
    expect(() => addDays('2027-02-29', 1)).toThrow(RangeError);
  });

  test('rejects non-integer and infinite counts', () => {
    expect(() => addDays('2026-11-16', 1.5)).toThrow(RangeError);
    expect(() => addBusinessDays('2026-11-16', 0.5)).toThrow(RangeError);
    expect(() => addBusinessDays('2026-11-16', Infinity)).toThrow(RangeError);
    expect(() => addBusinessDays('2026-11-16', Number.NaN)).toThrow(RangeError);
  });

  test('rejects malformed dates', () => {
    expect(() => addDays('16/11/2026', 1)).toThrow(RangeError);
    expect(() => addDays('2026-02-31', 1)).toThrow(RangeError);
  });
});
