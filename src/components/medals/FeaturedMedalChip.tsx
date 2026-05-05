import { Award } from "lucide-react";
import { TIER_COLOR } from "@/lib/medalCatalog";

interface Props {
  medal: { medal_id: string; medal_name: string; medal_tier: string };
}

export default function FeaturedMedalChip({ medal }: Props) {
  const color = TIER_COLOR[medal.medal_tier] || "#ff6b00";
  const truncated = medal.medal_name.length > 12 ? medal.medal_name.slice(0, 12) + "…" : medal.medal_name;
  return (
    <span
      className="inline-flex items-center gap-1 max-w-[110px]"
      style={{
        height: 24,
        background: `${color}26`,
        border: `0.5px solid ${color}`,
        color,
        padding: "0 8px",
        borderRadius: 999,
        fontSize: 9,
        fontWeight: 700,
      }}
      title={medal.medal_name}
    >
      <Award size={10} color={color} />
      <span className="truncate">{truncated}</span>
    </span>
  );
}
