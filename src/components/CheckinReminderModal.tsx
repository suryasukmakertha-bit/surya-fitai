import { CheckCircle2 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function CheckinReminderModal({ open, onClose }: Props) {
  const { lang } = useLanguage();
  if (!open) return null;

  const title =
    lang === "id" ? "Rencana Tersimpan! Sekarang Mulai Latihan 🔥"
    : lang === "zh" ? "计划已保存！现在开始训练 🔥"
    : "Plan Saved! Now Start Training 🔥";

  const body =
    lang === "id"
      ? "Setiap kali selesai latihan, catat progressmu dengan langkah berikut:\n\n1️⃣ Buka ☰ → Rencana Saya\n2️⃣ Pilih program yang ingin dijalankan\n3️⃣ Centang setiap exercise yang sudah diselesaikan\n4️⃣ Cek section Progress untuk melihat perkembanganmu\n\nKonsistensi check-in ini yang membantu Coach Surya memantau progressmu secara akurat."
      ? "Setiap kali selesai latihan, catat progressmu dengan langkah berikut:\n\n1️⃣ Buka ☰ → Rencana Saya\n2️⃣ Pilih program yang ingin dijalankan\n3️⃣ Centang setiap exercise yang sudah diselesaikan\n4️⃣ Check-in di bagian Progress untuk melihat perkembanganmu\n\nKonsistensi check-in ini yang membantu Coach Surya memantau progressmu secara akurat."
      : lang === "zh"
      ? "每次完成训练后，按以下步骤记录进度：\n\n1️⃣ 打开 ☰ → 我的计划\n2️⃣ 选择您刚完成的计划\n3️⃣ 勾选每个已完成的训练\n4️⃣ 请在进度栏查看您的进度\n\n坚持打卡帮助Coach Surya准确监控您的进度。"
      : "Every time you finish a workout, record your progress with these steps:\n\n1️⃣ Open ☰ → My Plans\n2️⃣ Select the program you just ran\n3️⃣ Check off every exercise you completed\n4️⃣ Check-in in the Progress section to see your development\n\nConsistent check-ins help Coach Surya accurately monitor your progress.";

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
          border: "1px solid rgba(0,255,120,0.3)",
          borderRadius: 20,
          padding: 28,
        }}
      >
        <div className="flex justify-center mb-4">
          <CheckCircle2 size={40} color="#00ff78" />
        </div>
        <h2
          className="text-center font-bold mb-3"
          style={{ color: "#fff", fontSize: 20, lineHeight: 1.3 }}
        >
          {title}
        </h2>
        <p
          className="mb-6"
          style={{
            color: "rgba(255,255,255,0.75)",
            fontSize: 14,
            lineHeight: 1.6,
            whiteSpace: "pre-line",
          }}
        >
          {body}
        </p>
        <button
          onClick={onClose}
          className="w-full"
          style={{
            background: "#00ff78",
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