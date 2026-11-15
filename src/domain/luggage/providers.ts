import { z } from 'zod';

const IsoDate = z.iso.date();
const Cents = z.number().int().nonnegative();
const Positive = z.number().positive();
const Dims = z.tuple([Positive, Positive, Positive]);

const TransitSchema = z
  .object({ minDays: z.number().int().nonnegative(), maxDays: z.number().int().positive() })
  .refine((t) => t.minDays <= t.maxDays, 'minDays must not exceed maxDays');

const WeightBandsSchema = z.object({
  kind: z.literal('weight-bands'),
  bands: z
    .array(z.object({ upToKg: Positive, priceCents: Cents }))
    .min(1)
    .refine((bands) => bands.every((b, i) => i === 0 || b.upToKg > bands[i - 1].upToKg), 'bands must be sorted by upToKg'),
});

const LockerSizesSchema = z.object({
  kind: z.literal('locker-sizes'),
  sizes: z
    .array(
      z.object({
        id: z.string().min(1),
        dimsCm: Dims,
        maxKg: Positive,
        /** null = price not known yet; the size is skipped when comparing. */
        priceCents: Cents.nullable(),
      }),
    )
    .min(1),
});

const RouteSchema = z.object({
  direction: z.enum(['outbound', 'return']),
  from: z.string().length(2),
  to: z.string().length(2),
  dropOff: z.enum(['point', 'address']),
  delivery: z.enum(['point', 'address']),
  transit: TransitSchema,
  /** Largest bag a parcel locker takes; a bigger one needs a staffed shop. */
  lockerLimit: z.object({ dimsCm: Dims, maxKg: Positive }).optional(),
  pricing: z.discriminatedUnion('kind', [WeightBandsSchema, LockerSizesSchema]),
});

const ProviderSchema = z.object({
  id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  name: z.string().min(1),
  volumetricDivisor: Positive,
  maxKg: Positive,
  pickupHoldDays: z.number().int().nonnegative(),
  trustpilot: z.object({ score: z.number().min(0).max(5), reviews: z.number().int().nonnegative() }).optional(),
  notes: z.string().optional(),
  /** The date every price and limit of this provider was last checked. */
  checkedOn: IsoDate,
  routes: z.array(RouteSchema).min(1),
});

export const ProvidersSchema = z.array(ProviderSchema).min(1);
export type Provider = z.infer<typeof ProviderSchema>;
export type Route = z.infer<typeof RouteSchema>;
export type Direction = Route['direction'];

export function parseProviders(data: unknown): Provider[] {
  return ProvidersSchema.parse(data);
}
