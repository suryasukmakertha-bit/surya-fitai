import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Bell } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

const texts = {
  en: {
    title: "Enable Workout Reminders",
    desc: "Get daily reminders from your AI trainer so you never miss a workout.",
    enable: "Enable Notifications",
    later: "Maybe Later",
  },
  id: {
    title: "Aktifkan Pengingat Latihan",
    desc: "Dapatkan pengingat harian dari pelatih AI Anda agar tidak melewatkan latihan.",
    enable: "Aktifkan Notifikasi",
    later: "Nanti",
  },
  zh: {
    title: "开启训练提醒",
    desc: "从你的 AI 教练那里获得每日提醒，不要错过训练。",
    enable: "开启通知",
    later: "稍后",
  },
};

interface NotificationPromptProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEnable: () => void;
}

export default function NotificationPrompt({ open, onOpenChange, onEnable }: NotificationPromptProps) {
  const { lang } = useLanguage();
  const t = texts[lang] || texts.en;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm border-primary/20 p-0 overflow-hidden">
        <div className="bg-gradient-to-br from-primary/20 via-accent/10 to-transparent p-6 pb-4 text-center">
          <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-black border border-primary/20 flex items-center justify-center overflow-hidden shadow-lg p-3">
            <img 
              src="/icons/icon-192.png" 
              alt="Surya-FitAi" 
              className="w-full h-full object-contain"
            />
          </div>
          <DialogTitle className="text-xl font-display font-bold text-foreground">{t.title}</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground mt-2">{t.desc}</DialogDescription>
        </div>

        <div className="p-6 pt-4 space-y-2">
          <Button className="w-full h-11 font-bold gap-2" onClick={onEnable}>
            <Bell className="w-4 h-4" />
            {t.enable}
          </Button>
          <Button variant="ghost" className="w-full h-10 text-muted-foreground" onClick={() => onOpenChange(false)}>
            {t.later}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
