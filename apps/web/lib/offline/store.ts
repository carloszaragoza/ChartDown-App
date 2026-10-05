import type { SetSong } from "../sets/song";

/** What `set_bundle` returns: everything a person sees in a set, to read with no internet. */
export interface SetBundle {
  set: {
    id: string;
    name: string;
    type: "rehearsal" | "service" | "concert";
    date: string | null;
    time: string | null;
    band: string;
    personal: boolean;
  };
  lineup: { name: string; role: "md" | "musician"; instruments: string[] }[];
  songs: SetSong[];
  /** The charts the notes were anchored to, by revision id. */
  anchored: Record<string, string>;
  stamp: string;
}

// Downloaded sets live in Cache Storage, next to the service worker's own cache (T-902).
const CACHE = "chartdown-sets-v1";
const BUNDLES = "/offline/bundles/";
/** The reader's page, stored so it opens with no internet (the service worker serves it). */
export const READER = "/offline/set";

const available = () => typeof caches !== "undefined";

/**
 * Downloads a set's bundle and keeps it with the reader and the files the reader needs.
 * Returns the bundle, or null if the set could not be downloaded.
 */
export async function downloadSet(setId: string): Promise<SetBundle | null> {
  if (!available()) return null;
  const response = await fetch(`/api/sets/${setId}/bundle`, { cache: "no-store" });
  if (!response.ok) return null;
  const bundle = (await response.json()) as SetBundle;
  const cache = await caches.open(CACHE);
  await cache.put(
    `${BUNDLES}${setId}`,
    new Response(JSON.stringify(bundle), { headers: { "Content-Type": "application/json" } }),
  );
  // The reader's page and the scripts and styles it loads, which the service worker keeps.
  const reader = await fetch(READER, { cache: "no-store" });
  if (reader.ok) {
    const html = await reader.clone().text();
    await cache.put(READER, reader);
    const files = new Set(html.match(/\/_next\/static\/[^"'\s)]+/g) ?? []);
    await Promise.all([...files].map((file) => fetch(file).catch(() => undefined)));
  }
  return bundle;
}

export async function storedSet(setId: string): Promise<SetBundle | null> {
  if (!available()) return null;
  const response = await (await caches.open(CACHE)).match(`${BUNDLES}${setId}`);
  return response ? ((await response.json()) as SetBundle) : null;
}

export async function storedSets(): Promise<SetBundle[]> {
  if (!available()) return [];
  const cache = await caches.open(CACHE);
  const keys = (await cache.keys()).filter((request) =>
    new URL(request.url).pathname.startsWith(BUNDLES),
  );
  const bundles = await Promise.all(keys.map(async (key) => (await cache.match(key))?.json()));
  return (bundles.filter(Boolean) as SetBundle[]).sort((a, b) =>
    (a.set.date ?? "9999").localeCompare(b.set.date ?? "9999"),
  );
}

/** Forgets every downloaded set on this device, as signing out does (T-902). */
export async function forgetSets(): Promise<void> {
  if (available()) await caches.delete(CACHE);
}
