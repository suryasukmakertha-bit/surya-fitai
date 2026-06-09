import { Flame } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface PlanExtendBannerProps {
  monthNumber: number;
  onExtend: () => void;
}

export default function PlanExtendBanner({ monthNumber, onExtend }: PlanExtendBannerProps) {
  const { t } = useLanguage();
  const message = (t as any)["extendMonth.prompt"];
  const buttonLabel = (t as any)["extendMonth.button"];

  return (
    <div
      className="flex items-center justify-between gap-3"
      style={{
        background: "rgba(255,107,0,0.08)",
        border: "1px solid rgba(255,107,0,0.25)",
        borderRadius: 12,
        padding: "14px 16px",
      }}
    >
      <div className="flex items-center gap-2 min-w-0">
        <Flame className="w-4 h-4 shrink-0" style={{ color: "#ff6b00" }} strokeWidth={2} />
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
          background: "#ff6b00",
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
