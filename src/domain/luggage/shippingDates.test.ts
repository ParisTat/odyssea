import { describe, expect, test } from 'vitest';
import { addBusinessDays } from './businessDays';
import { lastCollectionDay, returnDropOffDeadline, sendByDate } from './shippingDates';

const transit = { minDays: 6, maxDays: 7 };

describe('sendByDate', () => {
  test('counts back the slowest transit from one day before arrival', () => {
    // Arrival Mon 2026-12-14: latest delivery Fri 2026-12-11, minus 7 business days.
    const result = sendByDate({ arrival: '2026-12-14', transit, holdDays: 14 });
    expect(result).toMatchObject({ ok: true, sendBy: '2026-12-02' });
  });

  test('a weekend arrival is counted back from the Friday before', () => {
    expect(sendByDate({ arrival: '2026-12-12', transit, holdDays: null })).toMatchObject({ sendBy: '2026-12-02' });
    expect(sendByDate({ arrival: '2026-12-13', transit, holdDays: null })).toMatchObject({ sendBy: '2026-12-02' });
  });

  test('the earliest send date keeps the parcel held on the arrival day (delivery day is day 1)', () => {
    const result = sendByDate({ arrival: '2026-12-14', transit, holdDays: 14 });
    expect(result).toMatchObject({ ok: true, earliestSend: '2026-11-23' });

    // Sent on the earliest date: delivered Tue 12-01, held through 12-14, the arrival day.
    const delivered = addBusinessDays('2026-11-23', transit.minDays);
    expect(delivered).toBe('2026-12-01');
    expect(lastCollectionDay(delivered, 14) >= '2026-12-14').toBe(true);

    // One business day earlier: delivered Mon 11-30, held only through 12-13, a day short.
    const tooEarly = addBusinessDays('2026-11-20', transit.minDays);
    expect(tooEarly).toBe('2026-11-30');
    expect(lastCollectionDay(tooEarly, 14) >= '2026-12-14').toBe(false);
  });

  test('the hold window is feasible at 5 days and too short at 4', () => {
    expect(sendByDate({ arrival: '2026-12-14', transit, holdDays: 5 })).toMatchObject({
      ok: true,
      earliestSend: '2026-12-02',
      sendBy: '2026-12-02',
    });
    expect(sendByDate({ arrival: '2026-12-14', transit, holdDays: 4 })).toEqual({
      ok: false,
      reason: 'hold-window-too-short',
    });
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
    const result = sendByDate({ arrival: '2026-12-14', transit, holdDays: 14, today: '2026-12-03' });
    expect(result).toEqual({ ok: false, reason: 'already-late' });
  });

  test('is fine when today is on or before the send-by date', () => {
    const result = sendByDate({ arrival: '2026-12-14', transit, holdDays: 14, today: '2026-12-02' });
    expect(result.ok).toBe(true);
  });

  test('accepts a custom buffer', () => {
    // Arrival Tue 2026-12-15: a 2-day buffer rolls back to Fri 2026-12-11, minus 7 business days.
    const result = sendByDate({ arrival: '2026-12-15', transit, holdDays: null, bufferDays: 2 });
    expect(result).toMatchObject({ ok: true, sendBy: '2026-12-02' });
  });

  test('validates its inputs', () => {
    const base = { arrival: '2026-12-14', transit, holdDays: 5 };
    expect(() => sendByDate({ ...base, arrival: '14/12/2026' })).toThrow(RangeError);
    expect(() => sendByDate({ ...base, today: 'soon' })).toThrow(RangeError);
    expect(() => sendByDate({ ...base, bufferDays: 1.5 })).toThrow(RangeError);
    expect(() => sendByDate({ ...base, bufferDays: -1 })).toThrow(RangeError);
    expect(() => sendByDate({ ...base, holdDays: -1 })).toThrow(RangeError);
    expect(() => sendByDate({ ...base, holdDays: 2.5 })).toThrow(RangeError);
    expect(() => sendByDate({ ...base, transit: { minDays: 8, maxDays: 7 } })).toThrow(RangeError);
    expect(() => sendByDate({ ...base, transit: { minDays: 1, maxDays: Infinity } })).toThrow(RangeError);
  });
});

describe('returnDropOffDeadline', () => {
  test('is the departure date, with the delivery window and last collection day', () => {
    const result = returnDropOffDeadline({ departure: '2027-01-04', transit, holdDays: 5 });
    expect(result).toEqual({
      ok: true,
      dropOffBy: '2027-01-04',
      deliveredBetween: { earliest: '2027-01-12', latest: '2027-01-13' },
      collectUntil: '2027-01-16',
    });
  });

  test.each([
    ['Saturday', '2027-01-02'],
    ['Sunday', '2027-01-03'],
  ])('rolls a %s departure back to the Friday', (_day, departure) => {
    const result = returnDropOffDeadline({ departure, transit, holdDays: 5 });
    expect(result).toMatchObject({
      ok: true,
      dropOffBy: '2027-01-01',
      deliveredBetween: { earliest: '2027-01-11', latest: '2027-01-12' },
    });
  });

  test('moves earlier when the traveller needs the bag home by a date', () => {
    const result = returnDropOffDeadline({ departure: '2027-01-04', transit, holdDays: 5, homeBy: '2027-01-08' });
    expect(result).toMatchObject({ ok: true, dropOffBy: '2026-12-30' });
  });

  test('a weekend homeBy counts from the Friday before', () => {
    const result = returnDropOffDeadline({ departure: '2027-01-04', transit, holdDays: 5, homeBy: '2027-01-09' });
    expect(result).toMatchObject({ ok: true, dropOffBy: '2026-12-30' });
  });

  test('a late homeBy does not push the deadline past the departure', () => {
    const result = returnDropOffDeadline({ departure: '2027-01-04', transit, holdDays: 5, homeBy: '2027-03-01' });
    expect(result).toMatchObject({ ok: true, dropOffBy: '2027-01-04' });
  });

  test('reports when the deadline has already passed', () => {
    const result = returnDropOffDeadline({ departure: '2027-01-04', transit, holdDays: 5, today: '2027-01-05' });
    expect(result).toEqual({ ok: false, reason: 'already-late' });
  });

  test('validates its inputs, even when it would return early', () => {
    const base = { departure: '2027-01-04', transit, holdDays: 5 };
    expect(() => returnDropOffDeadline({ ...base, departure: 'nope', today: '2020-01-01' })).toThrow(RangeError);
    expect(() => returnDropOffDeadline({ ...base, homeBy: '2027-13-01' })).toThrow(RangeError);
    expect(() => returnDropOffDeadline({ ...base, today: '' })).toThrow(RangeError);
    expect(() => returnDropOffDeadline({ ...base, holdDays: -1 })).toThrow(RangeError);
    expect(() => returnDropOffDeadline({ ...base, transit: { minDays: 2.5, maxDays: 7 } })).toThrow(RangeError);
  });
});
