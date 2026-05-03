import { CheckCircle2, Flame } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function CheckinReminderModal({ open, onClose }: Props) {
  const { lang } = useLanguage();
  if (!open) return null;

  const title =
    lang === "id" ? "Rencana Tersimpan! Sekarang Mulai Latihan"
    : lang === "zh" ? "计划已保存！现在开始训练"
    : "Plan Saved! Now Start Training";

  const intro =
    lang === "id" ? "Setiap kali selesai latihan, catat progressmu dengan langkah berikut:"
    : lang === "zh" ? "每次完成训练后，按以下步骤记录进度："
    : "Every time you finish a workout, record your progress with these steps:";

  const steps =
    lang === "id"
      ? [
          "Buka menu Rencana di bagian bawah layar",
          "Pilih program yang ingin dijalankan",
          "Centang setiap exercise yang sudah diselesaikan",
          "Check-in di bagian Progress untuk melihat perkembanganmu",
        ]
      : lang === "zh"
      ? [
          "打开屏幕底部的「计划」菜单",
          "选择您刚完成的计划",
          "勾选每个已完成的训练",
          "请在进度栏查看您的进度",
        ]
      : [
          "Open the Plans tab in the bottom navigation",
          "Select the program you just ran",
          "Check off every exercise you completed",
          "Check-in in the Progress section to see your development",
        ];

  const outro =
    lang === "id" ? "Konsistensi check-in ini yang membantu Coach Surya memantau progressmu secara akurat."
    : lang === "zh" ? "坚持打卡帮助Coach Surya准确监控您的进度。"
    : "Consistent check-ins help Coach Surya accurately monitor your progress.";

  const primary =
    lang === "id" ? "Mengerti!"
    : lang === "zh" ? "明白了！"
    : "Got it!";

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
          <CheckCircle2 size={40} color="#ff6b00" />
        </div>
        <h2
          className="text-center font-bold mb-3 flex items-center justify-center gap-2 flex-wrap"
          style={{ color: "#fff", fontSize: 20, lineHeight: 1.3 }}
        >
          <span>{title}</span>
          <Flame size={20} color="#ff6b00" />
        </h2>
        <div className="mb-6" style={{ color: "rgba(255,255,255,0.75)", fontSize: 14, lineHeight: 1.6 }}>
          <p className="mb-3">{intro}</p>
          <ul className="space-y-2 mb-3">
            {steps.map((s, i) => (
              <li key={i} className="flex items-start">
                <span
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: "50%",
                    background: "#ff6b00",
                    color: "#ffffff",
                    fontSize: 11,
                    fontWeight: 700,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    marginRight: 8,
                    marginTop: 2,
                  }}
                >
                  {i + 1}
                </span>
                <span>{s}</span>
              </li>
            ))}
          </ul>
          <p>{outro}</p>
        </div>
        <button
          onClick={onClose}
          className="w-full"
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
      </div>
    </div>
  );
}