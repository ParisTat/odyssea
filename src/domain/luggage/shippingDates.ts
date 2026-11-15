import { addBusinessDays, addDays, assertIsoDate, rollBack, rollForward } from './businessDays';

export interface Transit {
  minDays: number;
  maxDays: number;
}

export type DateFailure = { ok: false; reason: 'hold-window-too-short' | 'already-late' };

export interface SendByInput {
  arrival: string;
  transit: Transit;
  /** Days the pickup point keeps the parcel; null when it is delivered to an address. */
  holdDays: number | null;
  /** Calendar days the parcel should arrive before the traveller. */
  bufferDays?: number;
  today?: string;
}

export type SendByResult = { ok: true; sendBy: string; earliestSend: string | null } | DateFailure;

function assertCount(name: string, value: number): void {
  if (!Number.isInteger(value) || value < 0) throw new RangeError(`${name} must be a non-negative integer`);
}

function assertTransit(transit: Transit): void {
  assertCount('transit.minDays', transit.minDays);
  assertCount('transit.maxDays', transit.maxDays);
  if (transit.minDays > transit.maxDays) throw new RangeError('transit.minDays must not exceed transit.maxDays');
}

/**
 * Hold semantics: the day of delivery counts as day 1, so a parcel delivered on D with a hold of N days
 * is still held on D + N - 1. For it to be there on `needed`, it must be delivered on or after
 * needed - (N - 1), and delivery only happens on business days.
 */
export function earliestDeliveryForHold(needed: string, holdDays: number): string {
  return rollForward(addDays(needed, -(holdDays - 1)));
}

/** The last day a parcel delivered on `deliveredOn` is still held (inclusive). */
export function lastCollectionDay(deliveredOn: string, holdDays: number): string {
  return addDays(deliveredOn, holdDays - 1);
}

/** Latest day to post the bag so it is there before arrival, and the earliest so the point does not return it. */
export function sendByDate(input: SendByInput): SendByResult {
  const { arrival, transit, holdDays, bufferDays = 1, today } = input;
  assertIsoDate(arrival);
  if (today !== undefined) assertIsoDate(today);
  assertTransit(transit);
  assertCount('bufferDays', bufferDays);
  if (holdDays !== null) assertCount('holdDays', holdDays);

  const latestDelivery = rollBack(addDays(arrival, -bufferDays));
  const sendBy = addBusinessDays(latestDelivery, -transit.maxDays);
  const earliestSend =
    holdDays === null ? null : addBusinessDays(earliestDeliveryForHold(arrival, holdDays), -transit.minDays);

  if (earliestSend !== null && earliestSend > sendBy) return { ok: false, reason: 'hold-window-too-short' };
  if (today !== undefined && today > sendBy) return { ok: false, reason: 'already-late' };
  return { ok: true, sendBy, earliestSend };
}

export interface ReturnInput {
  departure: string;
  transit: Transit;
  /** Days the pickup point at home keeps the parcel. */
  holdDays: number;
  /** Optional date by which the bag must be back. */
  homeBy?: string;
  today?: string;
}

export type ReturnResult =
  | {
      ok: true;
      /** Always a business day. */
      dropOffBy: string;
      deliveredBetween: { earliest: string; latest: string };
      /** Last day (inclusive) the parcel is still held, if it arrives at the earliest date. */
      collectUntil: string;
    }
  | DateFailure;

/** Last day to drop the bag off before flying home, and when it reaches the pickup point. */
export function returnDropOffDeadline(input: ReturnInput): ReturnResult {
  const { departure, transit, holdDays, homeBy, today } = input;
  assertIsoDate(departure);
  if (homeBy !== undefined) assertIsoDate(homeBy);
  if (today !== undefined) assertIsoDate(today);
  assertTransit(transit);
  assertCount('holdDays', holdDays);

  const needed = homeBy === undefined ? departure : addBusinessDays(rollBack(homeBy), -transit.maxDays);
  const dropOffBy = rollBack(needed < departure ? needed : departure);
  if (today !== undefined && today > dropOffBy) return { ok: false, reason: 'already-late' };

  const earliest = addBusinessDays(dropOffBy, transit.minDays);
  const latest = addBusinessDays(dropOffBy, transit.maxDays);
  return { ok: true, dropOffBy, deliveredBetween: { earliest, latest }, collectUntil: lastCollectionDay(earliest, holdDays) };
}
