import { describe, expect, test } from 'vitest';
import providersJson from '../../data/luggage/providers.json';
import { compareOptions } from './compareOptions';
import { parseProviders } from './providers';

const providers = parseProviders(providersJson);
const airline = { outboundCents: 9000, returnCents: 9000 };
const medium = { lengthCm: 55, widthCm: 40, heightCm: 20, actualKg: 10 };

describe('compareOptions', () => {
  test('sorts options by total and shows savings vs the airline', () => {
    const result = compareOptions({ bag: medium, airline, providers });
    expect(result.airlineTotalCents).toBe(18000);
    const totals = result.options.map((o) => o.totalCents);
    expect(totals).toEqual([...totals].sort((a, b) => a - b));
    // BOX NOW Large out (25.00) + Eurosender return 10 kg (31.96) is the cheapest.
    expect(result.options[0]).toMatchObject({ totalCents: 5696, savingsCents: 12304, notWorthIt: false });
    // Eurosender both ways: 34.17 + 31.96.
    expect(result.options.find((o) => o.outbound.providerId === 'eurosender')).toMatchObject({
      totalCents: 6613,
      pointToPoint: true,
    });
    expect(result.verdict).toBe('send');
  });

  test('marks BOX NOW outbound as not point-to-point', () => {
    const result = compareOptions({ bag: medium, airline, providers });
    expect(result.options.find((o) => o.outbound.providerId === 'boxnow')?.pointToPoint).toBe(false);
  });

  test('says "check the bag" for a big suitcase', () => {
    const big = { lengthCm: 75, widthCm: 50, heightCm: 30, actualKg: 23 };
    const result = compareOptions({ bag: big, airline, providers });
    expect(result.verdict).toBe('check-bag');
    expect(result.options.every((o) => o.notWorthIt)).toBe(true);
    expect(result.options[0].savingsCents).toBeLessThan(0);
  });

  test('uses volumetric weight to pick the price band', () => {
    // 5 kg actual but 14.63 kg volumetric: the 30 kg band applies, not the 5 kg one.
    const bulky = { lengthCm: 65, widthCm: 45, heightCm: 25, actualKg: 5 };
    const result = compareOptions({ bag: bulky, airline, providers });
    const euro = result.options.find((o) => o.outbound.providerId === 'eurosender');
    expect(euro?.outbound.chargeableKg).toBeCloseTo(14.63, 2);
    expect(euro?.outbound.priceCents).toBe(10213);
  });

  test('excludes a bag over the maximum weight with a reason', () => {
    const heavy = { lengthCm: 60, widthCm: 40, heightCm: 30, actualKg: 35 };
    const result = compareOptions({ bag: heavy, airline, providers });
    expect(result.options).toEqual([]);
    expect(result.excluded).toContainEqual({ providerId: 'eurosender', direction: 'outbound', reason: 'over-max-weight' });
    expect(result.verdict).toBe('check-bag');
  });

  test('excludes a bag that fits no locker size', () => {
    const wide = { lengthCm: 80, widthCm: 50, heightCm: 40, actualKg: 8 };
    const result = compareOptions({ bag: wide, airline, providers });
    expect(result.excluded).toContainEqual({ providerId: 'boxnow', direction: 'outbound', reason: 'no-fitting-size' });
  });

  test('skips a size with an unknown price and uses the next one that fits', () => {
    const small3kg = { lengthCm: 40, widthCm: 30, heightCm: 10, actualKg: 3 };
    const result = compareOptions({ bag: small3kg, airline, providers });
    expect(result.options.find((o) => o.outbound.providerId === 'boxnow')?.outbound.sizeId).toBe('large');
  });

  test('flags a bag too big for a parcel locker', () => {
    const long = { lengthCm: 70, widthCm: 45, heightCm: 20, actualKg: 10 };
    const euro = compareOptions({ bag: long, airline, providers }).options.find((o) => o.outbound.providerId === 'eurosender');
    expect(euro?.outbound.needsShop).toBe(true);
    const small = compareOptions({ bag: medium, airline, providers }).options.find((o) => o.outbound.providerId === 'eurosender');
    expect(small?.outbound.needsShop).toBe(false);
  });

  test('a free airline bag is never beaten', () => {
    const result = compareOptions({ bag: medium, airline: { outboundCents: 0, returnCents: 0 }, providers });
    expect(result.verdict).toBe('check-bag');
  });

  test('rejects negative or fractional airline fees', () => {
    expect(() => compareOptions({ bag: medium, airline: { outboundCents: -1, returnCents: 0 }, providers })).toThrow(RangeError);
    expect(() => compareOptions({ bag: medium, airline: { outboundCents: 1.5, returnCents: 0 }, providers })).toThrow(RangeError);
  });
});
