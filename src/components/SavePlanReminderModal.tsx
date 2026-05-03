import { BookmarkPlus } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface Props {
  open: boolean;
  saving?: boolean;
  onSave: () => void;
  onViewFirst: () => void;
}

export default function SavePlanReminderModal({ open, saving, onSave, onViewFirst }: Props) {
  const { lang } = useLanguage();
  if (!open) return null;

  const title =
    lang === "id" ? "Simpan Rencana Kamu!"
    : lang === "zh" ? "保存您的计划！"
    : "Save Your Plan!";

  const body =
    lang === "id"
      ? "Rencana yang baru dibuat Coach Surya khusus untukmu ini perlu disimpan agar kamu bisa mulai latihan. Kamu bisa mengaksesnya kapan saja melalui menu Rencana di bagian bawah layar."
      : lang === "zh"
      ? "Coach Surya专为您创建的计划需要保存，这样您才能开始训练。随时通过底部的「计划」菜单访问。"
      : "This plan Coach Surya just created specifically for you needs to be saved so you can start training. Access it anytime from the Plans tab in the bottom navigation.";

  const primary =
    lang === "id" ? "Simpan Rencana Sekarang"
    : lang === "zh" ? "立即保存计划"
    : "Save Plan Now";

  const secondary =
    lang === "id" ? "Lihat dulu"
    : lang === "zh" ? "先查看"
    : "View first";

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.75)" }}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-sm"
        style={{
          background: "#111",
          border: "1px solid rgba(255,107,0,0.3)",
          borderRadius: 20,
          padding: 28,
        }}
      >
        <div className="flex justify-center mb-4">
          <BookmarkPlus size={40} color="#ff6b00" />
        </div>
        <h2
          className="text-center font-bold mb-3 flex items-center justify-center gap-2"
          style={{ color: "#fff", fontSize: 20 }}
        >
          <BookmarkPlus size={20} color="#ff6b00" />
          <span>{title}</span>
        </h2>
        <p
          className="text-center mb-6"
          style={{ color: "rgba(255,255,255,0.75)", fontSize: 14, lineHeight: 1.55 }}
        >
          {body}
        </p>
        <button
          onClick={onSave}
          disabled={saving}
          className="w-full transition-opacity disabled:opacity-60"
          style={{
            background: "#ff6b00",
            color: "#000",
            fontWeight: 700,
            borderRadius: 12,
            padding: "14px 16px",
            fontSize: 15,
          }}
        >
          {primary}
        </button>
        <button
          onClick={onViewFirst}
          className="w-full mt-4 text-center"
          style={{
            background: "transparent",
            color: "rgba(255,255,255,0.4)",
            fontSize: 13,
          }}
        >
          {secondary}
        </button>
      </div>
    </div>
  );
}