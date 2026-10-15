import { z } from 'zod';
import { toIsoDate } from './activeTrip';

// Frankfurter: free ECB reference rates, no API key, CORS enabled. Must match the CSP connect-src in vite.config.ts.
export const FX_LATEST_URL = 'https://api.frankfurter.dev/v1/latest';
const DEFAULT_TIMEOUT_MS = 5000;

const LatestResponseSchema = z.object({
  base: z.literal('EUR'),
  date: z.iso.date(),
  rates: z.record(z.string(), z.number().positive()),
});

export interface FxRate {
  currency: string;
  /** 1 EUR = rate units of `currency`. */
  rate: number;
  /** ECB reference date of the rate. */
  date: string;
}

export interface FetchRateOptions {
  fetchFn?: (url: string, init?: RequestInit) => Promise<Response>;
  timeoutMs?: number;
  signal?: AbortSignal;
  today?: string;
}

export class FxError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'FxError';
  }
}

export async function fetchEurRate(currency: string, options: FetchRateOptions = {}): Promise<FxRate> {
  const { fetchFn = fetch, timeoutMs = DEFAULT_TIMEOUT_MS, signal, today = toIsoDate(new Date()) } = options;

  if (!/^[A-Z]{3}$/.test(currency)) {
    throw new FxError(`Invalid currency code "${currency}"`);
  }
  if (currency === 'EUR') {
    return { currency, rate: 1, date: today };
  }

  const timeout = AbortSignal.timeout(timeoutMs);
  const combined = signal ? AbortSignal.any([signal, timeout]) : timeout;
  const url = `${FX_LATEST_URL}?base=EUR&symbols=${currency}`;

  let response: Response;
  try {
    response = await fetchFn(url, { signal: combined });
  } catch (error: unknown) {
    if (timeout.aborted) throw new FxError(`Exchange-rate request timed out after ${timeoutMs} ms`, { cause: error });
    throw new FxError('Exchange-rate service unreachable', { cause: error });
  }
  if (!response.ok) {
    throw new FxError(`Exchange-rate service answered ${response.status}`);
  }

  const parsed = LatestResponseSchema.safeParse(await response.json().catch(() => null));
  const rate = parsed.success ? parsed.data.rates[currency] : undefined;
  if (!parsed.success || rate === undefined) {
    throw new FxError(`Unexpected exchange-rate response for ${currency}`);
  }
  return { currency, rate, date: parsed.data.date };
}
