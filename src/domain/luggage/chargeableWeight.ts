export const DEFAULT_VOLUMETRIC_DIVISOR = 5000;

export interface Bag {
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  actualKg: number;
}

export interface ChargeableWeight {
  volumetricKg: number;
  chargeableKg: number;
  basis: 'actual' | 'volumetric';
}

const round2 = (value: number): number => Math.round(value * 100) / 100;

/** Couriers charge for the larger of the real weight and L x W x H / divisor. */
export function chargeableWeight(bag: Bag, divisor: number = DEFAULT_VOLUMETRIC_DIVISOR): ChargeableWeight {
  const values = [bag.lengthCm, bag.widthCm, bag.heightCm, bag.actualKg, divisor];
  if (!values.every((v) => Number.isFinite(v) && v > 0)) {
    throw new RangeError('Bag size, weight and divisor must be positive numbers');
  }
  const volumetricKg = round2((bag.lengthCm * bag.widthCm * bag.heightCm) / divisor);
  return volumetricKg > bag.actualKg
    ? { volumetricKg, chargeableKg: volumetricKg, basis: 'volumetric' }
    : { volumetricKg, chargeableKg: bag.actualKg, basis: 'actual' };
}
