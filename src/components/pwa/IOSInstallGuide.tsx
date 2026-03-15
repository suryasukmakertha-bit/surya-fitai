import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Share, Plus, ArrowDown } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

const texts = {
  en: {
    title: "Install on iPhone",
    close: "Got it!",
    steps: [
      { icon: Share, text: 'Tap the Share icon in Safari' },
      { icon: ArrowDown, text: 'Scroll down and select "Add to Home Screen"' },
      { icon: Plus, text: 'Tap "Add"' },
    ],
  },
  id: {
    title: "Install di iPhone",
    close: "Mengerti!",
    steps: [
      { icon: Share, text: 'Ketuk ikon Share di Safari' },
      { icon: ArrowDown, text: 'Scroll ke bawah lalu pilih "Add to Home Screen"' },
      { icon: Plus, text: 'Tekan "Add"' },
    ],
  },
  zh: {
    title: "在 iPhone 上安装",
    close: "知道了！",
    steps: [
      { icon: Share, text: '点击 Safari 的分享图标' },
      { icon: ArrowDown, text: '向下滚动并选择"添加到主屏幕"' },
      { icon: Plus, text: '点击"添加"' },
    ],
  },
};

interface IOSInstallGuideProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function IOSInstallGuide({ open, onOpenChange }: IOSInstallGuideProps) {
  const { lang } = useLanguage();
  const t = texts[lang] || texts.en;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm border-primary/20 p-0 overflow-hidden">
        <div className="bg-gradient-to-br from-primary/20 via-accent/10 to-transparent p-6 pb-4 text-center">
          <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
            <img src="/images/surya-fitai-logo.png" alt="" className="w-10 h-10 rounded-lg" />
          </div>
          <DialogTitle className="text-xl font-display font-bold text-foreground">{t.title}</DialogTitle>
          <DialogDescription className="sr-only">Steps to install the PWA on iOS</DialogDescription>
        </div>

        <div className="px-6 pb-2 space-y-4">
          {t.steps.map((step, i) => (
            <div key={i} className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                <span className="text-primary font-display font-bold text-sm">{i + 1}</span>
              </div>
              <div className="flex items-center gap-2 pt-2">
                <step.icon className="w-5 h-5 text-primary shrink-0" />
                <p className="text-sm text-foreground">{step.text}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="p-6 pt-4">
          <Button className="w-full h-11 font-bold" onClick={() => onOpenChange(false)}>
            {t.close}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
