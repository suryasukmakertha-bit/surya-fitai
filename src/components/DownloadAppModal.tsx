import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Smartphone, Monitor, Share2 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePWAInstall, getGlobalDeferredPrompt } from "@/hooks/usePWAInstall";

const texts = {
  en: {
    title: "Install Surya-FitAi",
    alreadyTitle: "App is already installed!",
    alreadyDesc: "You can now open Surya-FitAi directly from your home screen.",
    android: "Tap 'Install' when the prompt appears or use browser menu → Install app.",
    ios: "Tap the Share button → Add to Home Screen.",
    desktop: "Click the install icon in the browser address bar.",
    installNow: "Install Now",
    close: "Close",
    androidLabel: "Android",
    iosLabel: "iOS (Safari)",
    desktopLabel: "Desktop",
    yourDevice: "Your device",
    otherWays: "Other ways to install",
  },
  id: {
    title: "Pasang Surya-FitAi",
    alreadyTitle: "Aplikasi sudah terpasang!",
    alreadyDesc: "Anda dapat membuka Surya-FitAi langsung dari layar utama.",
    android: "Ketuk 'Pasang' saat muncul atau gunakan menu browser → Pasang aplikasi.",
    ios: "Ketuk tombol Bagikan → Tambahkan ke Layar Utama.",
    desktop: "Klik ikon pasang di bilah alamat browser.",
    installNow: "Pasang Sekarang",
    close: "Tutup",
    androidLabel: "Android",
    iosLabel: "iOS (Safari)",
    desktopLabel: "Desktop",
    yourDevice: "Perangkat Anda",
    otherWays: "Cara lain untuk memasang",
  },
  zh: {
    title: "安装 Surya-FitAi",
    alreadyTitle: "应用已安装！",
    alreadyDesc: "您现在可以直接从主屏幕打开 Surya-FitAi。",
    android: "出现提示时点击'安装'，或使用浏览器菜单 → 安装应用。",
    ios: "点击分享按钮 → 添加到主屏幕。",
    desktop: "点击浏览器地址栏中的安装图标。",
    installNow: "立即安装",
    close: "关闭",
    androidLabel: "Android",
    iosLabel: "iOS (Safari)",
    desktopLabel: "桌面",
    yourDevice: "您的设备",
    otherWays: "其他安装方式",
  },
};

const platformConfig = {
  android: { icon: Smartphone, labelKey: "androidLabel" as const, textKey: "android" as const },
  ios: { icon: Share2, labelKey: "iosLabel" as const, textKey: "ios" as const },
  desktop: { icon: Monitor, labelKey: "desktopLabel" as const, textKey: "desktop" as const },
};

interface DownloadAppModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function DownloadAppModal({ open, onOpenChange }: DownloadAppModalProps) {
  const { lang } = useLanguage();
  const { isStandalone, device, canPrompt, triggerInstall } = usePWAInstall();
  const t = texts[lang] || texts.en;

  const handleInstall = async () => {
    if (canPrompt) {
      const success = await triggerInstall();
      if (success) onOpenChange(false);
    }
  };

  // Current device first, then others
  const otherDevices = (["android", "ios", "desktop"] as const).filter(d => d !== device);
  const currentPlatform = platformConfig[device];
  const CurrentIcon = currentPlatform.icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm mx-auto rounded-xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-display font-bold text-center">
            {isStandalone ? t.alreadyTitle : t.title}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Install Surya-FitAi as app
          </DialogDescription>
        </DialogHeader>

        {isStandalone ? (
          <div className="flex flex-col items-center gap-4 py-6">
            <div className="w-16 h-16 rounded-full bg-primary/15 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-primary" />
            </div>
            <p className="text-sm text-muted-foreground text-center max-w-[260px]">
              {t.alreadyDesc}
            </p>
            <Button onClick={() => onOpenChange(false)} className="w-full font-bold">
              {t.close}
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-3 py-4">
            {/* Current device - highlighted */}
            <p className="text-xs font-semibold text-primary uppercase tracking-wider px-1">
              {t.yourDevice}
            </p>
            <div className="flex items-start gap-3 rounded-xl bg-primary/5 border border-primary/20 px-4 py-3">
              <div className="w-9 h-9 rounded-lg bg-primary/15 flex items-center justify-center shrink-0 mt-0.5">
                <CurrentIcon className="w-4 h-4 text-primary" />
              </div>
              <div>
                <span className="text-sm font-semibold text-foreground">{t[currentPlatform.labelKey]}</span>
                <p className="text-xs text-muted-foreground mt-0.5">{t[currentPlatform.textKey]}</p>
              </div>
            </div>

            {canPrompt && (
              <Button onClick={handleInstall} className="w-full font-bold">
                {t.installNow}
              </Button>
            )}

            {/* Other devices */}
            <p className="text-xs text-muted-foreground uppercase tracking-wider px-1 mt-2">
              {t.otherWays}
            </p>
            {otherDevices.map((d) => {
              const cfg = platformConfig[d];
              const Icon = cfg.icon;
              return (
                <div key={d} className="flex items-start gap-3 rounded-xl bg-card border border-border/50 px-4 py-3 opacity-70">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Icon className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <span className="text-sm font-semibold text-foreground">{t[cfg.labelKey]}</span>
                    <p className="text-xs text-muted-foreground mt-0.5">{t[cfg.textKey]}</p>
                  </div>
                </div>
              );
            })}

            <Button variant="ghost" onClick={() => onOpenChange(false)} className="w-full text-muted-foreground">
              {t.close}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
