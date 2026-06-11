// Service worker mínimo do Life OS (Agenda #11 — notificações fora da aba).
//
// SEM cache de conteúdo e SEM interceptação de assets, de propósito: o app é
// local-first e roda do servidor local — cachear requests só criaria bugs de
// versão. O SW existe para três coisas:
//   1. Exibir notificações via registration.showNotification — obrigatório no
//      PWA instalado do Android (lá, `new Notification()` lança exceção).
//   2. Clique na notificação focar a aba aberta (ou abrir uma nova) na Agenda.
//   3. Modo offline GRACIOSO: quando uma NAVEGAÇÃO falha (PC desligado, fora
//      da rede), mostra /offline.html em vez do dinossauro do navegador. Só a
//      página offline entra no cache — nada de conteúdo do app.

const OFFLINE_CACHE = "lifeos-offline-v1";
const OFFLINE_URL = "/offline.html";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(OFFLINE_CACHE).then((cache) => cache.add(OFFLINE_URL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      // Remove caches de versões antigas do SW.
      caches.keys().then((keys) =>
        Promise.all(keys.filter((k) => k.startsWith("lifeos-") && k !== OFFLINE_CACHE).map((k) => caches.delete(k)))
      ),
    ])
  );
});

// Só navegações (document). Assets/dados continuam indo direto à rede.
self.addEventListener("fetch", (event) => {
  if (event.request.mode !== "navigate") return;
  event.respondWith(
    fetch(event.request).catch(() =>
      caches.match(OFFLINE_URL).then((cached) => cached ?? Response.error())
    )
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/agenda";
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
        for (const client of clients) {
          if ("focus" in client) {
            client.focus();
            if ("navigate" in client) client.navigate(url);
            return;
          }
        }
        return self.clients.openWindow(url);
      })
  );
});
