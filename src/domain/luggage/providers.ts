import { z } from 'zod';

const IsoDate = z.iso.date();
const Cents = z.number().int().nonnegative();
const Positive = z.number().positive();
const Dims = z.tuple([Positive, Positive, Positive]);
const CountryCode = z.string().regex(/^[A-Z]{2}$/, 'Use an uppercase 2-letter country code, e.g. GR');

const TransitSchema = z
  .strictObject({ minDays: z.number().int().nonnegative(), maxDays: z.number().int().positive() })
  .refine((t) => t.minDays <= t.maxDays, 'minDays must not exceed maxDays');

const WeightBandsSchema = z.strictObject({
  kind: z.literal('weight-bands'),
  bands: z
    .array(z.strictObject({ upToKg: Positive, priceCents: Cents }))
    .min(1)
    .refine((bands) => bands.every((b, i) => i === 0 || b.upToKg > bands[i - 1].upToKg), 'bands must be sorted by upToKg'),
});

const LockerSizesSchema = z.strictObject({
  kind: z.literal('locker-sizes'),
  sizes: z
    .array(
      z.strictObject({
        id: z.string().min(1),
        dimsCm: Dims,
        maxKg: Positive,
        /** null = price not known yet; the size is skipped when comparing. */
        priceCents: Cents.nullable(),
      }),
    )
    .min(1),
});

const RouteSchema = z.strictObject({
  direction: z.enum(['outbound', 'return']),
  from: CountryCode,
  to: CountryCode,
  dropOff: z.enum(['point', 'address']),
  delivery: z.enum(['point', 'address']),
  transit: TransitSchema,
  /** Largest bag a parcel locker takes; a bigger one needs a staffed shop. */
  lockerLimit: z.strictObject({ dimsCm: Dims, maxKg: Positive }).optional(),
  pricing: z.discriminatedUnion('kind', [WeightBandsSchema, LockerSizesSchema]),
});

const ProviderSchema = z
  .strictObject({
    id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    name: z.string().min(1),
    volumetricDivisor: Positive,
    maxKg: Positive,
    pickupHoldDays: z.number().int().nonnegative(),
    trustpilot: z
      .strictObject({ score: z.number().min(0).max(5), reviews: z.number().int().nonnegative() })
      .optional(),
    notes: z.string().optional(),
    /** The date every price and limit of this provider was last checked. */
    checkedOn: IsoDate,
    routes: z.array(RouteSchema).min(1),
  })
  .superRefine((provider, ctx) => {
    const seen = new Set<string>();
    for (const route of provider.routes) {
      const key = `${route.direction}:${route.from}:${route.to}`;
      if (seen.has(key)) ctx.addIssue({ code: 'custom', message: `Duplicate route ${key}`, path: ['routes'] });
      seen.add(key);
      if (route.pricing.kind === 'weight-bands' && route.pricing.bands.at(-1)!.upToKg > provider.maxKg) {
        ctx.addIssue({ code: 'custom', message: 'maxKg is below the last weight band', path: ['maxKg'] });
      }
    }
  });

export const ProvidersSchema = z
  .array(ProviderSchema)
  .min(1)
  .refine((providers) => new Set(providers.map((p) => p.id)).size === providers.length, 'Provider ids must be unique');
export type Provider = z.infer<typeof ProviderSchema>;
export type Route = z.infer<typeof RouteSchema>;
export type Direction = Route['direction'];

export function parseProviders(data: unknown): Provider[] {
  return ProvidersSchema.parse(data);
}
