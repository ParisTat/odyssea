import { describe, expect, test } from 'vitest';
import { pickActiveTrip, toIsoDate, tripStatus } from './activeTrip';

const trip = (slug: string, startDate: string, endDate: string) => ({ slug, startDate, endDate });

describe('tripStatus', () => {
  const paris = trip('paris', '2026-12-30', '2027-01-04');

  test.each([
    ['2026-12-29', 'upcoming'],
    ['2026-12-30', 'current'],
    ['2027-01-04', 'current'],
    ['2027-01-05', 'past'],
  ])('on %s the trip is %s', (today, status) => {
    expect(tripStatus(paris, today)).toBe(status);
  });
});

describe('pickActiveTrip', () => {
  const past = trip('past', '2026-06-01', '2026-06-05');
  const soon = trip('soon', '2026-12-30', '2027-01-04');
  const later = trip('later', '2027-05-01', '2027-05-10');

  test('returns undefined when there are no trips', () => {
    expect(pickActiveTrip([], '2026-10-15')).toBeUndefined();
  });

  test('prefers the trip happening today', () => {
    expect(pickActiveTrip([past, later, soon], '2026-12-31')?.slug).toBe('soon');
  });

  test('otherwise picks the nearest upcoming trip', () => {
    expect(pickActiveTrip([later, past, soon], '2026-10-15')?.slug).toBe('soon');
  });

  test('otherwise picks the most recent past trip', () => {
    expect(pickActiveTrip([past, soon], '2027-03-01')?.slug).toBe('soon');
  });

  test('picks the most recently started trip when trips overlap', () => {
    const long = trip('long', '2026-12-01', '2027-01-31');
    expect(pickActiveTrip([long, soon], '2027-01-02')?.slug).toBe('soon');
  });
});

describe('toIsoDate', () => {
  test('formats the local calendar date as YYYY-MM-DD', () => {
    expect(toIsoDate(new Date(2027, 0, 4, 23, 59))).toBe('2027-01-04');
    expect(toIsoDate(new Date(2026, 11, 30, 0, 1))).toBe('2026-12-30');
  });
});
