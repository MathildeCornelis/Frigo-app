self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  self.registration.showNotification(data.title || '⚠️ Mon Frigo', {
    body: data.body || '',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
  });
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow('/'));
});
