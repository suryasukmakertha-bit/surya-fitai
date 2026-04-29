import { Lock } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface Props {
  isOpen: boolean;
  planName: string;
  onClose: () => void;
  onSubscribe: () => void;
}

export default function LockedPlanModal({ isOpen, planName, onClose, onSubscribe }: Props) {
  const { lang } = useLanguage();
  if (!isOpen) return null;

  const title =
    lang === "id" ? "Plan Ini Terkunci" :
    lang === "zh" ? "此计划已锁定" :
    "This Plan is Locked";

  const body =
    lang === "id"
      ? `Kamu hanya bisa mengakses 1 program paling terbaru di akun gratis.\n\nProgram '${planName}' tidak bisa dibuka karena ada program yang lebih baru tersimpan di akunmu.\n\nSubscribe untuk membuka semua program dan nikmati akses penuh ke semua fitur Coach Surya.`
      : lang === "zh"
        ? `免费账户只能访问最新的一个计划。\n\n'${planName}' 无法打开，因为您有更新的计划已保存。\n\n订阅以解锁所有保存的计划并享受Coach Surya的所有功能。`
        : `You can only access your most recent plan on a free account.\n\n'${planName}' cannot be opened because you have a newer plan saved.\n\nSubscribe to unlock all saved plans and enjoy full access to all Coach Surya features.`;

  const subscribeBtn =
    lang === "id" ? "Subscribe Sekarang — Rp 19.900/bln" :
    lang === "zh" ? "立即订阅 — Rp 19.900/月" :
    "Subscribe Now — Rp 19.900/month";

  const laterBtn =
    lang === "id" ? "Nanti saja" :
    lang === "zh" ? "稍后再说" :
    "Maybe later";

  return (
    <div className="fixed inset-0 z-[95] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative w-full sm:max-w-md mx-4 animate-in slide-in-from-bottom duration-300"
        style={{
          background: "#111",
          border: "1px solid rgba(255,107,0,0.3)",
          borderRadius: 20,
          padding: 28,
        }}
      >
        <div className="flex justify-center mb-4">
          <Lock className="w-12 h-12" style={{ color: "rgba(255,255,255,0.3)" }} strokeWidth={1.5} />
        </div>
        <h2 className="text-xl font-display font-bold text-foreground text-center mb-3">{title}</h2>
        <p className="text-sm text-muted-foreground text-center whitespace-pre-line mb-6 leading-relaxed">{body}</p>
        <button
          onClick={onSubscribe}
          className="w-full py-3.5 rounded-2xl font-bold text-base text-primary-foreground hover:opacity-90 transition-opacity active:scale-[0.97]"
          style={{ background: "linear-gradient(90deg, #ff6b00, #ff3d7f)" }}
        >
          {subscribeBtn}
        </button>
        <button
          onClick={onClose}
          className="w-full text-center text-sm text-muted-foreground hover:text-foreground py-3 mt-2"
        >
          {laterBtn}
        </button>
      </div>
    </div>
  );
}