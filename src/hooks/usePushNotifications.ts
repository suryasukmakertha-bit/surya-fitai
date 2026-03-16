import { useState, useEffect, useCallback } from "react";

const NOTIF_ENABLED_KEY = "fitai-notif-enabled";
const NOTIF_TIMER_KEY = "fitai-notif-scheduled";

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

  // Listen for reschedule messages from SW
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    const handler = (event: MessageEvent) => {
      if (event.data?.type === "RESCHEDULE_NOTIFICATION") {
        scheduleDailyReminder();
      }
    };

    navigator.serviceWorker.addEventListener("message", handler);
    return () => navigator.serviceWorker.removeEventListener("message", handler);
  }, []);

  // Auto-schedule if already enabled
  useEffect(() => {
    if (
      isSupported &&
      permission === "granted" &&
      localStorage.getItem(NOTIF_ENABLED_KEY) === "true"
    ) {
      scheduleDailyReminder();
    }
  }, [isSupported, permission]);

  const requestPermission = useCallback(async () => {
    if (!isSupported) return false;
    const result = await Notification.requestPermission();
    setPermission(result);
    if (result === "granted") {
      localStorage.setItem(NOTIF_ENABLED_KEY, "true");
      scheduleDailyReminder();
      // Try to register periodic sync
      tryPeriodicSync();
      return true;
    }
    return false;
  }, [isSupported]);

  return { permission, isSupported, requestPermission };
}

function getDelayUntil7PM(): number {
  const now = new Date();
  const target = new Date();
  target.setHours(7, 0, 0, 0);
  if (target <= now) {
    target.setDate(target.getDate() + 1);
  }
  return target.getTime() - now.getTime();
}

function scheduleDailyReminder() {
  if (!("serviceWorker" in navigator)) return;
  if (Notification.permission !== "granted") return;

  const delay = getDelayUntil7PM();
  const lang = localStorage.getItem("fitai-lang") || "en";

  // Send message to SW to schedule
  navigator.serviceWorker.ready.then((reg) => {
    reg.active?.postMessage({
      type: "SCHEDULE_NOTIFICATION",
      delay,
      lang,
    });
  });

  localStorage.setItem(NOTIF_TIMER_KEY, Date.now().toString());
}

async function tryPeriodicSync() {
  try {
    const reg = await navigator.serviceWorker.ready;
    if ("periodicSync" in reg) {
      await (reg as any).periodicSync.register("daily-workout-reminder", {
        minInterval: 24 * 60 * 60 * 1000,
      });
    }
  } catch {
    // Periodic sync not supported, fallback to message-based scheduling
  }
}

// Register service worker
export function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker
        .register("/sw.js", { updateViaCache: "none" })
        .then((reg) => {
          // Check for updates
          reg.update();
        })
        .catch(() => {
          // SW registration failed silently
        });
    });
  }
}
