// Lamma Chat — Service Worker
// Smart caching with multiple strategies:
//  - Cache-First  for static assets (images, fonts, icons)
//  - Network-First  for API calls (with stale-while-revalidate fallback)
//  - Network-First  for HTML / routes
//  - Offline fallback page

const VERSION = "lamma-v1.0.11";
const STATIC_CACHE = `${VERSION}-static`;
const RUNTIME_CACHE = `${VERSION}-runtime`;
const IMAGE_CACHE = `${VERSION}-images`;
const API_CACHE = `${VERSION}-api`;

const PRECACHE_URLS = [
  "/",
  "/index.html",
  "/login.html",
  "/manifest.json",
  "/images/lamma-favicon.svg",
  "/images/lamma-logo.png",
  "/images/lamma-logo-نايس.png",
  "/images/lamma-wordmark.svg",
  "/images/login-hero-1.jpg.jpg",
  "/offline.html",
  "/assets/login.css",
  "/assets/login.js",
];

// ─────────────────────────────────────────────
// Install: pre-cache the shell
// ─────────────────────────────────────────────
self.addEventListener("install", (event) => {
  console.log("[SW] Installing", VERSION);
  event.waitUntil(
    caches.open(STATIC_CACHE).then(async (cache) => {
      // addAll fails if any single request fails. Use individual puts
      // so a single 404 doesn't break installation of the rest.
      await Promise.all(
        PRECACHE_URLS.map((url) =>
          cache
            .add(new Request(url, { cache: "no-cache" }))
            .catch((err) => console.warn("[SW] Failed to precache", url, err)),
        ),
      );
    }),
  );
  self.skipWaiting();
});

// ─────────────────────────────────────────────
// Activate: clear old caches
// ─────────────────────────────────────────────
self.addEventListener("activate", (event) => {
  console.log("[SW] Activating", VERSION);
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names
          .filter(
            (n) =>
              n !== STATIC_CACHE &&
              n !== RUNTIME_CACHE &&
              n !== IMAGE_CACHE &&
              n !== API_CACHE,
          )
          .map((n) => caches.delete(n)),
      );
      await self.clients.claim();
    })(),
  );
});

// ─────────────────────────────────────────────
// Fetch: route to the right strategy
// ─────────────────────────────────────────────
self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // 1. Supabase realtime / API — Network first, fall back to cache
  if (url.host.includes("supabase.co")) {
    event.respondWith(networkFirst(request, API_CACHE));
    return;
  }

  // 1. Skip cross-origin non-GET / streaming
  if (url.origin !== self.location.origin) return;

  // 3. Images — Cache first
  if (request.destination === "image") {
    event.respondWith(cacheFirst(request, IMAGE_CACHE));
    return;
  }

  // 4. Static assets (CSS, JS, fonts) — Cache first
  if (
    ["style", "script", "font", "manifest"].includes(request.destination) ||
    url.pathname.startsWith("/assets/")
  ) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  // 5. HTML / navigation — Network first to avoid stale app shells
  if (
    request.mode === "navigate" ||
    request.destination === "document"
  ) {
    event.respondWith(networkFirst(request, RUNTIME_CACHE));
    return;
  }

  // 6. Default — try network, fall back to cache
  event.respondWith(networkFirst(request, RUNTIME_CACHE));
});

// ─────────────────────────────────────────────
// Caching strategies
// ─────────────────────────────────────────────

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) {
    // Refresh in background
    fetch(request)
      .then((res) => {
        if (res.ok) cache.put(request, res.clone());
      })
      .catch(() => {});
    return cached;
  }
  try {
    const res = await fetch(request);
    if (res.ok) cache.put(request, res.clone());
    return res;
  } catch (err) {
    return new Response("Offline", { status: 503, statusText: "Offline" });
  }
}

async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const res = await fetch(request);
    if (res.ok) cache.put(request, res.clone());
    return res;
  } catch (err) {
    const cached = await cache.match(request);
    if (cached) return cached;
    return new Response("Offline", { status: 503, statusText: "Offline" });
  }
}

// ─────────────────────────────────────────────
// Message: let the page trigger SKIP_WAITING
// ─────────────────────────────────────────────
self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") {
    self.skipWaiting();
  }
  if (event.data === "CLEAR_CACHES") {
    event.waitUntil(
      (async () => {
        const names = await caches.keys();
        await Promise.all(names.map((n) => caches.delete(n)));
      })(),
    );
  }
});
