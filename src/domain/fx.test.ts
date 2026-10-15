import { describe, expect, test, vi } from 'vitest';
import { FX_LATEST_URL, FxError, fetchEurRate } from './fx';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

describe('fetchEurRate', () => {
  test('requests the EUR-based rate and returns it with its date', async () => {
    const fetchFn = vi.fn(async () =>
      jsonResponse({ amount: 1, base: 'EUR', date: '2026-10-15', rates: { USD: 1.1208 } }),
    );

    const result = await fetchEurRate('USD', { fetchFn });

    expect(result).toEqual({ currency: 'USD', rate: 1.1208, date: '2026-10-15' });
    expect(fetchFn).toHaveBeenCalledTimes(1);
    const [url] = fetchFn.mock.calls[0] as unknown as [string];
    expect(url).toBe(`${FX_LATEST_URL}?base=EUR&symbols=USD`);
  });

  test('returns a rate of 1 for EUR without a network call', async () => {
    const fetchFn = vi.fn();
    const result = await fetchEurRate('EUR', { fetchFn, today: '2026-10-15' });

    expect(result).toEqual({ currency: 'EUR', rate: 1, date: '2026-10-15' });
    expect(fetchFn).not.toHaveBeenCalled();
  });

  test('rejects an invalid currency code without a network call', async () => {
    const fetchFn = vi.fn();
    await expect(fetchEurRate('usd&x=1', { fetchFn })).rejects.toBeInstanceOf(FxError);
    expect(fetchFn).not.toHaveBeenCalled();
  });

  test('fails with FxError on an HTTP error', async () => {
    const fetchFn = vi.fn(async () => jsonResponse({ message: 'not found' }, 404));
    await expect(fetchEurRate('XXX', { fetchFn })).rejects.toThrow(FxError);
  });

  test('fails with FxError on an unexpected payload', async () => {
    const fetchFn = vi.fn(async () => jsonResponse({ base: 'EUR', rates: { USD: 'lots' } }));
    await expect(fetchEurRate('USD', { fetchFn })).rejects.toThrow(FxError);
  });

  test('fails with FxError when the payload lacks the requested currency', async () => {
    const fetchFn = vi.fn(async () => jsonResponse({ amount: 1, base: 'EUR', date: '2026-10-15', rates: {} }));
    await expect(fetchEurRate('USD', { fetchFn })).rejects.toThrow(FxError);
  });

  test('fails with FxError when the network call fails', async () => {
    const fetchFn = vi.fn(async () => {
      throw new TypeError('Failed to fetch');
    });
    await expect(fetchEurRate('USD', { fetchFn })).rejects.toThrow(FxError);
  });

  test('times out slow responses', async () => {
    const fetchFn = vi.fn(
      (_url: string, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
        }),
    );

    await expect(fetchEurRate('USD', { fetchFn, timeoutMs: 10 })).rejects.toThrow(/timed out/i);
  });
});
