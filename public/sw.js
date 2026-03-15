// Surya-FitAi Service Worker
const CACHE_NAME = 'surya-fitai-v1';

// Install event
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// Activate event
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Push notification handler
self.addEventListener('push', (event) => {
  const lang = event.data ? event.data.json().lang || 'en' : 'en';
  
  const titles = {
    en: 'Your workout is waiting 💪',
    id: 'Waktunya latihan 💪',
    zh: '该锻炼了 💪',
  };
  
  const bodies = {
    en: 'Your AI trainer is ready. Let\'s complete today\'s workout.',
    id: 'Pelatih AI Anda sudah siap. Ayo selesaikan latihan hari ini.',
    zh: '你的 AI 教练已经准备好了。开始今天的训练吧。',
  };

  const options = {
    body: bodies[lang] || bodies.en,
    icon: '/images/surya-fitai-logo.png',
    badge: '/images/surya-fitai-logo.png',
    vibrate: [100, 50, 100],
    data: { url: '/saved-plans' },
    actions: [
      { action: 'open', title: lang === 'id' ? 'Buka' : lang === 'zh' ? '打开' : 'Open' },
    ],
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

// Periodic sync for daily notifications (if supported)
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'daily-workout-reminder') {
    event.waitUntil(sendDailyReminder());
  }
});

async function sendDailyReminder() {
  const lang = 'en'; // fallback
  const titles = {
    en: 'Your workout is waiting 💪',
    id: 'Waktunya latihan 💪',
    zh: '该锻炼了 💪',
  };
  const bodies = {
    en: 'Your AI trainer is ready. Let\'s complete today\'s workout.',
    id: 'Pelatih AI Anda sudah siap. Ayo selesaikan latihan hari ini.',
    zh: '你的 AI 教练已经准备好了。开始今天的训练吧。',
  };

  await self.registration.showNotification(titles[lang], {
    body: bodies[lang],
    icon: '/images/surya-fitai-logo.png',
    badge: '/images/surya-fitai-logo.png',
    data: { url: '/saved-plans' },
  });
}
