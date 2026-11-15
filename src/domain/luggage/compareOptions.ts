import { type Bag, chargeableWeight } from './chargeableWeight';
import type { Direction, Provider, Route } from './providers';

export interface AirlineFees {
  outboundCents: number;
  returnCents: number;
}

export type ExclusionReason = 'over-max-weight' | 'no-fitting-size' | 'no-route';

export interface Leg {
  providerId: string;
  direction: Direction;
  priceCents: number;
  chargeableKg: number;
  sizeId: string | null;
  /** The bag is too big for a parcel locker, so it needs a staffed shop or a door-to-door service. */
  needsShop: boolean;
  pointToPoint: boolean;
  route: Route;
}

export interface Exclusion {
  providerId: string;
  direction: Direction;
  reason: ExclusionReason;
}

export interface Option {
  outbound: Leg;
  return: Leg;
  totalCents: number;
  /** Airline total minus this option's total; negative when shipping is dearer. */
  savingsCents: number;
  notWorthIt: boolean;
  pointToPoint: boolean;
}

export interface Comparison {
  airlineTotalCents: number;
  options: Option[];
  excluded: Exclusion[];
  verdict: 'send' | 'check-bag';
}

export interface CompareInput {
  bag: Bag;
  airline: AirlineFees;
  providers: Provider[];
}

type LegResult = { leg: Leg } | { reason: ExclusionReason };

// Compare the longest side with the longest, and so on, so orientation does not matter.
const fits = (dims: readonly number[], limit: readonly number[]): boolean => {
  const a = [...dims].sort((x, y) => y - x);
  const b = [...limit].sort((x, y) => y - x);
  return a.every((value, i) => value <= b[i]);
};

function priceLeg(provider: Provider, route: Route, bag: Bag): LegResult {
  const { chargeableKg } = chargeableWeight(bag, provider.volumetricDivisor);
  const bagDims = [bag.lengthCm, bag.widthCm, bag.heightCm];
  const { pricing } = route;
  let priceCents: number | undefined;
  let sizeId: string | null = null;
  let reason: ExclusionReason = 'over-max-weight';

  if (pricing.kind === 'weight-bands') {
    if (chargeableKg <= provider.maxKg) priceCents = pricing.bands.find((b) => chargeableKg <= b.upToKg)?.priceCents;
  } else {
    reason = 'no-fitting-size';
    const size = pricing.sizes.find((s) => s.priceCents !== null && bag.actualKg <= s.maxKg && fits(bagDims, s.dimsCm));
    priceCents = size?.priceCents ?? undefined;
    sizeId = size?.id ?? null;
  }
  if (priceCents === undefined) return { reason };

  const { lockerLimit } = route;
  const needsShop = lockerLimit !== undefined && !(fits(bagDims, lockerLimit.dimsCm) && bag.actualKg <= lockerLimit.maxKg);
  return {
    leg: {
      providerId: provider.id,
      direction: route.direction,
      priceCents,
      chargeableKg,
      sizeId,
      needsShop,
      pointToPoint: route.dropOff === 'point' && route.delivery === 'point',
      route,
    },
  };
}

function legsFor(providers: Provider[], bag: Bag, direction: Direction) {
  const legs: Leg[] = [];
  const excluded: Exclusion[] = [];
  for (const provider of providers) {
    const routes = provider.routes.filter((r) => r.direction === direction);
    if (routes.length === 0) excluded.push({ providerId: provider.id, direction, reason: 'no-route' });
    for (const route of routes) {
      const result = priceLeg(provider, route, bag);
      if ('leg' in result) legs.push(result.leg);
      else excluded.push({ providerId: provider.id, direction, reason: result.reason });
    }
  }
  return { legs, excluded };
}

function assertCents(value: number): void {
  if (!Number.isInteger(value) || value < 0) throw new RangeError('Airline fees must be non-negative integer cents');
}

/** Every outbound x return pair is an option (so mixed providers come for free), cheapest first. */
export function compareOptions({ bag, airline, providers }: CompareInput): Comparison {
  assertCents(airline.outboundCents);
  assertCents(airline.returnCents);
  const airlineTotalCents = airline.outboundCents + airline.returnCents;
  const out = legsFor(providers, bag, 'outbound');
  const back = legsFor(providers, bag, 'return');

  const options = out.legs
    .flatMap((outbound) =>
      back.legs.map((ret): Option => {
        const totalCents = outbound.priceCents + ret.priceCents;
        return {
          outbound,
          return: ret,
          totalCents,
          savingsCents: airlineTotalCents - totalCents,
          notWorthIt: totalCents >= airlineTotalCents,
          pointToPoint: outbound.pointToPoint && ret.pointToPoint,
        };
      }),
    )
    .sort((a, b) => a.totalCents - b.totalCents);

  return {
    airlineTotalCents,
    options,
    excluded: [...out.excluded, ...back.excluded],
    verdict: options.some((o) => !o.notWorthIt) ? 'send' : 'check-bag',
  };
}
