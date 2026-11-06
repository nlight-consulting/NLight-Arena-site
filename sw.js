// NLight Arena service worker: makes the app installable and opens the last
// loaded page when the network is down. Page loads go to the network first and
// fall back to the cached copy. Workspace data (/api/) and Lumen (/lumen/) are
// never cached — they always come from the server. No push server.
const CACHE = 'arena-shell-v1';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.includes('/api/') || url.pathname.includes('/lumen/')) return;
  if (req.mode !== 'navigate') return;
  e.respondWith(
    fetch(req).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {}); }
      return res;
    }).catch(() => caches.match(req).then(hit => hit || caches.match('./')).then(hit => hit || Response.error()))
  );
});

// A shown notification opens (or focuses) the app.
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const to = e.notification.data?.url || './';
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    const w = list.find(c => 'focus' in c);
    return w ? w.focus() : self.clients.openWindow(to);
  }));
});
