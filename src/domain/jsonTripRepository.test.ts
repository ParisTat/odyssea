import { describe, expect, test } from 'vitest';
import { createJsonTripRepository, jsonTripRepository } from './jsonTripRepository';
import { bundleJson, globModules, itineraryJson, tripJson } from '../test/fixtures';

describe('createJsonTripRepository', () => {
  const early = bundleJson({
    trip: tripJson({ slug: 'early', startDate: '2026-06-01', endDate: '2026-06-03' }),
    itinerary: itineraryJson({ days: [] }),
  });
  const late = bundleJson({ trip: tripJson({ slug: 'late' }) });

  test('lists trips sorted by start date', async () => {
    const repo = createJsonTripRepository(globModules(late, early));
    const trips = await repo.listTrips();

    expect(trips.map((t) => t.slug)).toEqual(['early', 'late']);
  });

  test('returns the full bundle for a slug', async () => {
    const repo = createJsonTripRepository(globModules(late));
    const bundle = await repo.getTripBundle('late');

    expect(bundle?.trip.slug).toBe('late');
    expect(bundle?.expenses).toHaveLength(1);
  });

  test('returns null for an unknown slug', async () => {
    const repo = createJsonTripRepository(globModules(late));
    expect(await repo.getTripBundle('nope')).toBeNull();
  });

  test('fails fast when a trip folder is missing a file', () => {
    const modules = globModules(late);
    delete modules['../data/trips/late/info.json'];

    expect(() => createJsonTripRepository(modules)).toThrow(/late.*info\.json/);
  });

  test('fails fast when the folder name differs from trip.slug', () => {
    const modules = globModules(late);
    const renamed = Object.fromEntries(
      Object.entries(modules).map(([key, value]) => [key.replace('/late/', '/other/'), value]),
    );

    expect(() => createJsonTripRepository(renamed)).toThrow(/other.*slug "late"/);
  });

  test('ignores files that are not part of a trip bundle', async () => {
    const modules = { ...globModules(late), '../data/trips/late/notes.json': { anything: true } };
    const repo = createJsonTripRepository(modules);

    expect(await repo.listTrips()).toHaveLength(1);
  });
});

describe('jsonTripRepository (real data in src/data/trips)', () => {
  test('every committed trip passes validation and Paris is there', async () => {
    const trips = await jsonTripRepository.listTrips();

    expect(trips.map((t) => t.slug)).toContain('paris-2026');
  });
});
