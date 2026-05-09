import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Bell, Sparkles } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

const texts = {
  en: {
    title: "Daily Workout Reminder",
    desc: "Allow daily workout reminders?",
    enable: "Allow",
    later: "Later",
  },
  id: {
    title: "Pengingat Latihan Harian",
    desc: "Izinkan pengingat latihan harian?",
    enable: "Izinkan",
    later: "Nanti",
  },
  zh: {
    title: "每日训练提醒",
    desc: "允许每日训练提醒？",
    enable: "允许",
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
            <Sparkles className="w-4 h-4" />
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
