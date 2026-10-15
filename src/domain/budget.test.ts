import { describe, expect, test } from 'vitest';
import { settleUp, summarizeBudget, toEurCents } from './budget';
import type { Expense, Traveller } from './schemas';

const travellers: Traveller[] = [
  { id: 'ana', name: 'Ana' },
  { id: 'bo', name: 'Bo' },
  { id: 'cy', name: 'Cy' },
];

function expense(overrides: Partial<Expense> = {}): Expense {
  return {
    id: 'e1',
    date: '2026-12-30',
    description: { en: 'Dinner' },
    amountMinor: 1000,
    currency: 'EUR',
    paidBy: 'ana',
    splitWith: ['ana', 'bo'],
    ...overrides,
  };
}

describe('toEurCents', () => {
  test('keeps EUR amounts as they are', () => {
    expect(toEurCents(expense({ amountMinor: 1234 }))).toBe(1234);
  });

  test('converts with the stored rate (1 EUR = rate units)', () => {
    // $12.50 at 1 EUR = 1.1208 USD → €11.1528… → 1115 cents
    expect(toEurCents(expense({ amountMinor: 1250, currency: 'USD', rateToEur: 1.1208 }))).toBe(1115);
  });

  test('respects currencies without minor units (JPY)', () => {
    // ¥1500 at 1 EUR = 160 JPY → €9.375 → 938 cents (rounded half up)
    expect(toEurCents(expense({ amountMinor: 1500, currency: 'JPY', rateToEur: 160 }))).toBe(938);
  });

  test('throws when a non-EUR expense has no rate', () => {
    expect(() => toEurCents(expense({ currency: 'USD' }))).toThrow(/rateToEur/);
  });
});

describe('summarizeBudget', () => {
  test('returns zeros for every traveller when there are no expenses', () => {
    const summary = summarizeBudget([], travellers);

    expect(summary.totalCents).toBe(0);
    expect(summary.people).toHaveLength(3);
    expect(summary.people.every((p) => p.paidCents === 0 && p.shareCents === 0 && p.balanceCents === 0)).toBe(true);
  });

  test('splits an expense evenly between participants', () => {
    const summary = summarizeBudget([expense({ amountMinor: 1000 })], travellers);
    const byId = Object.fromEntries(summary.people.map((p) => [p.travellerId, p]));

    expect(summary.totalCents).toBe(1000);
    expect(byId.ana).toMatchObject({ paidCents: 1000, shareCents: 500, balanceCents: 500 });
    expect(byId.bo).toMatchObject({ paidCents: 0, shareCents: 500, balanceCents: -500 });
    expect(byId.cy).toMatchObject({ paidCents: 0, shareCents: 0, balanceCents: 0 });
  });

  test('gives leftover cents to the first participants so shares add up to the total', () => {
    const summary = summarizeBudget([expense({ amountMinor: 1001, splitWith: ['ana', 'bo', 'cy'] })], travellers);
    const shares = summary.people.map((p) => p.shareCents);

    expect(shares).toEqual([334, 334, 333]);
    expect(shares.reduce((a, b) => a + b, 0)).toBe(1001);
  });

  test('handles a payer who is not part of the split', () => {
    const summary = summarizeBudget([expense({ amountMinor: 900, paidBy: 'ana', splitWith: ['bo'] })], travellers);
    const byId = Object.fromEntries(summary.people.map((p) => [p.travellerId, p]));

    expect(byId.ana.balanceCents).toBe(900);
    expect(byId.bo.balanceCents).toBe(-900);
  });

  test('totals mixed currencies in EUR', () => {
    const summary = summarizeBudget(
      [expense({ amountMinor: 1000 }), expense({ id: 'e2', amountMinor: 1250, currency: 'USD', rateToEur: 1.1208 })],
      travellers,
    );

    expect(summary.totalCents).toBe(2115);
  });

  test('balances always sum to zero', () => {
    const summary = summarizeBudget(
      [
        expense({ amountMinor: 1001, splitWith: ['ana', 'bo', 'cy'] }),
        expense({ id: 'e2', amountMinor: 777, paidBy: 'bo', splitWith: ['bo', 'cy'] }),
      ],
      travellers,
    );

    expect(summary.people.reduce((sum, p) => sum + p.balanceCents, 0)).toBe(0);
  });
});

describe('settleUp', () => {
  test('returns no transfers when everyone is even', () => {
    expect(settleUp([{ travellerId: 'ana', balanceCents: 0 }])).toEqual([]);
  });

  test('pays a single creditor back from one debtor', () => {
    expect(
      settleUp([
        { travellerId: 'ana', balanceCents: 500 },
        { travellerId: 'bo', balanceCents: -500 },
      ]),
    ).toEqual([{ from: 'bo', to: 'ana', amountCents: 500 }]);
  });

  test('settles three people with at most two transfers that cancel every balance', () => {
    const balances = [
      { travellerId: 'ana', balanceCents: 1000 },
      { travellerId: 'bo', balanceCents: -300 },
      { travellerId: 'cy', balanceCents: -700 },
    ];
    const transfers = settleUp(balances);

    expect(transfers).toHaveLength(2);
    const net = Object.fromEntries(balances.map((b) => [b.travellerId, b.balanceCents]));
    for (const t of transfers) {
      net[t.from] += t.amountCents;
      net[t.to] -= t.amountCents;
    }
    expect(Object.values(net).every((v) => v === 0)).toBe(true);
  });

  test('does not mutate its input', () => {
    const balances = [
      { travellerId: 'ana', balanceCents: 500 },
      { travellerId: 'bo', balanceCents: -500 },
    ];
    const copy = structuredClone(balances);
    settleUp(balances);
    expect(balances).toEqual(copy);
  });
});
