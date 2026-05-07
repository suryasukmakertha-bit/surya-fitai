import { useEffect } from "react";
import { Award } from "lucide-react";
import type { NewMedal } from "@/lib/dailyChallenge";
import { downloadMedalPng } from "@/lib/medalImage";
import { useLanguage } from "@/contexts/LanguageContext";

interface Props {
  medal: NewMedal;
  xpReward: number;
  onClose: () => void;
}

const TIER_COLORS: Record<string, string> = {
  bronze: "#cd7f32",
  silver: "#c0c0c0",
  gold: "#ffd700",
  platinum: "#e5e4e2",
};

export default function MedalEarnedPopup({ medal, xpReward, onClose }: Props) {
  const { t, lang } = useLanguage();
  const locale = lang === "id" ? "id-ID" : lang === "zh" ? "zh-CN" : "en-US";
  useEffect(() => {
    const t = setTimeout(onClose, 10000);
    return () => clearTimeout(t);
  }, [onClose]);

  const tierColor = TIER_COLORS[medal.medal_tier] || "#ff6b00";
  const localizedName = (t as any)[`medal.${medal.medal_id}.name`] || medal.medal_name;
  const localizedDesc = (t as any)[`medal.${medal.medal_id}.description`] || medal.medal_description;
  const localizedTier = (t as any)[`medal.tier.${medal.medal_tier}`] || medal.medal_tier;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[1000] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)" }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[320px] text-center"
        style={{
          background: "#1a1a1a",
          border: "1px solid rgba(255,107,0,0.3)",
          borderRadius: 20,
          padding: "32px 24px",
          animation: "medalDrop 0.4s ease-out",
        }}
      >
        <div className="flex justify-center mb-3" style={{ animation: "medalPulse 1.5s ease-in-out infinite" }}>
          <Award
            size={64}
            color={tierColor}
            style={{ filter: `drop-shadow(0 0 20px ${tierColor})` }}
          />
        </div>
        <p
          className="font-extrabold mb-2"
          style={{ color: "#ff6b00", fontSize: 10, letterSpacing: "0.15em" }}
        >
          {(t as any)["medal.newEarned"]}
        </p>
        <h2 className="font-extrabold text-white mb-2" style={{ fontSize: 22 }}>
          {localizedName}
        </h2>
        <div className="flex justify-center mb-3">
          <span
            className="inline-block font-bold"
            style={{
              background: tierColor,
              color: "#000",
              padding: "3px 10px",
              borderRadius: 999,
              fontSize: 10,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
            }}
          >
            {localizedTier}
          </span>
        </div>
        <p className="mb-4" style={{ color: "#888", fontSize: 13 }}>
          {localizedDesc}
        </p>
        <div style={{ height: 1, background: "rgba(255,255,255,0.08)", margin: "12px 0" }} />
        <p className="font-bold mb-4" style={{ color: "#ff6b00" }}>
          +{xpReward} XP
        </p>
        <button
          onClick={() => {
            const earnedAt = new Date().toISOString();
            const dateStr = new Date(earnedAt).toLocaleDateString(locale, { day: "2-digit", month: "short", year: "numeric" });
            const earnedTpl = ((t as any)["medals.dateEarned"] || "Earned: {{date}}").replace("{{date}}", dateStr);
            downloadMedalPng({
              medal_id: medal.medal_id,
              medal_name: medal.medal_name,
              medal_tier: medal.medal_tier,
              medal_description: medal.medal_description,
              earned_at: earnedAt,
              i18n: {
                name: localizedName,
                description: localizedDesc,
                tier: localizedTier,
                header: (t as any)["medal.png.header"],
                tagline: (t as any)["medal.png.tagline"],
                earnedLabel: earnedTpl,
                locale,
              },
            });
          }}
          className="w-full font-bold text-white"
          style={{
            background: "linear-gradient(90deg,#ff6b00,#ff3d7f)",
            borderRadius: 10,
            padding: 10,
          }}
        >
          {(t as any)["medal.downloadShare"]}
        </button>
        <button
          onClick={onClose}
          className="w-full font-semibold"
          style={{
            marginTop: 8,
            background: "transparent",
            color: "#888",
            padding: 10,
          }}
        >
          {(t as any)["medal.close"]}
        </button>
      </div>
      <style>{`
        @keyframes medalDrop {
          from { transform: translateY(-100px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes medalPulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
      `}</style>
    </div>
  );
}