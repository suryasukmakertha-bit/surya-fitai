import { Award } from "lucide-react";
import { TIER_COLOR } from "@/lib/medalCatalog";
import { useLanguage } from "@/contexts/LanguageContext";

interface Props {
  medal: { medal_id: string; medal_name: string; medal_tier: string };
}

export default function FeaturedMedalChip({ medal }: Props) {
  const { t } = useLanguage();
  const color = TIER_COLOR[medal.medal_tier] || "#ff6b00";
  const localizedName = (t as any)[`medal.${medal.medal_id}.name`] || medal.medal_name;
  const truncated = localizedName.length > 12 ? localizedName.slice(0, 12) + "…" : localizedName;
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
      title={localizedName}
    >
      <Award size={10} color={color} />
      <span className="truncate">{truncated}</span>
    </span>
  );
}
