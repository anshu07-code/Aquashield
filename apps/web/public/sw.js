/**
 * JalRakshak service worker — offline shell + last-known zones cache.
 * Deliberately conservative: network-first everywhere, cache only as a fallback, so the
 * app never serves stale risk data when a fresh copy is reachable.
 */
const CACHE = "jalrakshak-v1";
const SHELL = ["/", "/manifest.webmanifest", "/icon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(SHELL).catch(() => undefined))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // zone risk data: network-first, fall back to the last-known snapshot
  if (url.pathname.endsWith("/zones") || url.pathname.includes("/zones?")) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.ok) {
            const clone = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, clone).catch(() => undefined));
          }
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached || new Response("offline", { status: 503 }))),
    );
    return;
  }

  // app shell + static assets: cache-first, then network
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request)
          .then((response) => {
            if (response && response.ok && response.type === "basic") {
              const clone = response.clone();
              caches.open(CACHE).then((cache) => cache.put(request, clone).catch(() => undefined));
            }
            return response;
          })
          .catch(() => caches.match("/"));
      }),
    );
  }
});
