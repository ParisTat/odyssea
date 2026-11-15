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

  test('rejects unknown keys', () => {
    const data = clone();
    data[0].surprise = true;
    expect(() => parseProviders(data)).toThrow();
    const route = clone();
    (route[0].routes as Record<string, unknown>[])[0].extra = 1;
    expect(() => parseProviders(route)).toThrow();
  });

  test('rejects duplicate provider ids', () => {
    const data = clone();
    data[1].id = data[0].id;
    expect(() => parseProviders(data)).toThrow(/unique/);
  });

  test('rejects a duplicate route for the same direction and countries', () => {
    const data = clone();
    const routes = data[0].routes as unknown[];
    routes.push(structuredClone(routes[0]));
    expect(() => parseProviders(data)).toThrow(/Duplicate route/);
  });

  test('rejects lowercase or malformed country codes', () => {
    const lower = clone();
    (lower[0].routes as Record<string, unknown>[])[0].from = 'gr';
    expect(() => parseProviders(lower)).toThrow();
    const long = clone();
    (long[0].routes as Record<string, unknown>[])[0].to = 'FRA';
    expect(() => parseProviders(long)).toThrow();
  });

  test('rejects a maxKg below the last weight band', () => {
    const data = clone();
    data[0].maxKg = 25;
    expect(() => parseProviders(data)).toThrow(/maxKg/);
  });

  test('rejects a transit range where min is above max', () => {
    const data = clone();
    (data[0].routes as { transit: unknown }[])[0].transit = { minDays: 9, maxDays: 2 };
    expect(() => parseProviders(data)).toThrow();
  });
});
