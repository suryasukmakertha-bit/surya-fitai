import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

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
  const l = localStorage.getItem("fitai-lang") || localStorage.getItem("fitai-language") || "id";
  if (l === "en" || l === "zh") return l as "en" | "zh";
  return "id";
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

// ===== Web Push Subscription (server-sent notifications) =====
function base64UrlToUint8Array(base64Url: string): Uint8Array {
  let base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) base64 += "=";
  const bin = atob(base64);
  return new Uint8Array([...bin].map((c) => c.charCodeAt(0)));
}

async function subscribeToPush() {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;

  // iOS requires standalone mode (installed to Home Screen) and iOS 16.4+
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isStandalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as any).standalone === true;
  const iosVersion = isIOS
    ? parseInt((navigator.userAgent.match(/OS (\d+)_/) || [])[1])
    : null;

  if (isIOS && (!isStandalone || !iosVersion || iosVersion < 16)) {
    return;
  }

  try {
    const reg = await navigator.serviceWorker.ready;

    // Check if already subscribed
    const existing = await reg.pushManager.getSubscription();
    if (existing) {
      // Update language and timezone in DB
      await updateSubscriptionMeta(existing);
      return;
    }

    // Fetch VAPID public key from edge function
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

    const res = await fetch(`${supabaseUrl}/functions/v1/get-vapid-key`, {
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
      },
    });

    if (!res.ok) {
      console.error("Failed to fetch VAPID key:", res.status);
      return;
    }

    const { publicKey } = await res.json();
    const applicationServerKey = base64UrlToUint8Array(publicKey);

    // Subscribe to push
    const subscription = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: applicationServerKey.buffer as ArrayBuffer,
    });

    // Save to database
    await saveSubscription(subscription);
  } catch (e) {
    console.error("Push subscription failed:", e);
  }
}

function detectPlatform(): string {
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua)) return "ios";
  if (/Android/.test(ua)) return "android";
  return "desktop";
}

async function saveSubscription(subscription: PushSubscription) {
  const subJson = subscription.toJSON();
  if (!subJson.endpoint || !subJson.keys?.p256dh || !subJson.keys?.auth) return;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const lang = getLang();
  const platform = detectPlatform();

  await supabase.from("push_subscriptions").upsert(
    {
      endpoint: subJson.endpoint,
      p256dh: subJson.keys.p256dh,
      auth: subJson.keys.auth,
      timezone,
      lang,
      platform,
      user_id: user.id,
    },
    { onConflict: "endpoint" }
  );
}

async function updateSubscriptionMeta(subscription: PushSubscription) {
  const subJson = subscription.toJSON();
  if (!subJson.endpoint) return;

  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const lang = getLang();

  await supabase
    .from("push_subscriptions")
    .update({ timezone, lang })
    .eq("endpoint", subJson.endpoint);
}

// ===== Main hook =====
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

  // Check and send reminders on load and every 5 minutes (client-side fallback)
  useEffect(() => {
    if (!isSupported || permission !== "granted") return;

    syncLangToSW();
    checkAndSendReminders();

    const interval = setInterval(checkAndSendReminders, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [isSupported, permission]);

  // Subscribe to Web Push for server-sent background notifications
  useEffect(() => {
    if (!isSupported || permission !== "granted") return;
    subscribeToPush();
  }, [isSupported, permission]);

  // Schedule via SW messages as additional fallback
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
      // Subscribe to Web Push for background delivery
      subscribeToPush();
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

// ===== SW fallback helpers =====
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
    const morningDelay = getDelayUntilHour(7);
    const morning = morningMessages[lang];
    reg.active?.postMessage({
      type: "SCHEDULE_NOTIFICATION",
      delay: morningDelay,
      title: morning.title,
      body: morning.body,
      tag: "morning-reminder",
    });

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
        minInterval: 4 * 60 * 60 * 1000,
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
