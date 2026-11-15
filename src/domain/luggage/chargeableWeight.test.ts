import { describe, expect, test } from 'vitest';
import { DEFAULT_VOLUMETRIC_DIVISOR, chargeableWeight } from './chargeableWeight';

describe('chargeableWeight', () => {
  test('uses the volumetric weight when it is higher than the actual weight', () => {
    const result = chargeableWeight({ lengthCm: 65, widthCm: 45, heightCm: 25, actualKg: 8 });
    expect(result.volumetricKg).toBeCloseTo(14.63, 2);
    expect(result.chargeableKg).toBeCloseTo(14.63, 2);
    expect(result.basis).toBe('volumetric');
  });

  test('uses the actual weight when it is higher', () => {
    const result = chargeableWeight({ lengthCm: 55, widthCm: 40, heightCm: 20, actualKg: 12 });
    expect(result.volumetricKg).toBeCloseTo(8.8, 2);
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
