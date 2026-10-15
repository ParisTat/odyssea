import { z } from 'zod';

// ---- Building blocks -------------------------------------------------------

/** Text in several languages. English is required and is the fallback. */
export const LocalizedTextSchema = z.object({ en: z.string().min(1) }).catchall(z.string());
export type LocalizedText = z.infer<typeof LocalizedTextSchema>;

const IsoDate = z.iso.date();
const CurrencyCode = z.string().regex(/^[A-Z]{3}$/, 'Use a 3-letter ISO currency code, e.g. EUR');
const Id = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase letters, digits and dashes');
// Only http(s) links, so data can never smuggle in javascript: or data: URLs.
const SafeUrl = z.url({ protocol: /^https?$/ });

// ---- Trip ------------------------------------------------------------------

export const TravellerSchema = z.object({
  id: Id,
  name: z.string().min(1).max(40),
});
export type Traveller = z.infer<typeof TravellerSchema>;

export const TripSchema = z
  .object({
    slug: Id,
    title: LocalizedTextSchema,
    destination: LocalizedTextSchema,
    summary: LocalizedTextSchema.optional(),
    startDate: IsoDate,
    endDate: IsoDate,
    localCurrency: CurrencyCode,
    travellers: z.array(TravellerSchema).min(1),
  })
  .superRefine((trip, ctx) => {
    if (trip.endDate < trip.startDate) {
      ctx.addIssue({ code: 'custom', path: ['endDate'], message: 'endDate must be on or after startDate' });
    }
    reportDuplicates(trip.travellers.map((t) => t.id), ['travellers'], ctx, (id) => `duplicate traveller id "${id}"`);
  });
export type Trip = z.infer<typeof TripSchema>;

// ---- Itinerary -------------------------------------------------------------

export const ActivitySchema = z.object({
  time: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use 24h HH:MM')
    .optional(),
  title: LocalizedTextSchema,
  area: LocalizedTextSchema.optional(),
  url: SafeUrl.optional(),
  notes: LocalizedTextSchema.optional(),
});
export type Activity = z.infer<typeof ActivitySchema>;

export const DaySchema = z.object({
  date: IsoDate,
  title: LocalizedTextSchema.optional(),
  notes: LocalizedTextSchema.optional(),
  activities: z.array(ActivitySchema).default([]),
});
export type Day = z.infer<typeof DaySchema>;

export const ItinerarySchema = z.object({ days: z.array(DaySchema) });
export type Itinerary = z.infer<typeof ItinerarySchema>;

// ---- Expenses --------------------------------------------------------------

export const ExpenseSchema = z
  .object({
    id: Id,
    date: IsoDate,
    description: LocalizedTextSchema,
    /** Amount in the currency's minor units (cents for EUR/USD, whole yen for JPY). */
    amountMinor: z.number().int().positive(),
    currency: CurrencyCode,
    /** 1 EUR = rateToEur units of `currency`, stored when the expense was added. */
    rateToEur: z.number().positive().optional(),
    paidBy: Id,
    splitWith: z.array(Id).min(1),
  })
  .superRefine((expense, ctx) => {
    if (expense.currency !== 'EUR' && expense.rateToEur === undefined) {
      ctx.addIssue({
        code: 'custom',
        path: ['rateToEur'],
        message: 'rateToEur is required for non-EUR expenses (run `npm run fx -- CODE`)',
      });
    }
  });
export type Expense = z.infer<typeof ExpenseSchema>;

export const ExpensesFileSchema = z.object({ expenses: z.array(ExpenseSchema) });

// ---- Practical info --------------------------------------------------------

export const InfoSectionSchema = z.object({
  id: Id,
  title: LocalizedTextSchema,
  items: z.array(LocalizedTextSchema).min(1),
  sources: z.array(z.object({ label: z.string().min(1), url: SafeUrl })).default([]),
  checkedOn: IsoDate.optional(),
});
export type InfoSection = z.infer<typeof InfoSectionSchema>;

export const InfoSchema = z.object({ sections: z.array(InfoSectionSchema) });
export type Info = z.infer<typeof InfoSchema>;

// ---- Bundle (one trip folder) ------------------------------------------------

const RawBundleSchema = z
  .object({
    trip: TripSchema,
    itinerary: ItinerarySchema,
    expenses: ExpensesFileSchema,
    info: InfoSchema,
  })
  .superRefine((bundle, ctx) => {
    const { startDate, endDate } = bundle.trip;
    bundle.itinerary.days.forEach((day, i) => {
      if (day.date < startDate || day.date > endDate) {
        ctx.addIssue({
          code: 'custom',
          path: ['itinerary', 'days', i, 'date'],
          message: `day ${day.date} is outside the trip dates (${startDate} – ${endDate})`,
        });
      }
    });
    reportDuplicates(bundle.itinerary.days.map((d) => d.date), ['itinerary', 'days'], ctx, (d) => `duplicate day ${d}`);

    const travellerIds = new Set(bundle.trip.travellers.map((t) => t.id));
    bundle.expenses.expenses.forEach((expense, i) => {
      const path = ['expenses', 'expenses', i];
      if (!travellerIds.has(expense.paidBy)) {
        ctx.addIssue({ code: 'custom', path: [...path, 'paidBy'], message: `paidBy: unknown traveller "${expense.paidBy}"` });
      }
      expense.splitWith
        .filter((id) => !travellerIds.has(id))
        .forEach((id) => {
          ctx.addIssue({ code: 'custom', path: [...path, 'splitWith'], message: `splitWith: unknown traveller "${id}"` });
        });
    });
    reportDuplicates(
      bundle.expenses.expenses.map((e) => e.id),
      ['expenses', 'expenses'],
      ctx,
      (id) => `duplicate expense id "${id}"`,
    );
  });

export interface TripBundle {
  trip: Trip;
  itinerary: Itinerary;
  expenses: Expense[];
  info: Info;
}

export class TripDataError extends Error {
  constructor(slug: string, details: string) {
    super(`Invalid trip data in "${slug}":\n${details}`);
    this.name = 'TripDataError';
  }
}

/** Validates one trip folder's files together, including cross-file references. Throws TripDataError. */
export function parseTripBundle(raw: unknown, slug: string): TripBundle {
  const result = RawBundleSchema.safeParse(raw);
  if (!result.success) {
    throw new TripDataError(slug, z.prettifyError(result.error));
  }
  const { trip, itinerary, expenses, info } = result.data;
  return { trip, itinerary, expenses: expenses.expenses, info };
}

/** Picks the text for a language (`el`, `el-GR`), falling back to English. */
export function localize(text: LocalizedText, language: string): string {
  const base = language.split('-')[0];
  return text[language] ?? text[base] ?? text.en;
}

function reportDuplicates(
  values: string[],
  path: (string | number)[],
  ctx: z.RefinementCtx,
  describe: (value: string) => string,
): void {
  const seen = new Set<string>();
  values.forEach((value) => {
    if (seen.has(value)) {
      ctx.addIssue({ code: 'custom', path, message: describe(value) });
    }
    seen.add(value);
  });
}
