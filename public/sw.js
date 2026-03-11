self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  self.registration.showNotification(data.title || '⚠️ Mon Frigo', {
    body: data.body || '',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
  });
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow('/'));
});
