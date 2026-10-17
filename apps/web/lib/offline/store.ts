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
  /** The band's recordings of the set's songs (R-06.7); their files are kept with the set. */
  audio?: OfflineRecording[];
}

export interface OfflineRecording {
  bandId: string;
  versionId: string;
  durationMs: number;
  peaks: number[];
  musicStartMs: number;
  /** When it was added: a replaced recording is downloaded again. */
  addedAt: string;
}

// Downloaded sets live in Cache Storage, next to the service worker's own cache (T-902).
const CACHE = "chartdown-sets-v1";
const BUNDLES = "/offline/bundles/";
const AUDIO = "/offline/audio/";

/** Where a band's recording is kept on the device, by its band, version and when it was added. */
export const audioKey = (recording: { bandId: string; versionId: string }) =>
  `${AUDIO}${recording.bandId}/${recording.versionId}`;

/** The band's recording kept on this device, from any download, or null (R-06.7). */
export async function storedAudio(recording: {
  bandId: string;
  versionId: string;
}): Promise<Blob | null> {
  if (!available()) return null;
  const response = await (
    await caches.open(CACHE)
  ).match(audioKey(recording), {
    ignoreSearch: true,
  });
  return response ? response.blob() : null;
}

/**
 * Keeps the set's recordings on the device (R-06.7, T-2604): each one not kept yet, or replaced
 * since, is downloaded from the band's private storage, readable only by its members.
 */
async function keepAudio(cache: Cache, bundle: SetBundle): Promise<void> {
  const recordings = bundle.audio ?? [];
  if (recordings.length === 0) return;
  const { createClient } = await import("../supabase/browser");
  const storage = createClient().storage.from("band-audio");
  for (const recording of recordings) {
    const key = `${audioKey(recording)}?added=${encodeURIComponent(recording.addedAt)}`;
    if (await cache.match(key)) continue;
    const { data } = await storage.download(`${recording.bandId}/${recording.versionId}`);
    if (!data) continue;
    // One copy per recording: a replaced one takes the old one's place.
    await cache.delete(audioKey(recording), { ignoreSearch: true });
    await cache.put(key, new Response(data, { headers: { "Content-Type": data.type } }));
  }
}
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
  await keepAudio(cache, bundle);
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

// What changed in each set since it was downloaded, kept until the person dismisses it (T-903).
const CHANGES = "/offline/changes/";
const REMOVED = "/offline/removed/";
/** Sent on the window once downloaded sets are brought up to date, so notices can refresh. */
export const SYNCED = "chartdown:offline-synced";

const putJson = async (cache: Cache, key: string, value: unknown) =>
  cache.put(
    key,
    new Response(JSON.stringify(value), { headers: { "Content-Type": "application/json" } }),
  );
const readJson = async <T>(cache: Cache, key: string): Promise<T | null> => {
  const response = await cache.match(key);
  return response ? ((await response.json()) as T) : null;
};

/**
 * Brings every downloaded set up to date (R-08.3): a new bundle replaces the kept one when its
 * stamp differs, and what changed is kept for the notice; a set the person can no longer read is
 * removed, with a notice. Returns how many sets changed.
 */
export async function syncSets(): Promise<number> {
  if (!available() || !navigator.onLine) return 0;
  const { setChanges } = await import("./changes");
  const cache = await caches.open(CACHE);
  let changed = 0;
  for (const kept of await storedSets()) {
    const response = await fetch(`/api/sets/${kept.set.id}/bundle`, { cache: "no-store" }).catch(
      () => null,
    );
    if (!response) continue;
    if (response.status === 404) {
      await cache.delete(`${BUNDLES}${kept.set.id}`);
      await cache.delete(`${CHANGES}${kept.set.id}`);
      await putJson(cache, `${REMOVED}${kept.set.id}`, { name: kept.set.name });
      changed += 1;
      continue;
    }
    if (!response.ok) continue;
    const current = (await response.json()) as SetBundle;
    await keepAudio(cache, current);
    const changes = setChanges(kept, current);
    if (current.stamp === kept.stamp) continue;
    const pending = (await readJson<unknown[]>(cache, `${CHANGES}${kept.set.id}`)) ?? [];
    await putJson(cache, `${BUNDLES}${kept.set.id}`, current);
    if (changes.length > 0)
      await putJson(cache, `${CHANGES}${kept.set.id}`, [...pending, ...changes]);
    changed += 1;
  }
  if (changed > 0) window.dispatchEvent(new Event(SYNCED));
  return changed;
}

export async function changesFor(setId: string): Promise<import("./changes").Change[]> {
  if (!available()) return [];
  return (await readJson(await caches.open(CACHE), `${CHANGES}${setId}`)) ?? [];
}

export async function dismissChanges(setId: string): Promise<void> {
  if (available()) await (await caches.open(CACHE)).delete(`${CHANGES}${setId}`);
}

/** Sets removed from the device because the person can no longer read them. */
export async function removedSets(): Promise<{ id: string; name: string }[]> {
  if (!available()) return [];
  const cache = await caches.open(CACHE);
  const keys = (await cache.keys()).filter((request) =>
    new URL(request.url).pathname.startsWith(REMOVED),
  );
  return Promise.all(
    keys.map(async (key) => ({
      id: new URL(key.url).pathname.slice(REMOVED.length),
      name: (await readJson<{ name: string }>(cache, key.url))?.name ?? "",
    })),
  );
}

export async function dismissRemoved(setId: string): Promise<void> {
  if (available()) await (await caches.open(CACHE)).delete(`${REMOVED}${setId}`);
}
