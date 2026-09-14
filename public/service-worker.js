self.addEventListener('push', (event) => {
  let data = { title: 'Indonation Roleplay', body: 'Ada update baru.' };
  try { data = event.data.json(); } catch (_) {}
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/assets/logo.gif',
      badge: '/assets/logo.gif',
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow('/dashboard.html'));
});