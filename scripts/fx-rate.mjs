// Prints today's ECB reference rate so it can be stored as `rateToEur` on a new expense.
// Usage: npm run fx -- USD
// Mirrors src/domain/fx.ts (kept standalone so it runs in plain Node without a build step).

const FX_LATEST_URL = 'https://api.frankfurter.dev/v1/latest';
const TIMEOUT_MS = 5000;

const currency = (process.argv[2] ?? '').toUpperCase();
if (!/^[A-Z]{3}$/.test(currency) || currency === 'EUR') {
  console.error('Usage: npm run fx -- <CURRENCY>   e.g. npm run fx -- USD (EUR needs no rate)');
  process.exit(1);
}

try {
  const response = await fetch(`${FX_LATEST_URL}?base=EUR&symbols=${currency}`, {
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!response.ok) {
    throw new Error(`service answered ${response.status} (is "${currency}" an ECB currency?)`);
  }
  const body = await response.json();
  const rate = body?.rates?.[currency];
  if (typeof rate !== 'number' || rate <= 0 || typeof body.date !== 'string') {
    throw new Error('unexpected response shape');
  }
  console.log(`1 EUR = ${rate} ${currency} (ECB, ${body.date})`);
  console.log(`Add to the expense:  "currency": "${currency}", "rateToEur": ${rate}`);
} catch (error) {
  console.error(`Could not fetch the rate: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
