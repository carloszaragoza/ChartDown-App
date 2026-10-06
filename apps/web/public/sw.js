/* global self, caches, Request, URL, fetch, Response */
// ChartDown's service worker (T-901). Written for the app, with no library.
// It keeps the static files the app uses (scripts, styles, fonts, icons) and shows the offline
// page when a page cannot be reached. It stores no pages or data of its own, so nobody reads
// stale information; sets downloaded to read with no internet (T-902) are kept by the app.
const CACHE = "chartdown-static-v2";
const OFFLINE = "/offline";
const READER = "/offline/set";
const STATIC = /^\/(_next\/static\/|icons\/)|\.(?:woff2|svg|png|ico)$/;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.add(new Request(OFFLINE, { cache: "reload" }))),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      // Only this cache's older versions; downloaded sets (T-902) live in a cache of their own.
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith("chartdown-static-") && key !== CACHE)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Static files never change under the same address: from the cache once kept.
  if (STATIC.test(url.pathname)) {
    event.respondWith(
      caches.open(CACHE).then(async (cache) => {
        const kept = await cache.match(request);
        if (kept) return kept;
        const response = await fetch(request);
        if (response.ok) cache.put(request, response.clone());
        return response;
      }),
    );
    return;
  }

  // Pages always come from the network. Without it, the reader of downloaded sets opens from
  // the device (T-902); any other page shows the offline page.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(async () => {
        if (url.pathname === READER || url.pathname.startsWith(`${READER}/`)) {
          const reader = await caches.match(READER, { ignoreSearch: true });
          if (reader) return reader;
        }
        return (await caches.match(OFFLINE)) ?? Response.error();
      }),
    );
  }
});
