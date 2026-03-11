self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  self.registration.showNotification(data.title || '⚠️ Mon Frigo', {
    body: data.body || '',
    icon: '/logo512.png',
    badge: '/logo512.png',
  });
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow('/'));
});
