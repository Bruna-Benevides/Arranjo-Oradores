const CACHE_NAME = "arranjo-discursos-v1";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(["/", "/manifest.webmanifest"])),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))),
    ),
  );
  self.clients.claim();
});

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { body: event.data?.text() ?? "" };
  }

  const title = typeof payload.title === "string" ? payload.title : "Arranjo de Discursos";
  const options = {
    body: typeof payload.body === "string" ? payload.body : "Há pendências na programação.",
    icon: "/icons/app.svg",
    badge: "/icons/app.svg",
    data: { url: "/" },
    tag: "arranjo-lembrete",
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url.startsWith(self.location.origin) && "focus" in client) {
          return client.focus();
        }
      }
      return self.clients.openWindow(new URL("/", self.location.origin).toString());
    }),
  );
});

self.addEventListener("fetch", (event) => {
  const requestUrl = new URL(event.request.url);
  if (
    event.request.method !== "GET" ||
    requestUrl.origin !== self.location.origin ||
    requestUrl.pathname.startsWith("/rest/") ||
    requestUrl.pathname.startsWith("/functions/")
  ) {
    return;
  }

  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(async () => {
        const cachedPage = await caches.match("/");
        if (!cachedPage) throw new Error("Página do app indisponível offline.");
        return cachedPage;
      }),
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (response.ok) {
          const responseToCache = response.clone();
          void caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseToCache));
        }
        return response;
      });
    }),
  );
});
