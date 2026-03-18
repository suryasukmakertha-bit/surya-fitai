// Surya-FitAi Service Worker v3
const CACHE_NAME = 'surya-fitai-v3';

// Install — clear old caches
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    )
  );
  self.skipWaiting();
});

// Activate
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    ).then(() => self.clients.claim())
  );
});

// Push notification handler
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data?.json() || {};
  } catch (e) {}

  const title = data.title || 'Your workout is waiting 💪';
  const body = data.body || "Your AI trainer is ready. Let's complete today's workout.";

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: '/icons/icon-192.png?v=2',
      badge: '/icons/icon-192.png?v=2',
      vibrate: [100, 50, 100],
      data: { url: '/saved-plans' },
      tag: data.tag || 'daily-workout',
      renotify: true,
    })
  );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/saved-plans';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(self.location.origin)) {
          client.navigate(url);
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    })
  );
});

// Message handler for scheduling local notifications
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SCHEDULE_NOTIFICATION') {
    const { delay, title, body, tag } = event.data;
    setTimeout(() => {
      self.registration.showNotification(title || 'Your workout is waiting 💪', {
        body: body || "Your AI trainer is ready. Let's complete today's workout.",
        icon: '/icons/icon-192.png?v=2',
        badge: '/icons/icon-192.png?v=2',
        vibrate: [100, 50, 100],
        data: { url: '/saved-plans' },
        tag: tag || 'daily-workout',
        renotify: true,
      });

      // Tell client to schedule the next one
      self.clients.matchAll().then((clients) => {
        clients.forEach((client) => client.postMessage({ type: 'RESCHEDULE_NOTIFICATION' }));
      });
    }, delay);
  }
});

// Periodic sync for daily notifications (if supported)
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'daily-workout-reminder') {
    event.waitUntil(
      self.registration.showNotification('Hey champion! 💪', {
        body: "Time to train with your AI trainer! Let's make today strong!",
        icon: '/icons/icon-192.png?v=2',
        badge: '/icons/icon-192.png?v=2',
        data: { url: '/saved-plans' },
        tag: 'periodic-reminder',
        renotify: true,
      })
    );
  }
});
