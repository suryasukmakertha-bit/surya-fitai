import { useState, useEffect, useCallback } from "react";

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

  const requestPermission = useCallback(async () => {
    if (!isSupported) return false;
    const result = await Notification.requestPermission();
    setPermission(result);
    if (result === "granted") {
      localStorage.setItem("fitai-notif-enabled", "true");
      scheduleDailyReminder();
      return true;
    }
    return false;
  }, [isSupported]);

  return { permission, isSupported, requestPermission };
}

function scheduleDailyReminder() {
  // Schedule via setTimeout to fire at 7 PM local time
  const scheduleNext = () => {
    const now = new Date();
    const target = new Date();
    target.setHours(19, 0, 0, 0);
    if (target <= now) {
      target.setDate(target.getDate() + 1);
    }
    const delay = target.getTime() - now.getTime();

    setTimeout(async () => {
      if (Notification.permission === "granted" && "serviceWorker" in navigator) {
        const reg = await navigator.serviceWorker.ready;
        const lang = localStorage.getItem("fitai-lang") || "en";
        
        const titles: Record<string, string> = {
          en: "Your workout is waiting 💪",
          id: "Waktunya latihan 💪",
          zh: "该锻炼了 💪",
        };
        const bodies: Record<string, string> = {
          en: "Your AI trainer is ready. Let's complete today's workout.",
          id: "Pelatih AI Anda sudah siap. Ayo selesaikan latihan hari ini.",
          zh: "你的 AI 教练已经准备好了。开始今天的训练吧。",
        };

        reg.showNotification(titles[lang] || titles.en, {
          body: bodies[lang] || bodies.en,
          icon: "/images/surya-fitai-logo.png",
          badge: "/images/surya-fitai-logo.png",
          data: { url: "/saved-plans" },
        });
      }
      // Re-schedule for next day
      scheduleNext();
    }, delay);
  };

  scheduleNext();
}

// Register service worker
export function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // SW registration failed silently
      });
    });
  }
}
