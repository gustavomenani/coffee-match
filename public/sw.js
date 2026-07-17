// Service worker mínimo para instalabilidade (PWA) + Web Push.
// Intencionalmente sem cache: network-first puro para nunca servir
// conteúdo desatualizado. Existe para satisfazer os critérios de
// instalação do navegador (manifest + SW com handler de fetch) e para
// receber notificações push.

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  event.respondWith(fetch(event.request));
});

self.addEventListener("push", (event) => {
  // Payload esperado: { title, body, url } (JSON). Fallback defensivo
  // para payloads vazios ou malformados.
  let payload = { title: "Coffee Match", body: "", url: "/" };
  try {
    if (event.data) {
      payload = Object.assign(payload, event.data.json());
    }
  } catch {
    // Mantém o fallback.
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: "/icon-512.png",
      badge: "/icon-512.png",
      data: { url: payload.url },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url =
    (event.notification.data && event.notification.data.url) || "/";
  const target = new URL(url, self.location.origin).href;

  // Focus an already-open Coffee Match window (the common case on mobile for a
  // "results are out" / "spot opened" push) instead of unconditionally spawning
  // a duplicate tab. Only open a new one when none exists.
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
        for (const client of clients) {
          if (new URL(client.url).origin === self.location.origin) {
            return client.focus().then((focused) =>
              "navigate" in focused ? focused.navigate(target) : focused
            );
          }
        }
        return self.clients.openWindow(target);
      })
  );
});
