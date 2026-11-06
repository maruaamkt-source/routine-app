const VERSAO = 'v1';
const CACHE = 'routine-' + VERSAO;
const SHELL = ['/offline.html', '/manifest.json', '/icon.png', '/icon-192.png'];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k.startsWith('routine-') && k !== CACHE).map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', function (event) {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // Supabase e outros: passa direto

  // Abrir página: rede primeiro, cache se falhar, senão /offline.html
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) {
            const copia = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copia));
          }
          return res;
        })
        .catch(() =>
          caches.match(req).then((r) => r || caches.match('/offline.html'))
        )
    );
    return;
  }

  // Estáticos: cache primeiro
  if (
    url.pathname.startsWith('/_next/static/') ||
    /\.(png|svg|ico|woff2?|css|js)$/.test(url.pathname) ||
    url.pathname === '/manifest.json'
  ) {
    event.respondWith(
      caches.match(req).then(
        (r) =>
          r ||
          fetch(req).then((res) => {
            if (res.ok) {
              const copia = res.clone();
              caches.open(CACHE).then((c) => c.put(req, copia));
            }
            return res;
          })
      )
    );
  }
});
self.addEventListener('push', function (event) {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { body: event.data ? event.data.text() : '' };
  }

  const title = data.title || 'Routine';
  const options = {
    body: data.body || '',
    icon: '/icon-192.png',
    badge: '/badge-96.png',
    vibrate: [200, 100, 200, 100, 300],
    requireInteraction: true,
    data: {
      url: data.url || '/',
    },
  };

  if (data.tag) {
    options.tag = data.tag;
    options.renotify = true;
  }

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  const target = new URL(
    event.notification.data?.url || '/',
    self.location.origin
  ).href;

  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (
            new URL(client.url).origin === self.location.origin &&
            'focus' in client
          ) {
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(target);
        }
      })
  );
});