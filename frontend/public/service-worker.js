// PharmaSuiteX Service Worker v1.0
const CACHE_NAME = "pharmasuitex-v1.0.0";
const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/manifest.json",
];

// Install — cache static assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch(() => {});
    })
  );
  self.skipWaiting();
});

// Activate — clean old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// Fetch — network first, fallback to cache
self.addEventListener("fetch", (event) => {
  if (event.request.url.includes("/api/")) return;
  if (event.request.method !== "GET") return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => {
        return caches.match(event.request).then((cached) => {
          if (cached) return cached;
          if (event.request.mode === "navigate") {
            return caches.match("/index.html").then((page) => {
              return page || new Response("Offline", { status: 503 });
            });
          }
          return new Response("Offline", { status: 503 });
        });
      })
  );
});

// Push notifications — fixed JSON parsing
self.addEventListener("push", (event) => {
  let data = { title: "PharmaSuiteX", body: "You have new notifications" };
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data.body = event.data.text() || data.body;
    }
  }
  event.waitUntil(
    self.registration.showNotification(data.title || "PharmaSuiteX", {
      body: data.body || "You have new notifications",
      icon: "/logo192.png",
      badge: "/logo192.png",
      tag: "pharmasuitex-notification",
      data: { url: data.url || "/" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow(event.notification.data?.url || "/"));
});
