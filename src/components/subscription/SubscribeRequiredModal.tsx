import { Lock, X } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSubscribe: () => void;
}

const TEXT = {
  en: {
    title: "Subscription required",
    body: "Your subscription has ended. Generating a plan requires an active subscription. Subscribe again to continue your journey with Coach Surya.",
    cta: "Subscribe Now",
    later: "Maybe later",
  },
  id: {
    title: "Berlangganan diperlukan",
    body: "Subscription kamu telah berakhir. Generate plan membutuhkan subscription aktif. Mulai lagi untuk melanjutkan program bersama Coach Surya.",
    cta: "Berlangganan Sekarang",
    later: "Nanti saja",
  },
  zh: {
    title: "需要订阅",
    body: "您的订阅已结束。生成计划需要有效订阅。重新订阅以继续与Coach Surya的旅程。",
    cta: "立即订阅",
    later: "稍后再说",
  },
};

export default function SubscribeRequiredModal({ isOpen, onClose, onSubscribe }: Props) {
  const { lang } = useLanguage();
  const t = TEXT[lang as keyof typeof TEXT] ?? TEXT.en;
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[95] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-md bg-card border border-border rounded-t-3xl sm:rounded-3xl shadow-2xl animate-in slide-in-from-bottom duration-300">
        <div className="h-1 w-full bg-gradient-to-r from-[#ff6b00] to-[#ff3d7f] rounded-t-3xl" />
        <button onClick={onClose} className="absolute right-4 top-4 text-muted-foreground hover:text-foreground" aria-label="Close">
          <X className="w-5 h-5" />
        </button>
        <div className="px-6 py-7 space-y-5">
          <div className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-display font-bold text-foreground">{t.title}</h2>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">{t.body}</p>
          <button
            onClick={onSubscribe}
            className="w-full py-3.5 rounded-2xl font-bold text-base bg-gradient-to-r from-[#ff6b00] to-[#ff3d7f] text-primary-foreground hover:opacity-90 transition-opacity active:scale-[0.97] transition-transform"
          >
            {t.cta}
          </button>
          <button onClick={onClose} className="w-full text-center text-sm text-muted-foreground hover:text-foreground py-1">
            {t.later}
          </button>
        </div>
      </div>
    </div>
  );
}