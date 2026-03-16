// Surya-FitAi Service Worker v2
const CACHE_NAME = 'surya-fitai-v2';

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
  let lang = 'en';
  try {
    const data = event.data?.json();
    lang = data?.lang || 'en';
  } catch (e) {
    // fallback to default
  }

  const titles = {
    en: 'Your workout is waiting 💪',
    id: 'Waktunya latihan 💪',
    zh: '该锻炼了 💪',
  };

  const bodies = {
    en: "Your AI trainer is ready. Let's complete today's workout.",
    id: 'Pelatih AI Anda sudah siap. Ayo selesaikan latihan hari ini.',
    zh: '你的 AI 教练已经准备好了。开始今天的训练吧。',
  };

  const options = {
    body: bodies[lang] || bodies.en,
    icon: '/icons/icon-192.png?v=2',
    badge: '/icons/icon-192.png?v=2',
    vibrate: [100, 50, 100],
    data: { url: '/saved-plans' },
    actions: [
      { action: 'open', title: lang === 'id' ? 'Buka' : lang === 'zh' ? '打开' : 'Open' },
    ],
    tag: 'daily-workout',
    renotify: true,
  };

  event.waitUntil(
    self.registration.showNotification(titles[lang] || titles.en, options)
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
    const { delay, lang } = event.data;
    setTimeout(() => {
      const titles = {
        en: 'Your workout is waiting 💪',
        id: 'Waktunya latihan 💪',
        zh: '该锻炼了 💪',
      };
      const bodies = {
        en: "Your AI trainer is ready. Let's complete today's workout.",
        id: 'Pelatih AI Anda sudah siap. Ayo selesaikan latihan hari ini.',
        zh: '你的 AI 教练已经准备好了。开始今天的训练吧。',
      };

      self.registration.showNotification(titles[lang] || titles.en, {
        body: bodies[lang] || bodies.en,
        icon: '/icons/icon-192.png?v=2',
        badge: '/icons/icon-192.png?v=2',
        vibrate: [100, 50, 100],
        data: { url: '/saved-plans' },
        tag: 'daily-workout',
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
    event.waitUntil(sendDailyReminder());
  }
});

async function sendDailyReminder() {
  await self.registration.showNotification('Your workout is waiting 💪', {
    body: "Your AI trainer is ready. Let's complete today's workout.",
    icon: '/icons/icon-192.png?v=2',
    badge: '/icons/icon-192.png?v=2',
    data: { url: '/saved-plans' },
    tag: 'daily-workout',
    renotify: true,
  });
}
