/**
 * JalRakshak service worker — offline shell + last-known zones cache.
 * NETWORK-FIRST for navigations and app shell so we never serve a stale build;
 * cache-first ONLY for hashed static assets (.next/static/*) which are immutable.
 */
const CACHE = "jalrakshak-v2";
const SHELL = ["/", "/manifest.webmanifest", "/icon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(SHELL).catch(() => undefined))
      .then(() => self.skipWaiting()), // take over quickly so v1 is replaced
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
    event.respondWith(networkFirst(request));
    return;
  }

  // only handle same-origin requests (never intercept cross-origin tiles)
  if (url.origin !== self.location.origin) return;

  // navigation (HTML documents): ALWAYS network-first so the latest build is served
  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request, 3000, true /* bypassHttpCache */));
    return;
  }

  // immutable build artifacts (hashed) → cache-first is safe and fast
  if (url.pathname.startsWith("/_next/static/") || /\.(js|css|woff2?|png|svg|ico)$/.test(url.pathname)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response && response.ok && response.type === "basic") {
            const clone = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, clone).catch(() => undefined));
          }
          return response;
        });
      }),
    );
    return;
  }

  // everything else (API calls, previews): network-first, cache as fallback
  event.respondWith(networkFirst(request));
});

function networkFirst(request: Request, timeoutMs = 4000): Promise<Response> {
  const timeout = new Promise<Response>((resolve) =>
    setTimeout(() => resolve(undefined as unknown as Response), timeoutMs),
  );
  // cache:"no-store" forces a real network round-trip — the plain HTTP cache can
  // otherwise hand a stale HTML page straight back (the old-UI-on-refresh bug).
  const fetchOpts: RequestInit = { cache: "no-store" };
  return Promise.race([fetch(request, fetchOpts), timeout])
    .catch(() => undefined)
    .then((response) => {
      if (response) return response;
      return caches.match(request).then((cached) => cached) as unknown as Promise<Response>;
    })
    .catch(() => caches.match(request)) as unknown as Promise<Response>;
}
