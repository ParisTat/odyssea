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

// Tolerance for float noise, so 14.000000000000004 hundredths is not rounded up to 15.
const EPSILON = 1e-9;

/** Couriers charge for the larger of the real weight and L x W x H / divisor. */
export function chargeableWeight(bag: Bag, divisor: number = DEFAULT_VOLUMETRIC_DIVISOR): ChargeableWeight {
  const values = [bag.lengthCm, bag.widthCm, bag.heightCm, bag.actualKg, divisor];
  if (!values.every((v) => Number.isFinite(v) && v > 0)) {
    throw new RangeError('Bag size, weight and divisor must be positive numbers');
  }
  // Couriers round up, so the volumetric weight is rounded up to 0.01 kg.
  const volumetricKg = Math.ceil((bag.lengthCm * bag.widthCm * bag.heightCm * 100) / divisor - EPSILON) / 100;
  return volumetricKg > bag.actualKg
    ? { volumetricKg, chargeableKg: volumetricKg, basis: 'volumetric' }
    : { volumetricKg, chargeableKg: bag.actualKg, basis: 'actual' };
}
