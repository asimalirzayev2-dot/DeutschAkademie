// Minimal service worker — enables "Add to Home Screen" installability.
// No offline caching yet; every request just goes to the network as normal.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', () => self.clients.claim());
self.addEventListener('fetch', () => {});
