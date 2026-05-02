// Educ 2.0 — Service Worker (hand-crafted, Workbox via CDN)
importScripts("https://storage.googleapis.com/workbox-cdn/releases/7.3.0/workbox-sw.js");

const { precaching, routing, strategies, expiration, cacheableResponse } = workbox;

// ── App shell (cache-first with network fallback) ──
const SHELL_CACHE = "educ-shell-v1";
const SHELL_URLS = ["/", "/manifest.json", "/icon-192.png", "/icon-512.png"];

// Pre-cache the app shell on install
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) =>
      Promise.all(
        SHELL_URLS.map((url) =>
          cache.add(url).catch((err) => console.warn("[SW] Failed to cache", url, err))
        )
      )
    )
  );
  self.skipWaiting();
});

// Clean old caches on activate
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== SHELL_CACHE && !k.startsWith("workbox-"))
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// ── Routing strategies ──

// HTML navigations → NetworkFirst (no white screen on restart)
routing.registerRoute(
  ({ request }) => request.mode === "navigate",
  new strategies.NetworkFirst({
    cacheName: "html-pages",
    networkTimeoutSeconds: 3,
    plugins: [
      new cacheableResponse.CacheableResponsePlugin({ statuses: [0, 200] }),
      new expiration.ExpirationPlugin({ maxEntries: 50 }),
    ],
  })
);

// JS & CSS → StaleWhileRevalidate
routing.registerRoute(
  ({ request }) =>
    request.destination === "script" || request.destination === "style",
  new strategies.StaleWhileRevalidate({
    cacheName: "static-assets",
    plugins: [
      new cacheableResponse.CacheableResponsePlugin({ statuses: [0, 200] }),
      new expiration.ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 30 * 24 * 60 * 60 }),
    ],
  })
);

// Images → CacheFirst
routing.registerRoute(
  ({ request }) => request.destination === "image",
  new strategies.CacheFirst({
    cacheName: "images",
    plugins: [
      new cacheableResponse.CacheableResponsePlugin({ statuses: [0, 200] }),
      new expiration.ExpirationPlugin({ maxEntries: 60, maxAgeSeconds: 30 * 24 * 60 * 60 }),
    ],
  })
);

// Google Fonts → CacheFirst (long-lived)
routing.registerRoute(
  ({ url }) =>
    url.origin === "https://fonts.googleapis.com" ||
    url.origin === "https://fonts.gstatic.com",
  new strategies.CacheFirst({
    cacheName: "google-fonts",
    plugins: [
      new cacheableResponse.CacheableResponsePlugin({ statuses: [0, 200] }),
      new expiration.ExpirationPlugin({ maxEntries: 10, maxAgeSeconds: 365 * 24 * 60 * 60 }),
    ],
  })
);

// Supabase API calls → NetworkOnly (never cache API data; offline handled by Dexie)
routing.registerRoute(
  ({ url }) => url.hostname.includes("supabase"),
  new strategies.NetworkOnly()
);
