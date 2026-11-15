import { describe, expect, test } from 'vitest';
import { returnDropOffDeadline, sendByDate } from './shippingDates';

const transit = { minDays: 6, maxDays: 7 };

describe('sendByDate', () => {
  test('counts back the slowest transit from one day before arrival', () => {
    // Arrival Mon 2026-12-14: latest delivery Fri 2026-12-11, minus 7 business days.
    const result = sendByDate({ arrival: '2026-12-14', transit, holdDays: 14 });
    expect(result).toMatchObject({ ok: true, sendBy: '2026-12-02' });
  });

  test('gives the earliest send date so the parcel does not wait past the hold window', () => {
    const result = sendByDate({ arrival: '2026-12-14', transit, holdDays: 14 });
    // Earliest delivery Mon 2026-11-30 (14 days before), minus 6 business days.
    expect(result).toMatchObject({ ok: true, earliestSend: '2026-11-20' });
  });

  test('has no earliest date when delivery is to an address', () => {
    const result = sendByDate({ arrival: '2026-12-14', transit, holdDays: null });
    expect(result).toMatchObject({ ok: true, earliestSend: null });
  });

  test('reports an impossible hold window', () => {
    const result = sendByDate({ arrival: '2026-12-14', transit: { minDays: 2, maxDays: 7 }, holdDays: 2 });
    expect(result).toEqual({ ok: false, reason: 'hold-window-too-short' });
  });

  test('reports when it is already too late', () => {
    const result = sendByDate({ arrival: '2026-12-14', transit, holdDays: 14, today: '2026-12-09' });
    expect(result).toEqual({ ok: false, reason: 'already-late' });
  });

  test('is fine when today is on or before the send-by date', () => {
    const result = sendByDate({ arrival: '2026-12-14', transit, holdDays: 14, today: '2026-12-02' });
    expect(result.ok).toBe(true);
  });

  test('accepts a custom buffer', () => {
    const result = sendByDate({ arrival: '2026-12-14', transit, holdDays: null, bufferDays: 2 });
    expect(result).toMatchObject({ ok: true, sendBy: '2026-12-01' });
  });
});

describe('returnDropOffDeadline', () => {
  test('is the departure date, with the delivery window and collection deadline', () => {
    const result = returnDropOffDeadline({ departure: '2027-01-04', transit, holdDays: 5 });
    expect(result).toMatchObject({
      ok: true,
      dropOffBy: '2027-01-04',
      deliveredBetween: { earliest: '2027-01-12', latest: '2027-01-13' },
      collectBefore: '2027-01-17',
    });
  });

  test('moves earlier when the traveller needs the bag home by a date', () => {
    const result = returnDropOffDeadline({ departure: '2027-01-04', transit, holdDays: 5, homeBy: '2027-01-08' });
    expect(result).toMatchObject({ ok: true, dropOffBy: '2026-12-29' });
  });

  test('reports when the deadline has already passed', () => {
    const result = returnDropOffDeadline({ departure: '2027-01-04', transit, holdDays: 5, today: '2027-01-05' });
    expect(result).toEqual({ ok: false, reason: 'already-late' });
  });
});
