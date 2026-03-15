import { useState, useEffect } from "react";
import { X, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePWAInstall } from "@/hooks/usePWAInstall";

const DISMISS_KEY = "fitai-install-banner-dismissed";
const DISMISS_DAYS = 7;

const texts = {
  en: { title: "Install Surya-FitAi", subtitle: "Get faster access and daily workout reminders.", install: "Install", dismiss: "Dismiss" },
  id: { title: "Install Surya-FitAi", subtitle: "Akses lebih cepat dan dapatkan pengingat latihan harian.", install: "Install", dismiss: "Nanti" },
  zh: { title: "安装 Surya-FitAi", subtitle: "更快访问并获得每日训练提醒。", install: "安装", dismiss: "稍后" },
};

interface InstallBannerProps {
  onInstallClick: () => void;
}

export default function InstallBanner({ onInstallClick }: InstallBannerProps) {
  const { lang } = useLanguage();
  const { isInstalled, isStandalone } = usePWAInstall();
  const [visible, setVisible] = useState(false);
  const [animateIn, setAnimateIn] = useState(false);

  const t = texts[lang] || texts.en;

  useEffect(() => {
    if (isInstalled || isStandalone) return;

    const dismissed = localStorage.getItem(DISMISS_KEY);
    if (dismissed) {
      const dismissedAt = parseInt(dismissed, 10);
      if (Date.now() - dismissedAt < DISMISS_DAYS * 24 * 60 * 60 * 1000) return;
    }

    // Show after scrolling 30% of page
    const handleScroll = () => {
      const scrollPercent = window.scrollY / (document.documentElement.scrollHeight - window.innerHeight);
      if (scrollPercent >= 0.3) {
        setVisible(true);
        window.removeEventListener("scroll", handleScroll);
      }
    };

    // Also show after 5 seconds
    const timer = setTimeout(() => {
      setVisible(true);
      window.removeEventListener("scroll", handleScroll);
    }, 5000);

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      clearTimeout(timer);
      window.removeEventListener("scroll", handleScroll);
    };
  }, [isInstalled, isStandalone]);

  useEffect(() => {
    if (visible) {
      requestAnimationFrame(() => setAnimateIn(true));
    }
  }, [visible]);

  const handleDismiss = () => {
    setAnimateIn(false);
    setTimeout(() => setVisible(false), 300);
    localStorage.setItem(DISMISS_KEY, Date.now().toString());
  };

  if (!visible) return null;

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-[60] transition-transform duration-300 ease-out ${
        animateIn ? "translate-y-0" : "-translate-y-full"
      }`}
    >
      <div className="bg-gradient-to-r from-primary/90 via-accent/80 to-primary/90 backdrop-blur-md shadow-lg">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-black border border-primary/30 flex items-center justify-center shrink-0 overflow-hidden p-1.5">
            <img 
              src="/icons/icon-192.png" 
              alt="Surya-FitAi" 
              className="w-full h-full object-contain"
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-primary-foreground font-display font-bold text-sm leading-tight truncate">{t.title}</p>
            <p className="text-primary-foreground/80 text-xs leading-tight truncate">{t.subtitle}</p>
          </div>
          <Button
            size="sm"
            variant="secondary"
            className="shrink-0 h-8 px-3 text-xs font-bold gap-1"
            onClick={onInstallClick}
          >
            <Download className="w-3.5 h-3.5" />
            {t.install}
          </Button>
          <button onClick={handleDismiss} className="text-primary-foreground/70 hover:text-primary-foreground p-1">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
