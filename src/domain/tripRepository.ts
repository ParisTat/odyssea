import type { Trip, TripBundle } from './schemas';

/**
 * The only way pages read trip data. Today it's backed by JSON files (jsonTripRepository);
 * a Firebase implementation can replace it later without touching pages or components.
 */
export interface TripRepository {
  /** All trips, sorted by start date. */
  listTrips(): Promise<Trip[]>;
  /** Everything for one trip, or null if the slug doesn't exist. */
  getTripBundle(slug: string): Promise<TripBundle | null>;
}
