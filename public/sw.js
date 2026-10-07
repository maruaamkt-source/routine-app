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