// Minimal service worker: its presence + a fetch handler make the app
// installable. No caching (avoids stale-SPA issues); requests pass through.
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))
self.addEventListener('fetch', () => {})
