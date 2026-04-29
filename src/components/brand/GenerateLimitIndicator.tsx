import { useLanguage } from "@/contexts/LanguageContext";

interface Props {
  used: number;
  max: number;
  /** when true, shows the dots inline; otherwise text only */
  showDots?: boolean;
  className?: string;
}

export default function GenerateLimitIndicator({ used, max, showDots = true, className = "" }: Props) {
  const { lang } = useLanguage();
  const safeMax = Number.isFinite(max) ? max : 0;
  const remaining = Math.max(0, safeMax - used);

  // Unlimited (admin)
  if (!Number.isFinite(max)) {
    const label =
      lang === "id" ? "Generate: tanpa batas" :
      lang === "zh" ? "生成：无限制" :
      "Generate: unlimited";
    return (
      <span className={`text-xs font-medium text-muted-foreground ${className}`}>
        {label}
      </span>
    );
  }

  const label =
    lang === "id" ? `Generate: ${remaining}/${safeMax} tersisa` :
    lang === "zh" ? `生成：剩余 ${remaining}/${safeMax}` :
    `Generate: ${remaining}/${safeMax} left`;

  return (
    <span className={`inline-flex items-center gap-2 text-xs font-medium text-muted-foreground ${className}`}>
      <span>{label}</span>
      {showDots && safeMax > 0 && safeMax <= 6 && (
        <span className="inline-flex items-center gap-1">
          {Array.from({ length: safeMax }).map((_, i) => {
            const filled = i < used;
            return (
              <span
                key={i}
                className="inline-block rounded-full"
                style={{
                  width: 8,
                  height: 8,
                  background: filled ? "#ff6b00" : "hsl(var(--surface))",
                  border: filled ? "none" : "1px solid hsl(var(--border) / 0.25)",
                }}
              />
            );
          })}
        </span>
      )}
    </span>
  );
}