// Synthetic trip data for tests. Builders return fresh objects so tests can't leak changes into each other.

export function tripJson(overrides: Record<string, unknown> = {}) {
  return {
    slug: 'test-trip',
    title: { en: 'Test trip' },
    destination: { en: 'Testville' },
    startDate: '2026-12-30',
    endDate: '2027-01-01',
    localCurrency: 'EUR',
    travellers: [
      { id: 'ana', name: 'Ana' },
      { id: 'bo', name: 'Bo' },
    ],
    ...overrides,
  };
}

export function itineraryJson(overrides: Record<string, unknown> = {}) {
  return {
    days: [
      {
        date: '2026-12-30',
        title: { en: 'Arrival' },
        activities: [{ time: '18:00', title: { en: 'Check in' }, area: { en: 'Old town' } }],
      },
      { date: '2026-12-31', activities: [] },
    ],
    ...overrides,
  };
}

export function expenseJson(overrides: Record<string, unknown> = {}) {
  return {
    id: 'e1',
    date: '2026-12-30',
    description: { en: 'Dinner' },
    amountMinor: 4000,
    currency: 'EUR',
    paidBy: 'ana',
    splitWith: ['ana', 'bo'],
    ...overrides,
  };
}

export function expensesJson(expenses: unknown[] = [expenseJson()]) {
  return { expenses };
}

export function infoJson(overrides: Record<string, unknown> = {}) {
  return {
    sections: [
      {
        id: 'getting-there',
        title: { en: 'Getting there' },
        items: [{ en: 'Take the train.' }],
        sources: [{ label: 'Rail operator', url: 'https://example.com/rail' }],
        checkedOn: '2026-10-15',
      },
    ],
    ...overrides,
  };
}

export function bundleJson(overrides: Partial<Record<'trip' | 'itinerary' | 'expenses' | 'info', unknown>> = {}) {
  return {
    trip: tripJson(),
    itinerary: itineraryJson(),
    expenses: expensesJson(),
    info: infoJson(),
    ...overrides,
  };
}

// Mimics the shape `import.meta.glob('../data/trips/*/*.json', { eager: true, import: 'default' })` returns.
export function globModules(...bundles: ReturnType<typeof bundleJson>[]): Record<string, unknown> {
  return Object.fromEntries(
    bundles.flatMap((bundle) => {
      const slug = (bundle.trip as { slug: string }).slug;
      return (['trip', 'itinerary', 'expenses', 'info'] as const).map((file) => [
        `../data/trips/${slug}/${file}.json`,
        bundle[file],
      ]);
    }),
  );
}
