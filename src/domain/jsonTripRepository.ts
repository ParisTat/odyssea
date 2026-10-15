import { parseTripBundle, type TripBundle } from './schemas';
import type { TripRepository } from './tripRepository';

const BUNDLE_FILES = ['trip', 'itinerary', 'expenses', 'info'] as const;
type BundleFile = (typeof BUNDLE_FILES)[number];
const MODULE_PATH = /\/trips\/([^/]+)\/(trip|itinerary|expenses|info)\.json$/;

function groupByFolder(modules: Record<string, unknown>): Map<string, Partial<Record<BundleFile, unknown>>> {
  const folders = new Map<string, Partial<Record<BundleFile, unknown>>>();
  for (const [path, content] of Object.entries(modules)) {
    const match = MODULE_PATH.exec(path);
    if (!match) continue;
    const [, folder, file] = match;
    folders.set(folder, { ...folders.get(folder), [file as BundleFile]: content });
  }
  return folders;
}

function loadBundle(folder: string, files: Partial<Record<BundleFile, unknown>>): TripBundle {
  const missing = BUNDLE_FILES.filter((file) => files[file] === undefined);
  if (missing.length > 0) {
    throw new Error(`Trip folder "${folder}" is missing ${missing.map((f) => `${f}.json`).join(', ')}`);
  }
  const bundle = parseTripBundle(files, folder);
  if (bundle.trip.slug !== folder) {
    throw new Error(`Trip folder "${folder}" must match its slug "${bundle.trip.slug}"`);
  }
  return bundle;
}

/** Builds a repository from `import.meta.glob` output. Validates everything up front and fails fast. */
export function createJsonTripRepository(modules: Record<string, unknown>): TripRepository {
  const bundles = new Map(
    [...groupByFolder(modules)].map(([folder, files]) => [folder, loadBundle(folder, files)] as const),
  );
  const trips = [...bundles.values()]
    .map((bundle) => bundle.trip)
    .sort((a, b) => a.startDate.localeCompare(b.startDate));

  return {
    listTrips: async () => trips,
    getTripBundle: async (slug) => bundles.get(slug) ?? null,
  };
}

export const jsonTripRepository = createJsonTripRepository(
  import.meta.glob('../data/trips/*/*.json', { eager: true, import: 'default' }),
);
