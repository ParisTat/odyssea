import { describe, expect, test } from 'vitest';
import providersJson from '../../data/luggage/providers.json';
import { parseProviders } from './providers';

const clone = () => structuredClone(providersJson) as unknown as Record<string, unknown>[];

describe('providers data', () => {
  test('the static data file is valid', () => {
    expect(parseProviders(providersJson).map((p) => p.id)).toEqual(['eurosender', 'boxnow']);
  });

  test('every provider value was checked on 2026-11-06', () => {
    for (const provider of parseProviders(providersJson)) {
      expect(provider.checkedOn).toBe('2026-11-06');
    }
  });

  test('BOX NOW has an outbound route only', () => {
    const boxnow = parseProviders(providersJson).find((p) => p.id === 'boxnow');
    expect(boxnow?.routes.map((r) => r.direction)).toEqual(['outbound']);
  });

  test('rejects a negative price', () => {
    const data = clone();
    (data[0].routes as { pricing: unknown }[])[0].pricing = { kind: 'weight-bands', bands: [{ upToKg: 2, priceCents: -1 }] };
    expect(() => parseProviders(data)).toThrow();
  });

  test('rejects an unknown pricing kind', () => {
    const data = clone();
    (data[0].routes as { pricing: unknown }[])[0].pricing = { kind: 'magic' };
    expect(() => parseProviders(data)).toThrow();
  });

  test('rejects a bad date', () => {
    const data = clone();
    data[0].checkedOn = 'yesterday';
    expect(() => parseProviders(data)).toThrow();
  });

  test('rejects unsorted weight bands', () => {
    const data = clone();
    (data[0].routes as { pricing: unknown }[])[0].pricing = {
      kind: 'weight-bands',
      bands: [
        { upToKg: 10, priceCents: 100 },
        { upToKg: 5, priceCents: 200 },
      ],
    };
    expect(() => parseProviders(data)).toThrow();
  });

  test('rejects a transit range where min is above max', () => {
    const data = clone();
    (data[0].routes as { transit: unknown }[])[0].transit = { minDays: 9, maxDays: 2 };
    expect(() => parseProviders(data)).toThrow();
  });
});
