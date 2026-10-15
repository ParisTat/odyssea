import type { Expense, Traveller } from './schemas';

export const HOME_CURRENCY = 'EUR';

export interface PersonSummary {
  travellerId: string;
  paidCents: number;
  shareCents: number;
  /** Positive: the others owe this person. Negative: this person owes. */
  balanceCents: number;
}

export interface BudgetSummary {
  totalCents: number;
  people: PersonSummary[];
}

export interface Balance {
  travellerId: string;
  balanceCents: number;
}

export interface Transfer {
  from: string;
  to: string;
  amountCents: number;
}

/** Number of minor-unit digits for a currency (2 for EUR, 0 for JPY). */
export function minorUnitDigits(currency: string): number {
  return new Intl.NumberFormat('en', { style: 'currency', currency }).resolvedOptions().maximumFractionDigits ?? 2;
}

/** Converts an expense to EUR cents using the rate stored with it. */
export function toEurCents(expense: Expense): number {
  if (expense.currency === HOME_CURRENCY) {
    return expense.amountMinor;
  }
  if (expense.rateToEur === undefined) {
    throw new Error(`Expense "${expense.id}" in ${expense.currency} has no rateToEur`);
  }
  const major = expense.amountMinor / 10 ** minorUnitDigits(expense.currency);
  return Math.round((major / expense.rateToEur) * 100);
}

/** Splits cents evenly; the first participants absorb the leftover cents so the parts add up exactly. */
function splitEvenly(totalCents: number, participantIds: string[]): Map<string, number> {
  const base = Math.floor(totalCents / participantIds.length);
  const remainder = totalCents - base * participantIds.length;
  return new Map(participantIds.map((id, index) => [id, base + (index < remainder ? 1 : 0)]));
}

export function summarizeBudget(expenses: Expense[], travellers: Traveller[]): BudgetSummary {
  const paid = new Map<string, number>();
  const share = new Map<string, number>();
  const add = (map: Map<string, number>, id: string, cents: number) => map.set(id, (map.get(id) ?? 0) + cents);

  let totalCents = 0;
  for (const expense of expenses) {
    const cents = toEurCents(expense);
    totalCents += cents;
    add(paid, expense.paidBy, cents);
    splitEvenly(cents, expense.splitWith).forEach((cut, id) => add(share, id, cut));
  }

  const people = travellers.map(({ id }) => {
    const paidCents = paid.get(id) ?? 0;
    const shareCents = share.get(id) ?? 0;
    return { travellerId: id, paidCents, shareCents, balanceCents: paidCents - shareCents };
  });

  return { totalCents, people };
}

/** Greedy settle-up: the biggest debtor pays the biggest creditor until everyone is even. */
export function settleUp(balances: readonly Balance[]): Transfer[] {
  const byAmountDesc = (a: Balance, b: Balance) =>
    b.balanceCents - a.balanceCents || a.travellerId.localeCompare(b.travellerId);
  const creditors = balances.filter((b) => b.balanceCents > 0).map((b) => ({ ...b })).sort(byAmountDesc);
  const debtors = balances
    .filter((b) => b.balanceCents < 0)
    .map((b) => ({ ...b, balanceCents: -b.balanceCents }))
    .sort(byAmountDesc);

  const transfers: Transfer[] = [];
  let c = 0;
  let d = 0;
  while (c < creditors.length && d < debtors.length) {
    const amountCents = Math.min(creditors[c].balanceCents, debtors[d].balanceCents);
    transfers.push({ from: debtors[d].travellerId, to: creditors[c].travellerId, amountCents });
    creditors[c].balanceCents -= amountCents;
    debtors[d].balanceCents -= amountCents;
    if (creditors[c].balanceCents === 0) c += 1;
    if (debtors[d].balanceCents === 0) d += 1;
  }
  return transfers;
}
