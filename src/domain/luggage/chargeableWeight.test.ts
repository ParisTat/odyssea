import { describe, expect, test } from 'vitest';
import { DEFAULT_VOLUMETRIC_DIVISOR, chargeableWeight } from './chargeableWeight';

describe('chargeableWeight', () => {
  test('uses the volumetric weight when it is higher than the actual weight', () => {
    const result = chargeableWeight({ lengthCm: 65, widthCm: 45, heightCm: 25, actualKg: 8 });
    expect(result.volumetricKg).toBe(14.63);
    expect(result.chargeableKg).toBe(14.63);
    expect(result.basis).toBe('volumetric');
  });

  test('rounds up to 0.01 kg', () => {
    // 100 x 50 x 10.004 / 5000 = 10.004 kg
    expect(chargeableWeight({ lengthCm: 100, widthCm: 50, heightCm: 10.004, actualKg: 1 }).volumetricKg).toBe(10.01);
    expect(chargeableWeight({ lengthCm: 100, widthCm: 50, heightCm: 10, actualKg: 1 }).volumetricKg).toBe(10);
  });

  test('ignores float noise when rounding up', () => {
    // 0.1 x 7 x 1000 / 5000 is exactly 0.14 kg, but the float product lands a hair above.
    expect(chargeableWeight({ lengthCm: 0.1, widthCm: 7, heightCm: 1000, actualKg: 0.05 }).volumetricKg).toBe(0.14);
  });

  test('uses the actual weight when it is higher', () => {
    const result = chargeableWeight({ lengthCm: 55, widthCm: 40, heightCm: 20, actualKg: 12 });
    expect(result.volumetricKg).toBe(8.8);
    expect(result.chargeableKg).toBe(12);
    expect(result.basis).toBe('actual');
  });

  test('honours a per-provider divisor', () => {
    const result = chargeableWeight({ lengthCm: 60, widthCm: 40, heightCm: 25, actualKg: 1 }, 4000);
    expect(result.volumetricKg).toBe(15);
  });

  test('defaults the divisor to 5000', () => {
    expect(DEFAULT_VOLUMETRIC_DIVISOR).toBe(5000);
  });

  test.each([
    [{ lengthCm: 0, widthCm: 40, heightCm: 20, actualKg: 5 }, 5000],
    [{ lengthCm: 55, widthCm: 40, heightCm: 20, actualKg: -1 }, 5000],
    [{ lengthCm: 55, widthCm: 40, heightCm: 20, actualKg: 5 }, 0],
    [{ lengthCm: Number.NaN, widthCm: 40, heightCm: 20, actualKg: 5 }, 5000],
  ])('rejects invalid input %#', (bag, divisor) => {
    expect(() => chargeableWeight(bag, divisor)).toThrow(RangeError);
  });
});
