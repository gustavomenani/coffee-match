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
  event.waitUntil(self.clients.openWindow(url));
});
