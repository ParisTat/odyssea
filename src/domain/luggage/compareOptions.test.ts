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
    expect(euro?.outbound.chargeableKg).toBe(14.63);
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

  test('a tie with the airline total is not worth it', () => {
    // The cheapest option costs 56.96 EUR.
    const result = compareOptions({ bag: medium, airline: { outboundCents: 2696, returnCents: 3000 }, providers });
    expect(result.options[0]).toMatchObject({ totalCents: 5696, savingsCents: 0, notWorthIt: true });
    expect(result.verdict).toBe('check-bag');
  });

  test('says BOX NOW has no return route', () => {
    const result = compareOptions({ bag: medium, airline, providers });
    expect(result.excluded).toContainEqual({ providerId: 'boxnow', direction: 'return', reason: 'no-route' });
  });

  describe('weight band edges', () => {
    // A small, light-volume bag so only the actual weight decides the band.
    const bagOf = (actualKg: number) => ({ lengthCm: 20, widthCm: 20, heightCm: 10, actualKg });
    const eurosender = (kg: number) =>
      compareOptions({ bag: bagOf(kg), airline, providers }).options.find((o) => o.outbound.providerId === 'eurosender');

    test.each([
      [2, 1866, 2026],
      [2.01, 2394, 2598],
      [5, 2394, 2598],
      [5.01, 3417, 3196],
      [10, 3417, 3196],
      [10.01, 10213, 12282],
      [30, 10213, 12282],
    ])('%s kg is priced in the right band', (kg, out, back) => {
      const option = eurosender(kg);
      expect(option?.outbound.priceCents).toBe(out);
      expect(option?.return.priceCents).toBe(back);
    });

    test('30.01 kg is over the maximum and excluded with a reason', () => {
      const result = compareOptions({ bag: bagOf(30.01), airline, providers });
      expect(result.options).toEqual([]);
      expect(result.excluded).toContainEqual({ providerId: 'eurosender', direction: 'outbound', reason: 'over-max-weight' });
      expect(result.excluded).toContainEqual({ providerId: 'eurosender', direction: 'return', reason: 'over-max-weight' });
    });

    test('volumetric weight just over a band moves up to the next band', () => {
      // 100 x 50 x 10 / 5000 = 10 kg exactly; a hair taller is 10.01 kg.
      const atEdge = compareOptions({ bag: { lengthCm: 100, widthCm: 50, heightCm: 10, actualKg: 1 }, airline, providers });
      expect(atEdge.options[0].outbound.priceCents).toBe(3417);
      const over = compareOptions({ bag: { lengthCm: 100, widthCm: 50, heightCm: 10.004, actualKg: 1 }, airline, providers });
      expect(over.options[0].outbound.chargeableKg).toBe(10.01);
      expect(over.options[0].outbound.priceCents).toBe(10213);
    });
  });

  describe('locker limits', () => {
    const needsShop = (bag: { lengthCm: number; widthCm: number; heightCm: number; actualKg: number }) =>
      compareOptions({ bag, airline, providers }).options.find((o) => o.outbound.providerId === 'eurosender')?.outbound
        .needsShop;

    test('a bag exactly at the limit fits, in any orientation', () => {
      expect(needsShop({ lengthCm: 64, widthCm: 40, heightCm: 38, actualKg: 25 })).toBe(false);
      expect(needsShop({ lengthCm: 38, widthCm: 64, heightCm: 40, actualKg: 25 })).toBe(false);
      expect(needsShop({ lengthCm: 40, widthCm: 38, heightCm: 64, actualKg: 25 })).toBe(false);
    });

    test('a bag a hair over the limit needs a shop', () => {
      expect(needsShop({ lengthCm: 64.1, widthCm: 40, heightCm: 38, actualKg: 25 })).toBe(true);
      expect(needsShop({ lengthCm: 64, widthCm: 40, heightCm: 38, actualKg: 25.01 })).toBe(true);
    });
  });

  describe('BOX NOW size choice and ordering', () => {
    const reversed = structuredClone(providers);
    for (const route of reversed.flatMap((p) => p.routes)) {
      if (route.pricing.kind === 'locker-sizes') route.pricing.sizes.reverse();
    }

    test('picks the cheapest fitting size whatever the data order', () => {
      const tiny = { lengthCm: 40, widthCm: 30, heightCm: 5, actualKg: 1 };
      for (const list of [providers, reversed]) {
        const box = compareOptions({ bag: tiny, airline, providers: list }).options.find((o) => o.outbound.providerId === 'boxnow');
        expect(box?.outbound.sizeId).toBe('small');
        expect(box?.outbound.priceCents).toBe(900);
      }
    });

    const copyOf = (id: string, delivery: 'point' | 'address') => {
      const euro = providersJson[0];
      return { ...euro, id, routes: euro.routes.map((r) => ({ ...r, delivery })) };
    };

    test('breaks a price tie by point-to-point first', () => {
      // "aaa" costs the same as Eurosender but delivers to an address, so it is not point-to-point.
      const tied = parseProviders([copyOf('aaa', 'address'), providersJson[0]]);
      const options = compareOptions({ bag: medium, airline, providers: tied }).options;
      expect(options.map((o) => [o.outbound.providerId, o.return.providerId, o.pointToPoint])).toEqual([
        ['eurosender', 'eurosender', true],
        ['aaa', 'aaa', false],
        ['aaa', 'eurosender', false],
        ['eurosender', 'aaa', false],
      ]);
    });

    test('then by provider id', () => {
      const tied = parseProviders([copyOf('zeta', 'point'), providersJson[0]]);
      const ids = compareOptions({ bag: medium, airline, providers: tied }).options.map((o) => [
        o.outbound.providerId,
        o.return.providerId,
      ]);
      expect(ids).toEqual([
        ['eurosender', 'eurosender'],
        ['eurosender', 'zeta'],
        ['zeta', 'eurosender'],
        ['zeta', 'zeta'],
      ]);
    });
  });

  test('rejects negative or fractional airline fees', () => {
    expect(() => compareOptions({ bag: medium, airline: { outboundCents: -1, returnCents: 0 }, providers })).toThrow(RangeError);
    expect(() => compareOptions({ bag: medium, airline: { outboundCents: 1.5, returnCents: 0 }, providers })).toThrow(RangeError);
  });
});
