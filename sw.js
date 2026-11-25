/* Petit Protocol app shell. Bump CACHE when the shell files change. */
const CACHE = "petit-protocol-v2";
const ASSETS = [
  "index.html",
  "manifest.webmanifest",
  "icons/icon.svg",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/icon-maskable-512.png",
  "icons/apple-touch-icon.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(fromCacheOrNetwork(event.request));
});

async function fromCacheOrNetwork(request) {
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) {
    return fetch(request);
  }

  if (request.mode === "navigate") {
    try {
      const fresh = await fetch(request);
      const cache = await caches.open(CACHE);
      await cache.put(request, fresh.clone());
      await cache.put("index.html", fresh.clone());
      return fresh;
    } catch (err) {
      const cache = await caches.open(CACHE);
      const hit = (await cache.match(request)) || (await cache.match("index.html"));
      if (hit) return hit;
      return new Response(
        "Petit Protocol is not saved on this device yet. Open it once while you have signal, then it works offline.",
        { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } }
      );
    }
  }

  const cache = await caches.open(CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;
  try {
    const fresh = await fetch(request);
    if (fresh.ok) await cache.put(request, fresh.clone());
    return fresh;
  } catch (err) {
    return cached || new Response("", { status: 504 });
  }
}
