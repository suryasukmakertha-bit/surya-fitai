import { useState, useEffect, useCallback } from "react";

const NOTIF_ENABLED_KEY = "fitai-notif-enabled";
const LAST_MORNING_KEY = "fitai-lastMorningReminderDate";
const LAST_AFTERNOON_KEY = "fitai-lastAfternoonReminderDate";

const morningMessages = {
  en: {
    title: "Hey champion! 💪",
    body: "It's 7 AM — time to train with your AI trainer 💪 Let's make today strong!",
  },
  id: {
    title: "Hei juara! 💪",
    body: "Jam 7 pagi — waktunya latihan dengan AI trainer kamu 💪 Ayo buat hari ini kuat!",
  },
  zh: {
    title: "嘿，冠军！💪",
    body: "现在是早上7点 — 该和你的AI教练一起训练了 💪 让我们让今天更强大！",
  },
};

const afternoonMessages = {
  en: {
    title: "Good afternoon! 💪",
    body: "It's 3 PM — perfect time for your workout with AI trainer 💪 Keep the momentum going!",
  },
  id: {
    title: "Selamat sore! 💪",
    body: "Jam 3 siang — waktu yang tepat untuk latihan dengan AI trainer kamu 💪 Jaga semangatnya!",
  },
  zh: {
    title: "下午好！💪",
    body: "现在是下午3点 — 完美的时间和AI教练一起训练 💪 保持动力！",
  },
};

function getTodayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function getLang(): "en" | "id" | "zh" {
  const l = localStorage.getItem("fitai-language") || "en";
  if (l === "id" || l === "zh") return l;
  return "en";
}

async function showNotificationViaSW(title: string, body: string) {
  if (!("serviceWorker" in navigator)) return;
  const reg = await navigator.serviceWorker.ready;
  await reg.showNotification(title, {
    body,
    icon: "/icons/icon-192.png?v=2",
    badge: "/icons/icon-192.png?v=2",
    data: { url: "/saved-plans" },
    tag: "daily-workout-" + Date.now(),
    renotify: true,
  } as NotificationOptions);
}

function checkAndSendReminders() {
  if (Notification.permission !== "granted") return;

  const now = new Date();
  const hour = now.getHours();
  const today = getTodayStr();
  const lang = getLang();

  // Morning: 7:00–8:00
  if (hour >= 7 && hour < 8 && localStorage.getItem(LAST_MORNING_KEY) !== today) {
    const msg = morningMessages[lang];
    showNotificationViaSW(msg.title, msg.body);
    localStorage.setItem(LAST_MORNING_KEY, today);
  }

  // Afternoon: 15:00–16:00
  if (hour >= 15 && hour < 16 && localStorage.getItem(LAST_AFTERNOON_KEY) !== today) {
    const msg = afternoonMessages[lang];
    showNotificationViaSW(msg.title, msg.body);
    localStorage.setItem(LAST_AFTERNOON_KEY, today);
  }
}

export function usePushNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    const supported = "Notification" in window && "serviceWorker" in navigator;
    setIsSupported(supported);
    if (supported) {
      setPermission(Notification.permission);
    }
  }, []);

  // Check and send reminders on load and every 5 minutes
  useEffect(() => {
    if (!isSupported || permission !== "granted") return;
    
    // Check immediately
    checkAndSendReminders();
    
    // Check every 5 minutes while app is open
    const interval = setInterval(checkAndSendReminders, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [isSupported, permission]);

  // Schedule via SW messages for background delivery
  useEffect(() => {
    if (!isSupported || permission !== "granted") return;
    scheduleSWReminders();
  }, [isSupported, permission]);

  // Listen for reschedule messages from SW
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const handler = (event: MessageEvent) => {
      if (event.data?.type === "RESCHEDULE_NOTIFICATION") {
        scheduleSWReminders();
      }
    };
    navigator.serviceWorker.addEventListener("message", handler);
    return () => navigator.serviceWorker.removeEventListener("message", handler);
  }, []);

  const requestPermission = useCallback(async () => {
    if (!isSupported) return false;
    const result = await Notification.requestPermission();
    setPermission(result);
    if (result === "granted") {
      localStorage.setItem(NOTIF_ENABLED_KEY, "true");
      syncLangToSW();
      checkAndSendReminders();
      scheduleSWReminders();
      tryPeriodicSync();
      // Ask SW to check reminders immediately
      navigator.serviceWorker.ready.then((reg) => {
        reg.active?.postMessage({ type: "CHECK_REMINDERS" });
      });
      return true;
    }
    return false;
  }, [isSupported]);

  return { permission, isSupported, requestPermission };
}

function getDelayUntilHour(targetHour: number): number {
  const now = new Date();
  const target = new Date();
  target.setHours(targetHour, 0, 0, 0);
  if (target <= now) {
    target.setDate(target.getDate() + 1);
  }
  return target.getTime() - now.getTime();
}

function scheduleSWReminders() {
  if (!("serviceWorker" in navigator)) return;
  if (Notification.permission !== "granted") return;

  const lang = getLang();

  navigator.serviceWorker.ready.then((reg) => {
    // Schedule morning (7 AM)
    const morningDelay = getDelayUntilHour(7);
    const morning = morningMessages[lang];
    reg.active?.postMessage({
      type: "SCHEDULE_NOTIFICATION",
      delay: morningDelay,
      title: morning.title,
      body: morning.body,
      tag: "morning-reminder",
    });

    // Schedule afternoon (3 PM / 15:00)
    const afternoonDelay = getDelayUntilHour(15);
    const afternoon = afternoonMessages[lang];
    reg.active?.postMessage({
      type: "SCHEDULE_NOTIFICATION",
      delay: afternoonDelay,
      title: afternoon.title,
      body: afternoon.body,
      tag: "afternoon-reminder",
    });
  });
}

async function tryPeriodicSync() {
  try {
    const reg = await navigator.serviceWorker.ready;
    if ("periodicSync" in reg) {
      await (reg as any).periodicSync.register("daily-fitness-reminder", {
        minInterval: 4 * 60 * 60 * 1000, // every 4 hours for reliable coverage
      });
    }
  } catch {
    // Periodic sync not supported
  }
}

function syncLangToSW() {
  if (!("serviceWorker" in navigator)) return;
  const lang = getLang();
  navigator.serviceWorker.ready.then((reg) => {
    reg.active?.postMessage({ type: "SET_LANG", lang });
  });
}

// Register service worker
export function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker
        .register("/sw.js", { updateViaCache: "none" })
        .then((reg) => {
          reg.update();
        })
        .catch(() => {
          // SW registration failed silently
        });
    });
  }
}
