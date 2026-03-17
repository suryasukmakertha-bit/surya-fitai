import { useState } from "react";
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
import { usePWAInstall } from "@/hooks/usePWAInstall";

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
  },
};

interface DownloadAppModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function DownloadAppModal({ open, onOpenChange }: DownloadAppModalProps) {
  const { lang } = useLanguage();
  const { isInstalled, isStandalone, isIOS, canPrompt, triggerInstall } = usePWAInstall();
  const t = texts[lang] || texts.en;
  const alreadyInstalled = isInstalled || isStandalone;

  const handleInstall = async () => {
    if (canPrompt) {
      const success = await triggerInstall();
      if (success) onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm mx-auto rounded-xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-display font-bold text-center">
            {alreadyInstalled ? t.alreadyTitle : t.title}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Install Surya-FitAi as app
          </DialogDescription>
        </DialogHeader>

        {alreadyInstalled ? (
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
          <div className="flex flex-col gap-4 py-4">
            {/* Android */}
            <div className="flex items-start gap-3 rounded-xl bg-card border border-border/50 px-4 py-3">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                <Smartphone className="w-4.5 h-4.5 text-primary" />
              </div>
              <div>
                <span className="text-sm font-semibold text-foreground">{t.androidLabel}</span>
                <p className="text-xs text-muted-foreground mt-0.5">{t.android}</p>
              </div>
            </div>

            {/* iOS */}
            <div className="flex items-start gap-3 rounded-xl bg-card border border-border/50 px-4 py-3">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                <Share2 className="w-4.5 h-4.5 text-primary" />
              </div>
              <div>
                <span className="text-sm font-semibold text-foreground">{t.iosLabel}</span>
                <p className="text-xs text-muted-foreground mt-0.5">{t.ios}</p>
              </div>
            </div>

            {/* Desktop */}
            <div className="flex items-start gap-3 rounded-xl bg-card border border-border/50 px-4 py-3">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                <Monitor className="w-4.5 h-4.5 text-primary" />
              </div>
              <div>
                <span className="text-sm font-semibold text-foreground">{t.desktopLabel}</span>
                <p className="text-xs text-muted-foreground mt-0.5">{t.desktop}</p>
              </div>
            </div>

            {canPrompt && (
              <Button onClick={handleInstall} className="w-full font-bold mt-2">
                {t.installNow}
              </Button>
            )}

            <Button variant="ghost" onClick={() => onOpenChange(false)} className="w-full text-muted-foreground">
              {t.close}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
