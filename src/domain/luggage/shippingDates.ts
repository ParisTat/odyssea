import { addBusinessDays, addDays, rollBack, rollForward } from './businessDays';

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

/** Latest day to post the bag so it is there before arrival, and the earliest so the point does not return it. */
export function sendByDate(input: SendByInput): SendByResult {
  const { arrival, transit, holdDays, bufferDays = 1, today } = input;
  const latestDelivery = rollBack(addDays(arrival, -bufferDays));
  const sendBy = addBusinessDays(latestDelivery, -transit.maxDays);
  const earliestSend =
    holdDays === null ? null : addBusinessDays(rollForward(addDays(arrival, -holdDays)), -transit.minDays);

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
      dropOffBy: string;
      deliveredBetween: { earliest: string; latest: string };
      collectBefore: string;
    }
  | DateFailure;

/** Last day to drop the bag off before flying home, and when it reaches the pickup point. */
export function returnDropOffDeadline(input: ReturnInput): ReturnResult {
  const { departure, transit, holdDays, homeBy, today } = input;
  const needed = homeBy === undefined ? departure : addBusinessDays(rollBack(homeBy), -transit.maxDays);
  const dropOffBy = needed < departure ? needed : departure;
  if (today !== undefined && today > dropOffBy) return { ok: false, reason: 'already-late' };

  const earliest = addBusinessDays(rollForward(dropOffBy), transit.minDays);
  const latest = addBusinessDays(rollForward(dropOffBy), transit.maxDays);
  return { ok: true, dropOffBy, deliveredBetween: { earliest, latest }, collectBefore: addDays(earliest, holdDays) };
}
