import { Flame } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface PlanExtendBannerProps {
  monthNumber: number;
  onExtend: () => void;
}

export default function PlanExtendBanner({ monthNumber, onExtend }: PlanExtendBannerProps) {
  const { lang } = useLanguage();

  const message =
    lang === "id"
      ? `Bulan ${monthNumber} hampir selesai! Siap lanjut?`
      : lang === "zh"
        ? `第${monthNumber}个月快完成了！准备好继续了吗？`
        : `Month ${monthNumber} almost done! Ready to continue?`;

  const buttonLabel =
    lang === "id"
      ? `Lanjut ke Bulan ${monthNumber + 1}`
      : lang === "zh"
        ? `继续第${monthNumber + 1}个月`
        : `Continue to Month ${monthNumber + 1}`;

  return (
    <div
      className="flex items-center justify-between gap-3"
      style={{
        background: "rgba(0,255,120,0.08)",
        border: "1px solid rgba(0,255,120,0.25)",
        borderRadius: 12,
        padding: "14px 16px",
      }}
    >
      <div className="flex items-center gap-2 min-w-0">
        <Flame className="w-4 h-4 shrink-0" style={{ color: "#00ff78" }} strokeWidth={2} />
        <span
          className="truncate"
          style={{ fontSize: 13, color: "rgba(255,255,255,0.75)" }}
        >
          {message}
        </span>
      </div>
      <button
        type="button"
        onClick={onExtend}
        className="shrink-0 transition-opacity hover:opacity-90"
        style={{
          background: "#00ff78",
          color: "#000",
          fontWeight: 700,
          fontSize: 12,
          padding: "8px 14px",
          borderRadius: 8,
        }}
      >
        {buttonLabel}
      </button>
    </div>
  );
}
