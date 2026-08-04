// Service worker mínimo. No guarda nada en caché (todas las peticiones van
// directo a la red, tal cual funcionaría sin él); su único propósito es
// cumplir el requisito técnico de Chrome/Android para ofrecer la
// instalación "de verdad" (ícono propio, pantalla completa, sin barra del
// navegador) en vez de un simple acceso directo.
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  event.respondWith(fetch(event.request));
});
