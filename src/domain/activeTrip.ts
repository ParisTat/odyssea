export type TripStatus = 'upcoming' | 'current' | 'past';

interface DatedTrip {
  startDate: string;
  endDate: string;
}

// ISO dates (YYYY-MM-DD) compare correctly as strings, so no Date parsing is needed.

export function tripStatus(trip: DatedTrip, today: string): TripStatus {
  if (today < trip.startDate) return 'upcoming';
  if (today > trip.endDate) return 'past';
  return 'current';
}

/** The trip to show on the home page: happening now, else the next one, else the most recent one. */
export function pickActiveTrip<T extends DatedTrip>(trips: readonly T[], today: string): T | undefined {
  const latestStartFirst = [...trips].sort((a, b) => b.startDate.localeCompare(a.startDate));

  const current = latestStartFirst.find((trip) => tripStatus(trip, today) === 'current');
  if (current) return current;

  const upcoming = latestStartFirst.filter((trip) => tripStatus(trip, today) === 'upcoming');
  if (upcoming.length > 0) return upcoming[upcoming.length - 1];

  return [...trips].sort((a, b) => b.endDate.localeCompare(a.endDate))[0];
}

/** Today's date in the viewer's local time zone as YYYY-MM-DD. */
export function toIsoDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
