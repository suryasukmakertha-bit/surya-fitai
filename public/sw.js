// Surya-FitAi Service Worker v5
const CACHE_NAME = 'surya-fitai-v5';
const DB_NAME = 'surya-fitai-sw';
const STORE_NAME = 'reminders';

// ── IndexedDB helpers (localStorage not available in SW) ──
function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE_NAME);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function dbGet(key) {
  const db = await openDB();
  return new Promise((resolve) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(undefined);
  });
}

async function dbSet(key, value) {
  const db = await openDB();
  return new Promise((resolve) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(value, key);
    tx.oncomplete = () => resolve();
  });
}

// ── Messages ──
const morningMessages = {
  en: { title: "Good morning! 💪", body: "Good morning! 💪 Time to crush your workout with AI trainer. Let's go!" },
  id: { title: "Selamat pagi! 💪", body: "Selamat pagi! 💪 Waktunya workout bareng Coach Surya. Ayo mulai!" },
  zh: { title: "早上好！💪", body: "早上好！💪 是时候和AI教练一起训练了。加油！" },
};

const afternoonMessages = {
  en: { title: "Good afternoon! 💪", body: "Good afternoon! 💪 It's time for your workout with AI trainer 💪 Keep the momentum going!" },
  id: { title: "Selamat siang! 💪", body: "Selamat siang! 💪 Saatnya latihan hari ini. Coach Surya sudah menunggu!" },
  zh: { title: "下午好！💪", body: "下午好！💪 今天的训练时间到了。保持动力！" },
};

const eveningMessages = {
  en: { title: "Good evening! 🌙", body: "Good evening! 🌙 Don't skip today's workout. Your AI trainer is ready!" },
  id: { title: "Selamat malam! 🌙", body: "Selamat malam! 🌙 Jangan lewatkan workout hari ini. Coach Surya siap menemanimu!" },
  zh: { title: "晚上好！🌙", body: "晚上好！🌙 不要跳过今天的训练。你的AI教练已经准备好了！" },
};

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

async function getLang() {
  const stored = await dbGet('lang');
  if (stored === 'id' || stored === 'zh') return stored;
  return 'en';
}

async function checkAndShowReminders() {
  const now = new Date();
  const hour = now.getHours();
  const today = todayStr();
  const lang = await getLang();

  // Morning 5:00–11:59
  if (hour >= 5 && hour < 12) {
    const lastMorning = await dbGet('lastMorningDate');
    if (lastMorning !== today) {
      const msg = morningMessages[lang];
      await self.registration.showNotification(msg.title, {
        body: msg.body,
        icon: '/icons/icon-192.png?v=2',
        badge: '/icons/icon-192.png?v=2',
        vibrate: [100, 50, 100],
        data: { url: '/saved-plans' },
        tag: 'morning-reminder',
        renotify: true,
        actions: [{ action: 'open', title: 'Open App' }],
      });
      await dbSet('lastMorningDate', today);
    }
  }

  // Afternoon 12:00–17:59
  if (hour >= 12 && hour < 18) {
    const lastAfternoon = await dbGet('lastAfternoonDate');
    if (lastAfternoon !== today) {
      const msg = afternoonMessages[lang];
      await self.registration.showNotification(msg.title, {
        body: msg.body,
        icon: '/icons/icon-192.png?v=2',
        badge: '/icons/icon-192.png?v=2',
        vibrate: [100, 50, 100],
        data: { url: '/saved-plans' },
        tag: 'afternoon-reminder',
        renotify: true,
        actions: [{ action: 'open', title: 'Open App' }],
      });
      await dbSet('lastAfternoonDate', today);
    }
  }

  // Evening 18:00–22:59
  if (hour >= 18 && hour < 23) {
    const lastEvening = await dbGet('lastEveningDate');
    if (lastEvening !== today) {
      const msg = eveningMessages[lang];
      await self.registration.showNotification(msg.title, {
        body: msg.body,
        icon: '/icons/icon-192.png?v=2',
        badge: '/icons/icon-192.png?v=2',
        vibrate: [100, 50, 100],
        data: { url: '/saved-plans' },
        tag: 'evening-reminder',
        renotify: true,
        actions: [{ action: 'open', title: 'Open App' }],
      });
      await dbSet('lastEveningDate', today);
    }
  }
}

// ── Install ──
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    )
  );
  self.skipWaiting();
});

// ── Activate ──
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    ).then(() => self.clients.claim())
  );
});

// ── Periodic Background Sync (primary – works when app is closed) ──
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'daily-fitness-reminder') {
    event.waitUntil(checkAndShowReminders());
  }
});

// ── Push notification handler ──
self.addEventListener('push', (event) => {
  if (!event.data) return;
  let data = {};
  try { data = event.data.json(); } catch (e) {}

  const title = data.title || 'Your workout is waiting 💪';
  const body = data.body || "Your AI trainer is ready. Let's complete today's workout.";

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: data.icon || '/icons/icon-192.png?v=2',
      badge: data.badge || '/icons/icon-192.png?v=2',
      vibrate: [100, 50, 100],
      data: { url: data.url || '/saved-plans' },
      tag: data.tag || 'daily-workout',
      renotify: true,
    })
  );
});

// ── Notification click ──
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/saved-plans';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(self.location.origin)) {
          try { client.navigate(url); } catch (e) {}
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    })
  );
});

// ── Message handler (lang sync + scheduled fallback) ──
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SET_LANG') {
    dbSet('lang', event.data.lang);
  }

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
      self.clients.matchAll().then((clients) => {
        clients.forEach((client) => client.postMessage({ type: 'RESCHEDULE_NOTIFICATION' }));
      });
    }, delay);
  }

  if (event.data?.type === 'CHECK_REMINDERS') {
    checkAndShowReminders();
  }
});
