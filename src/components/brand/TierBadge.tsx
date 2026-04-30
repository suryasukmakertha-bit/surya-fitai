export type Tier = "FREE" | "TRIAL" | "PAID" | "EXPIRED" | "ADMIN";

interface TierBadgeProps {
  tier: Tier;
  className?: string;
}

const STYLES: Record<Tier, { bg: string; color: string; label: string }> = {
  FREE:    { bg: "rgba(255,255,255,0.10)", color: "#888888", label: "FREE" },
  TRIAL:   { bg: "rgba(59,130,246,0.15)",  color: "#60a5fa", label: "TRIAL" },
  PAID:    { bg: "rgba(255,107,0,0.15)",   color: "#ff6b00", label: "PAID" },
  EXPIRED: { bg: "rgba(239,68,68,0.15)",   color: "#f87171", label: "EXPIRED" },
  ADMIN:   { bg: "rgba(168,85,247,0.15)",  color: "#a855f7", label: "ADMIN" },
};

export default function TierBadge({ tier, className = "" }: TierBadgeProps) {
  const s = STYLES[tier];
  return (
    <span
      className={`inline-flex items-center font-extrabold uppercase ${className}`}
      style={{
        background: s.bg,
        color: s.color,
        fontSize: 10,
        letterSpacing: "0.08em",
        padding: "2px 8px",
        borderRadius: 5,
        lineHeight: 1.4,
      }}
    >
      {s.label}
    </span>
  );
}