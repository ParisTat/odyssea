// Dates are ISO strings (YYYY-MM-DD) handled in UTC. Business days are Mon-Fri.
// shortcut: public holidays are ignored, add a per-country holiday list when quotes need to be exact.

const DAY_MS = 86_400_000;
const ISO = /^\d{4}-\d{2}-\d{2}$/;

function parse(date: string): number {
  const ms = ISO.test(date) ? Date.parse(`${date}T00:00:00Z`) : Number.NaN;
  if (Number.isNaN(ms) || new Date(ms).toISOString().slice(0, 10) !== date) {
    throw new RangeError(`Not a valid ISO date: ${date}`);
  }
  return ms;
}

const format = (ms: number): string => new Date(ms).toISOString().slice(0, 10);

export function assertIsoDate(date: string): void {
  parse(date);
}

function assertInteger(count: number): void {
  if (!Number.isInteger(count)) throw new RangeError(`Day count must be an integer, got ${count}`);
}

export function addDays(date: string, days: number): string {
  assertInteger(days);
  return format(parse(date) + days * DAY_MS);
}

export function isBusinessDay(date: string): boolean {
  const day = new Date(parse(date)).getUTCDay();
  return day !== 0 && day !== 6;
}

export function addBusinessDays(date: string, count: number): string {
  assertInteger(count);
  const step = count < 0 ? -1 : 1;
  let current = date;
  for (let left = Math.abs(count); left > 0; ) {
    current = addDays(current, step);
    if (isBusinessDay(current)) left -= 1;
  }
  return current;
}

/** The same day if it is a business day, else the previous one. */
export function rollBack(date: string): string {
  return isBusinessDay(date) ? date : rollBack(addDays(date, -1));
}

/** The same day if it is a business day, else the next one. */
export function rollForward(date: string): string {
  return isBusinessDay(date) ? date : rollForward(addDays(date, 1));
}
