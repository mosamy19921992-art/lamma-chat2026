// Lamma Chat — Service Worker
// Smart caching with multiple strategies:
//  - Cache-First  for static assets (images, fonts, icons)
//  - Network-First  for API calls (with stale-while-revalidate fallback)
//  - Network-First  for HTML / routes
//  - Offline fallback page

const VERSION = "lamma-178273136036";
const STATIC_CACHE = `${VERSION}-static`;
const RUNTIME_CACHE = `${VERSION}-runtime`;
const IMAGE_CACHE = `${VERSION}-images`;
const OFFLINE_URL = "/offline.html";

const PRECACHE_URLS = [
  "/manifest.json",
  "/images/lamma-search-icon.svg",
  "/images/lamma-app-icon-180.png",
  "/images/lamma-app-icon-192.png",
  "/images/lamma-app-icon-512.png",
  "/images/lamma-app-icon-512-maskable.png",
  "/images/lamma-app-icon-1024.png",
  "/images/lamma-wordmark.svg",
  "/images/lamma-logo-nice.png",
  "/images/login-hero.jpg",
  OFFLINE_URL,
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
              n !== IMAGE_CACHE,
          )
          .map((n) => caches.delete(n)),
      );
      if ("navigationPreload" in self.registration) {
        await self.registration.navigationPreload.enable().catch(() => {});
      }
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

  // 1. Supabase realtime / API — always network only to avoid stale or sensitive data
  if (url.host.includes("supabase.co")) {
    event.respondWith(networkOnly(request));
    return;
  }

  // 1. Skip cross-origin non-GET / streaming
  if (url.origin !== self.location.origin) return;

  // 3. Images — Cache first
  if (request.destination === "image") {
    event.respondWith(cacheFirst(request, IMAGE_CACHE));
    return;
  }

  // 4. Hashed JS/CSS bundles — network only (never serve stale app code)
  if (url.pathname.startsWith("/assets/")) {
    event.respondWith(networkOnly(request));
    return;
  }

  // 5. Other static assets (fonts, manifest) — network first
  if (
    ["style", "script", "font", "manifest"].includes(request.destination)
  ) {
    event.respondWith(networkFirst(request, STATIC_CACHE));
    return;
  }

  // 6. HTML / navigation — always prefer a fresh network response.
  // If the network is unavailable, return the dedicated offline page
  // instead of a stale cached app shell that may reference old bundles.
  if (
    request.mode === "navigate" ||
    request.destination === "document"
  ) {
    event.respondWith(networkOnlyDocument(request));
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

async function networkOnly(request) {
  try {
    return await fetch(request, { cache: "no-store" });
  } catch {
    return new Response("Offline", { status: 503, statusText: "Offline" });
  }
}

async function networkOnlyDocument(request) {
  try {
    const res = await fetch(request, { cache: "no-store" });
    if (res.ok) {
      return res;
    }
  } catch {
    // Fall back to the offline document below.
  }

  const offline = await caches.match(OFFLINE_URL);
  if (offline) return offline;
  return new Response("Offline", { status: 503, statusText: "Offline" });
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
