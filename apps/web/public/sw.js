/* global self, caches, Request, URL, fetch, Response */
// ChartDown's service worker (T-901). Written for the app, with no library.
// It keeps the static files the app uses (scripts, styles, fonts, icons) and shows the offline
// page when a page cannot be reached. It stores no pages or data, so nobody reads stale
// information; downloading a set to read it with no internet comes with T-902.
const CACHE = "chartdown-static-v1";
const OFFLINE = "/offline";
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
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))),
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

  // Pages always come from the network; without it, the offline page.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(async () => (await caches.match(OFFLINE)) ?? Response.error()),
    );
  }
});
