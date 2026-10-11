// Service Worker Minimal untuk Kebutuhan Instalasi Aplikasi (PWA)
const CACHE_NAME = 'atur-porsi-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Biarkan request jaringan berjalan normal
  event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
});
