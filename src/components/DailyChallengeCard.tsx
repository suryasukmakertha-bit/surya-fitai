import { useEffect, useState } from "react";
import { Zap, Star, CheckCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  getOrCreateDailyChallenge,
  getUserChallengeProgress,
  acceptChallenge,
  completeChallenge,
  checkAndAwardMedals,
  todayDateStr,
  type DailyChallenge,
  type ChallengeProgress,
  type NewMedal,
} from "@/lib/dailyChallenge";
import MedalEarnedPopup from "./MedalEarnedPopup";

const DIFF_STYLE: Record<string, { bg: string; color: string }> = {
  mudah: { bg: "rgba(16,185,129,0.15)", color: "#10b981" },
  sedang: { bg: "rgba(255,107,0,0.15)", color: "#ff6b00" },
  sulit: { bg: "rgba(239,68,68,0.15)", color: "#ef4444" },
};

function Skeleton() {
  return (
    <div
      className="mt-5"
      style={{
        borderRadius: 16,
        padding: 16,
        height: 168,
        border: "0.5px solid rgba(255,107,0,0.2)",
        background:
          "linear-gradient(90deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.10) 50%, rgba(255,255,255,0.04) 100%)",
        backgroundSize: "200% 100%",
        animation: "dcShimmer 1.4s linear infinite",
      }}
    >
      <style>{`@keyframes dcShimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }`}</style>
    </div>
  );
}

export default function DailyChallengeCard() {
  const { user } = useAuth();
  const { lang, t } = useLanguage();
  const tt = (k: string, vars?: Record<string, string | number>) => {
    let s = (t as any)[k] || k;
    if (vars) for (const [k2, v] of Object.entries(vars)) s = s.replace(`{{${k2}}}`, String(v));
    return s;
  };
  const [loading, setLoading] = useState(true);
  const [challenge, setChallenge] = useState<DailyChallenge | null>(null);
  const [progress, setProgress] = useState<ChallengeProgress | null>(null);
  const [busy, setBusy] = useState(false);
  const [confettiKey, setConfettiKey] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const [medalQueue, setMedalQueue] = useState<NewMedal[]>([]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const ch = await getOrCreateDailyChallenge();
      if (cancelled) return;
      setChallenge(ch);
      if (ch) {
        const p = await getUserChallengeProgress(user.id, ch.challenge_date);
        if (cancelled) return;
        setProgress(p);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  if (!user) return null;
  if (loading) return <Skeleton />;
  if (!challenge) return null;

  const date = new Date(challenge.challenge_date + "T00:00:00");
  const dateLabel = date.toLocaleDateString(lang === "id" ? "id-ID" : lang === "zh" ? "zh-CN" : "en-US", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });

  const diff = DIFF_STYLE[challenge.difficulty] || DIFF_STYLE.sedang;
  const accepted = !!progress?.accepted_at;
  const completed = !!progress?.completed_at;

  const onAccept = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await acceptChallenge(user.id, challenge.challenge_date);
      setProgress({ accepted_at: new Date().toISOString(), completed_at: null, xp_earned: 0 });
    } finally {
      setBusy(false);
    }
  };

  const onComplete = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await completeChallenge(user.id, challenge.challenge_date, challenge.xp_reward);
      setProgress({
        accepted_at: progress?.accepted_at || new Date().toISOString(),
        completed_at: new Date().toISOString(),
        xp_earned: challenge.xp_reward,
      });
      setConfettiKey((k) => k + 1);
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 900);
      const earned = await checkAndAwardMedals(user.id);
      if (earned.length) setMedalQueue(earned);
    } finally {
      setBusy(false);
    }
  };

  const exerciseLabel = (t as any)[`exerciseName.${challenge.exercise_name}`] || challenge.exercise_name;

  return (
    <>
      <div
        className="mt-5"
        style={{
          background: "hsl(var(--surface))",
          border: "0.5px solid rgba(255,107,0,0.2)",
          borderRadius: 16,
          padding: 16,
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06), 0 2px 16px rgba(0,0,0,0.3)",
          position: "relative",
        }}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="flex items-center gap-1.5">
            <Zap size={12} color="#ff6b00" />
            <span style={{ fontSize: 10, fontWeight: 700, color: "#ff6b00", letterSpacing: "0.1em" }}>
              {tt("dailyChallenge.label")}
            </span>
          </span>
          <span style={{ fontSize: 10, color: "#888" }}>{dateLabel}</span>
        </div>

        <p className="font-extrabold text-foreground" style={{ fontSize: 18 }}>
          {exerciseLabel}
        </p>
        <p className="mb-3" style={{ fontSize: 13, color: "#888" }}>
          {tt("dailyChallenge.doX", { count: challenge.target_reps, exercise: exerciseLabel })}
        </p>

        <div className="flex items-center gap-2 mb-3">
          <span
            style={{
              background: diff.bg,
              color: diff.color,
              padding: "2px 8px",
              borderRadius: 5,
              fontSize: 10,
              fontWeight: 700,
            }}
          >
            {tt(`dailyChallenge.difficulty.${challenge.difficulty}`)}
          </span>
          <span
            className="inline-flex items-center gap-1"
            style={{
              background: "rgba(255,107,0,0.12)",
              color: "#ff6b00",
              padding: "2px 8px",
              borderRadius: 5,
              fontSize: 10,
              fontWeight: 700,
            }}
          >
            <Star size={10} color="#ff6b00" />
            {tt("dailyChallenge.xpReward", { xp: challenge.xp_reward })}
          </span>
        </div>

        {!accepted && (
          <button
            onClick={onAccept}
            disabled={busy}
            className="w-full font-bold text-white"
            style={{
              background: "linear-gradient(90deg,#ff6b00,#ff3d7f)",
              borderRadius: 10,
              padding: 10,
            }}
          >
            {tt("dailyChallenge.cta.accept")}
          </button>
        )}

        {accepted && !completed && (
          <button
            onClick={onComplete}
            disabled={busy}
            className="w-full font-bold inline-flex items-center justify-center gap-2"
            style={{
              background: "transparent",
              border: "1.5px solid #ff6b00",
              color: "#ff6b00",
              borderRadius: 10,
              padding: 10,
              position: "relative",
            }}
          >
            <CheckCircle size={16} />
            {tt("dailyChallenge.cta.complete")}
            {showConfetti && <Confetti key={confettiKey} />}
          </button>
        )}

        {completed && (
          <>
            <button
              disabled
              className="w-full font-bold inline-flex items-center justify-center gap-2"
              style={{
                background: "rgba(16,185,129,0.15)",
                color: "#10b981",
                border: "1px solid rgba(16,185,129,0.3)",
                borderRadius: 10,
                padding: 10,
                cursor: "default",
              }}
            >
              <CheckCircle size={16} />
              {tt("dailyChallenge.cta.done")}
            </button>
            <p className="text-center mt-1.5" style={{ color: "#10b981", fontSize: 10 }}>
              {tt("dailyChallenge.xpEarned", { xp: progress?.xp_earned || challenge.xp_reward })}
            </p>
          </>
        )}
      </div>

      {medalQueue.length > 0 && (
        <MedalEarnedPopup
          medal={medalQueue[0]}
          xpReward={challenge.xp_reward}
          onClose={() => setMedalQueue((q) => q.slice(1))}
        />
      )}
    </>
  );
}

const CONFETTI_COLORS = ["#ff6b00", "#ff3d7f", "#10b981", "#ffd700", "#3b82f6"];

function Confetti() {
  const dots = Array.from({ length: 10 });
  return (
    <>
      <span
        className="pointer-events-none absolute inset-0"
        style={{ overflow: "visible" }}
      >
        {dots.map((_, i) => {
          const angle = (i / dots.length) * Math.PI * 2;
          const dx = Math.cos(angle) * 60;
          const dy = Math.sin(angle) * 60;
          const color = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
          return (
            <span
              key={i}
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: color,
                transform: "translate(-50%,-50%)",
                animation: `dcBurst${i} 0.8s ease-out forwards`,
              }}
            />
          );
        })}
      </span>
      <style>{`
        ${dots
          .map((_, i) => {
            const angle = (i / dots.length) * Math.PI * 2;
            const dx = Math.cos(angle) * 60;
            const dy = Math.sin(angle) * 60;
            return `@keyframes dcBurst${i} { 0% { transform: translate(-50%,-50%) scale(1); opacity: 1; } 100% { transform: translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(0.4); opacity: 0; } }`;
          })
          .join("\n")}
      `}</style>
    </>
  );
}