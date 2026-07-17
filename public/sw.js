// Service worker mínimo para instalabilidade (PWA).
// Intencionalmente sem cache: network-first puro para nunca servir
// conteúdo desatualizado. Existe apenas para satisfazer os critérios
// de instalação do navegador (manifest + SW com handler de fetch).

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  event.respondWith(fetch(event.request));
});
