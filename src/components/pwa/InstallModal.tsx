import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Smartphone, Zap, Wifi } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

const texts = {
  en: {
    title: "Install Surya-FitAi",
    desc: "Turn Surya-FitAi into a real app and get daily workout reminders, faster loading, and offline access.",
    install: "Install Now",
    later: "Maybe Later",
  },
  id: {
    title: "Install Surya-FitAi",
    desc: "Jadikan Surya-FitAi seperti aplikasi dan dapatkan pengingat latihan setiap hari, akses lebih cepat, serta dukungan offline.",
    install: "Install Sekarang",
    later: "Nanti",
  },
  zh: {
    title: "安装 Surya-FitAi",
    desc: "将 Surya-FitAi 变成真正的应用，并获得每日训练提醒、更快的访问速度和离线支持。",
    install: "立即安装",
    later: "稍后",
  },
};

const features = {
  en: [
    { icon: Zap, text: "Faster loading" },
    { icon: Smartphone, text: "Home screen app" },
    { icon: Wifi, text: "Offline access" },
  ],
  id: [
    { icon: Zap, text: "Loading lebih cepat" },
    { icon: Smartphone, text: "Aplikasi di home screen" },
    { icon: Wifi, text: "Akses offline" },
  ],
  zh: [
    { icon: Zap, text: "更快加载" },
    { icon: Smartphone, text: "主屏幕应用" },
    { icon: Wifi, text: "离线访问" },
  ],
};

interface InstallModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInstall: () => void;
}

export default function InstallModal({ open, onOpenChange, onInstall }: InstallModalProps) {
  const { lang } = useLanguage();
  const t = texts[lang] || texts.en;
  const feats = features[lang] || features.en;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm border-primary/20 p-0 overflow-hidden">
        {/* Gradient header */}
        <div className="bg-gradient-to-br from-primary/20 via-accent/10 to-transparent p-6 pb-4 text-center">
          <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
            <img src="/images/surya-fitai-logo.png" alt="" className="w-10 h-10 rounded-lg" />
          </div>
          <DialogTitle className="text-xl font-display font-bold text-foreground">{t.title}</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground mt-2">{t.desc}</DialogDescription>
        </div>

        {/* Feature list */}
        <div className="px-6 pb-2 space-y-2">
          {feats.map((f, i) => (
            <div key={i} className="flex items-center gap-3 text-sm">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <f.icon className="w-4 h-4 text-primary" />
              </div>
              <span className="text-foreground">{f.text}</span>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="p-6 pt-4 space-y-2">
          <Button className="w-full h-11 font-bold gap-2" onClick={onInstall}>
            <Download className="w-4 h-4" />
            {t.install}
          </Button>
          <Button variant="ghost" className="w-full h-10 text-muted-foreground" onClick={() => onOpenChange(false)}>
            {t.later}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
