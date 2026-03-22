import { useState, useEffect, useCallback } from "react";
import { X, Bell, BellOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePushNotifications } from "@/hooks/usePushNotifications";

function detectPlatform(): "ios" | "android" | "desktop" {
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua)) return "ios";
  if (/Android/.test(ua)) return "android";
  return "desktop";
}

function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as any).standalone === true
  );
}

const texts = {
  en: {
    iosInstallTitle: "📲 Install App First",
    iosInstallDesc:
      "To receive notifications on iOS, you need to add Surya-FitAi to your Home Screen first. Tap Share (□↑) → Add to Home Screen → Open the installed app → Enable notifications.",
    defaultTitle: "🔔 Stay on Track",
    defaultDesc: "Get daily workout motivation — even when the app is closed.",
    enableBtn: "Enable Notifications",
    grantedTitle: "🔔 Notifications are ON",
    grantedDesc: "You'll receive daily workout reminders based on your timezone.",
    testBtn: "Send Test Notification",
    grantedHint: "To turn off, go to your device or browser notification settings.",
    deniedTitle: "🔕 Notifications are OFF",
    deniedDesc: "You previously blocked notifications. To re-enable:",
    deniedAndroid:
      "Go to your phone Settings → Apps → Surya-FitAi → Notifications → turn on Allow notifications",
    deniedIos:
      "Go to iPhone Settings → Surya-FitAi → Notifications → Allow Notifications",
    deniedDesktop:
      "Click the 🔒 lock icon in your browser address bar → Notifications → Allow",
  },
  id: {
    iosInstallTitle: "📲 Install App Dulu",
    iosInstallDesc:
      "Untuk menerima notifikasi di iOS, tambahkan Surya-FitAi ke Home Screen kamu dulu. Ketuk Share (□↑) → Add to Home Screen → Buka app yang terinstall → Aktifkan notifikasi.",
    defaultTitle: "🔔 Tetap Semangat",
    defaultDesc: "Dapatkan motivasi latihan harian — bahkan saat app ditutup.",
    enableBtn: "Aktifkan Notifikasi",
    grantedTitle: "🔔 Notifikasi Aktif",
    grantedDesc: "Kamu akan menerima pengingat latihan harian sesuai timezone kamu.",
    testBtn: "Kirim Notifikasi Tes",
    grantedHint:
      "Untuk menonaktifkan, buka pengaturan notifikasi di perangkat atau browser kamu.",
    deniedTitle: "🔕 Notifikasi Nonaktif",
    deniedDesc: "Kamu sebelumnya memblokir notifikasi. Untuk mengaktifkan kembali:",
    deniedAndroid:
      "Buka Pengaturan HP → Aplikasi → Surya-FitAi → Notifikasi → aktifkan Izinkan notifikasi",
    deniedIos:
      "Buka Pengaturan iPhone → Surya-FitAi → Notifikasi → Izinkan Notifikasi",
    deniedDesktop:
      "Klik ikon 🔒 di address bar browser → Notifikasi → Izinkan",
  },
  zh: {
    iosInstallTitle: "📲 请先安装应用",
    iosInstallDesc:
      "要在iOS上接收通知，请先将Surya-FitAi添加到主屏幕。点击分享(□↑)→添加到主屏幕→打开已安装的应用→开启通知。",
    defaultTitle: "🔔 保持训练节奏",
    defaultDesc: "即使关闭应用，也能收到每日训练动力。",
    enableBtn: "开启通知",
    grantedTitle: "🔔 通知已开启",
    grantedDesc: "您将根据时区收到每日训练提醒。",
    testBtn: "发送测试通知",
    grantedHint: "如需关闭，请前往设备或浏览器的通知设置。",
    deniedTitle: "🔕 通知已关闭",
    deniedDesc: "您之前已屏蔽通知。如需重新开启：",
    deniedAndroid:
      "前往手机设置→应用→Surya-FitAi→通知→开启允许通知",
    deniedIos:
      "前往iPhone设置→Surya-FitAi→通知→允许通知",
    deniedDesktop:
      "点击浏览器地址栏中的🔒图标→通知→允许",
  },
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function NotificationSettingsPopup({ open, onOpenChange }: Props) {
  const { lang } = useLanguage();
  const { permission, isSupported, requestPermission } = usePushNotifications();
  const t = texts[lang as keyof typeof texts] || texts.en;
  const platform = detectPlatform();
  const standalone = isStandalone();

  const handleTest = useCallback(async () => {
    if (!("serviceWorker" in navigator)) return;
    const reg = await navigator.serviceWorker.ready;
    await reg.showNotification("Surya-FitAi 💪", {
      body:
        lang === "id"
          ? "Notifikasi berfungsi dengan baik!"
          : lang === "zh"
          ? "通知正常工作！"
          : "Notifications are working!",
      icon: "/icons/icon-192.png?v=2",
      badge: "/icons/icon-192.png?v=2",
    } as NotificationOptions);
  }, [lang]);

  const handleEnable = useCallback(async () => {
    await requestPermission();
  }, [requestPermission]);

  if (!open) return null;

  // iOS not standalone
  const showIosInstall = platform === "ios" && !standalone;

  let content: React.ReactNode;

  if (showIosInstall) {
    content = (
      <div className="space-y-3">
        <h3 className="text-lg font-bold text-foreground">{t.iosInstallTitle}</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">{t.iosInstallDesc}</p>
      </div>
    );
  } else if (permission === "default" || !isSupported) {
    content = (
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-foreground">{t.defaultTitle}</h3>
        <p className="text-sm text-muted-foreground">{t.defaultDesc}</p>
        <Button className="w-full h-11 font-bold" onClick={handleEnable}>
          {t.enableBtn}
        </Button>
      </div>
    );
  } else if (permission === "granted") {
    content = (
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-foreground">{t.grantedTitle}</h3>
        <p className="text-sm text-muted-foreground">{t.grantedDesc}</p>
        <Button variant="outline" className="w-full h-11 font-bold" onClick={handleTest}>
          {t.testBtn}
        </Button>
        <p className="text-xs text-muted-foreground/70">{t.grantedHint}</p>
      </div>
    );
  } else {
    // denied
    const steps =
      platform === "ios"
        ? t.deniedIos
        : platform === "android"
        ? t.deniedAndroid
        : t.deniedDesktop;
    content = (
      <div className="space-y-3">
        <h3 className="text-lg font-bold text-foreground">{t.deniedTitle}</h3>
        <p className="text-sm text-muted-foreground">{t.deniedDesc}</p>
        <div className="bg-secondary/40 rounded-lg p-3">
          <p className="text-sm text-foreground">{steps}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[85]" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => onOpenChange(false)} />
      <div className="absolute bottom-0 left-0 right-0 max-h-[80vh] bg-card border-t border-border rounded-t-2xl shadow-2xl animate-in slide-in-from-bottom duration-300 overflow-y-auto">
        <div className="px-5 py-4 flex items-center justify-between border-b border-border">
          <span className="font-display font-bold text-foreground text-lg">
            🔔{" "}
            {lang === "id" ? "Notifikasi" : lang === "zh" ? "通知" : "Notifications"}
          </span>
          <button
            onClick={() => onOpenChange(false)}
            className="text-muted-foreground hover:text-foreground p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="px-5 py-5">{content}</div>
      </div>
    </div>
  );
}
