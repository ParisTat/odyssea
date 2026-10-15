import { describe, expect, test } from 'vitest';
import { localize, parseTripBundle } from './schemas';
import { bundleJson, expenseJson, expensesJson, itineraryJson, tripJson } from '../test/fixtures';

function issuesOf(raw: unknown): string {
  try {
    parseTripBundle(raw, 'test-trip');
    return '';
  } catch (error: unknown) {
    return error instanceof Error ? error.message : String(error);
  }
}

describe('parseTripBundle', () => {
  test('parses a valid bundle', () => {
    const bundle = parseTripBundle(bundleJson(), 'test-trip');

    expect(bundle.trip.slug).toBe('test-trip');
    expect(bundle.itinerary.days).toHaveLength(2);
    expect(bundle.expenses[0].amountMinor).toBe(4000);
    expect(bundle.info.sections[0].sources[0].url).toBe('https://example.com/rail');
  });

  test('requires rateToEur for a non-EUR expense', () => {
    const raw = bundleJson({ expenses: expensesJson([expenseJson({ currency: 'USD' })]) });
    expect(issuesOf(raw)).toMatch(/rateToEur/);
  });

  test('accepts a non-EUR expense with a positive rate', () => {
    const raw = bundleJson({ expenses: expensesJson([expenseJson({ currency: 'USD', rateToEur: 1.12 })]) });
    expect(parseTripBundle(raw, 'test-trip').expenses[0].rateToEur).toBe(1.12);
  });

  test.each([0, -100, 12.5])('rejects amountMinor %s (must be a positive integer)', (amountMinor) => {
    const raw = bundleJson({ expenses: expensesJson([expenseJson({ amountMinor })]) });
    expect(issuesOf(raw)).toMatch(/amountMinor/);
  });

  test('rejects an unknown payer', () => {
    const raw = bundleJson({ expenses: expensesJson([expenseJson({ paidBy: 'ghost' })]) });
    expect(issuesOf(raw)).toMatch(/paidBy.*ghost/);
  });

  test('rejects an unknown traveller in splitWith', () => {
    const raw = bundleJson({ expenses: expensesJson([expenseJson({ splitWith: ['ana', 'ghost'] })]) });
    expect(issuesOf(raw)).toMatch(/splitWith.*ghost/);
  });

  test('rejects duplicate expense ids', () => {
    const raw = bundleJson({ expenses: expensesJson([expenseJson(), expenseJson()]) });
    expect(issuesOf(raw)).toMatch(/duplicate expense id "e1"/i);
  });

  test('rejects duplicate traveller ids', () => {
    const raw = bundleJson({
      trip: tripJson({ travellers: [{ id: 'ana', name: 'Ana' }, { id: 'ana', name: 'Ana 2' }] }),
    });
    expect(issuesOf(raw)).toMatch(/duplicate traveller id "ana"/i);
  });

  test('rejects an end date before the start date', () => {
    const raw = bundleJson({ trip: tripJson({ startDate: '2027-01-02', endDate: '2027-01-01' }) });
    expect(issuesOf(raw)).toMatch(/endDate/);
  });

  test('rejects an itinerary day outside the trip dates', () => {
    const raw = bundleJson({ itinerary: itineraryJson({ days: [{ date: '2027-02-01', activities: [] }] }) });
    expect(issuesOf(raw)).toMatch(/2027-02-01.*outside/);
  });

  test('rejects duplicate itinerary days', () => {
    const day = { date: '2026-12-30', activities: [] };
    const raw = bundleJson({ itinerary: itineraryJson({ days: [day, day] }) });
    expect(issuesOf(raw)).toMatch(/duplicate day 2026-12-30/i);
  });

  test('rejects a non-http link (e.g. javascript:)', () => {
    const raw = bundleJson({
      itinerary: itineraryJson({
        days: [{ date: '2026-12-30', activities: [{ title: { en: 'x' }, url: 'javascript:alert(1)' }] }],
      }),
    });
    expect(issuesOf(raw)).toMatch(/url/);
  });

  test('rejects text without an English version', () => {
    const raw = bundleJson({ trip: tripJson({ title: { el: 'Ταξίδι' } }) });
    expect(issuesOf(raw)).toMatch(/title\.en/);
  });

  test('rejects a malformed slug and invalid dates', () => {
    expect(issuesOf(bundleJson({ trip: tripJson({ slug: 'Not A Slug' }) }))).toMatch(/slug/);
    expect(issuesOf(bundleJson({ trip: tripJson({ startDate: '30/12/2026' }) }))).toMatch(/startDate/);
  });

  test('names the trip in the error message', () => {
    expect(issuesOf(bundleJson({ trip: tripJson({ localCurrency: 'euro' }) }))).toMatch(/test-trip/);
  });
});

describe('localize', () => {
  test('returns the requested language when present', () => {
    expect(localize({ en: 'Hello', el: 'Γεια' }, 'el')).toBe('Γεια');
  });

  test('falls back to English when the language is missing', () => {
    expect(localize({ en: 'Hello' }, 'fr')).toBe('Hello');
  });

  test('handles region codes like en-GB', () => {
    expect(localize({ en: 'Hello', el: 'Γεια' }, 'el-GR')).toBe('Γεια');
  });
});
