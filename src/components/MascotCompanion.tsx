import { useEffect, useMemo, useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";

type Mood = "happy" | "determined" | "excited" | "wink" | "thinking" | "sleepy";

interface Props {
  streak?: number;
  workoutsToday?: number;
  hasActivePlan?: boolean;
  dailyChallengeCompleted?: boolean;
  daysSinceLastWorkout?: number;
  mood?: Mood;
  message?: string;
}

function resolveMood(p: Props): Mood {
  if (p.mood) return p.mood;
  if ((p.workoutsToday ?? 0) > 0) return "happy";
  if (p.dailyChallengeCompleted) return "excited";
  if ((p.streak ?? 0) >= 3) return "determined";
  if ((p.daysSinceLastWorkout ?? 0) > 3) return "sleepy";
  if (p.hasActivePlan) return "thinking";
  return "happy";
}

function getMessage(lang: string, mood: Mood, streak: number): string {
  const streakMsg = (l: "id" | "en" | "zh"): string => {
    if (streak <= 0) {
      return l === "id"
        ? "Yuk mulai streak hari ini! 💪"
        : l === "zh"
        ? "今天开始你的连击吧！💪"
        : "Start your streak today! 💪";
    }
    if (streak <= 2) {
      return l === "id"
        ? `Streak ${streak} hari — awal yang bagus! 🔥`
        : l === "zh"
        ? `连续${streak}天 — 好的开始！🔥`
        : `${streak} day streak — great start! 🔥`;
    }
    if (streak <= 5) {
      return l === "id"
        ? `Streak ${streak} hari — terus lanjutkan! 🔥`
        : l === "zh"
        ? `连续${streak}天 — 继续加油！🔥`
        : `${streak} day streak — keep going! 🔥`;
    }
    return l === "id"
      ? `Streak ${streak} hari 🔥 Jaga terus!`
      : l === "zh"
      ? `连续${streak}天 🔥 继续保持！`
      : `${streak} day streak 🔥 Keep it up!`;
  };
  const dict: Record<string, Record<Mood, string>> = {
    id: {
      happy: "Progress kamu keren 💪",
      determined: streakMsg("id"),
      excited: "Challenge selesai! Luar biasa ⭐",
      sleepy: "Sudah 3 hari nih... balik lagi yuk 👋",
      thinking: "Siap latihan hari ini? 🎯",
      wink: "Kamu pasti bisa 😉",
    },
    en: {
      happy: "You're doing great 💪",
      determined: streakMsg("en"),
      excited: "Challenge done! Amazing ⭐",
      sleepy: "Miss you... come back 👋",
      thinking: "Ready for today's workout? 🎯",
      wink: "You got this 😉",
    },
    zh: {
      happy: "你的进步很棒 💪",
      determined: streakMsg("zh"),
      excited: "挑战完成！太厉害了 ⭐",
      sleepy: "已经3天了...回来吧 👋",
      thinking: "准备好今天的训练了吗？🎯",
      wink: "你可以的 😉",
    },
  };
  const set = dict[lang] ?? dict.en;
  return set[mood];
}

// Eye renderers — drawn inside visor coordinate system (visor: x 30..130, y 60..110, center ~80,85)
function Eyes({ mood }: { mood: Mood }) {
  const glow = "drop-shadow(0 0 4px #FF6A00)";
  const colorBright = "#FFB300";
  const colorIntense = "#FF6A00";
  const colorDim = "#B85A00";

  switch (mood) {
    case "happy":
      return (
        <g style={{ filter: glow }} stroke={colorBright} strokeWidth="3.5" fill="none" strokeLinecap="round">
          <path d="M58 88 Q66 96 74 88" />
          <path d="M86 88 Q94 96 102 88" />
        </g>
      );
    case "determined":
      return (
        <g style={{ filter: glow }} fill={colorIntense}>
          <path d="M55 82 L75 88 L75 92 L55 90 Z" />
          <path d="M105 82 L85 88 L85 92 L105 90 Z" />
          <circle cx="66" cy="92" r="2" />
          <circle cx="94" cy="92" r="2" />
        </g>
      );
    case "excited":
      return (
        <g style={{ filter: glow }} fill={colorBright}>
          {[66, 94].map((cx) => (
            <polygon
              key={cx}
              points={`${cx},80 ${cx + 2.4},86 ${cx + 8},86 ${cx + 3.5},90 ${cx + 5.5},96 ${cx},92 ${cx - 5.5},96 ${cx - 3.5},90 ${cx - 8},86 ${cx - 2.4},86`}
            />
          ))}
        </g>
      );
    case "wink":
      return (
        <g style={{ filter: glow }} stroke={colorBright} strokeWidth="3.5" fill="none" strokeLinecap="round">
          <path d="M58 88 Q66 96 74 88" />
          <line x1="86" y1="90" x2="102" y2="90" />
        </g>
      );
    case "thinking":
      return (
        <g style={{ filter: glow }} fill={colorDim} stroke={colorDim} strokeWidth="2.5" strokeLinecap="round">
          <circle cx="66" cy="89" r="3" />
          <path d="M88 86 Q98 84 98 92 Q98 96 92 96" fill="none" />
          <circle cx="92" cy="100" r="1.6" />
        </g>
      );
    case "sleepy":
      return (
        <g style={{ filter: "drop-shadow(0 0 2px #B85A00)" }} stroke={colorDim} strokeWidth="3" fill="none" strokeLinecap="round">
          <path d="M58 90 Q66 94 74 90" />
          <path d="M86 90 Q94 94 102 90" />
        </g>
      );
  }
}

function MascotSvg({ mood, blink }: { mood: Mood; blink: boolean }) {
  return (
    <svg viewBox="0 0 160 180" width="100%" height="100%" aria-hidden="true">
      <defs>
        <linearGradient id="helmet" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="60%" stopColor="#F0F0F0" />
          <stop offset="100%" stopColor="#CFCFCF" />
        </linearGradient>
        <linearGradient id="body" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#F5F5F5" />
          <stop offset="100%" stopColor="#C8C8C8" />
        </linearGradient>
        <radialGradient id="ringGlow">
          <stop offset="0%" stopColor="#FF6A00" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#FF6A00" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Body */}
      <rect x="50" y="118" width="60" height="44" rx="14" fill="url(#body)" stroke="#0a0a0a" strokeWidth="1.2" />
      {/* SUNY logo S */}
      <text x="80" y="148" textAnchor="middle" fontFamily="Plus Jakarta Sans, sans-serif" fontWeight="800" fontSize="20" fill="#FF6A00">S</text>
      {/* Arms */}
      <ellipse cx="46" cy="132" rx="6" ry="9" fill="#1a1a1a" />
      <ellipse cx="114" cy="132" rx="6" ry="9" fill="#1a1a1a" />

      {/* Helmet */}
      <ellipse cx="80" cy="72" rx="52" ry="50" fill="url(#helmet)" stroke="#0a0a0a" strokeWidth="1.2" />

      {/* Visor */}
      <rect x="36" y="56" width="88" height="50" rx="22" fill="#0a0a0a" />
      <rect x="38" y="58" width="84" height="14" rx="14" fill="#1a1a1a" opacity="0.7" />

      {/* Eyes */}
      <g style={{ opacity: blink ? 0 : 1, transition: "opacity 90ms ease" }}>
        <Eyes mood={mood} />
      </g>

      {/* Ear pieces with orange ring glow */}
      <g>
        <circle cx="28" cy="78" r="11" fill="url(#ringGlow)" />
        <circle cx="30" cy="78" r="8" fill="#2a2a2a" stroke="#FF6A00" strokeWidth="1.6" />
        <circle cx="132" cy="78" r="11" fill="url(#ringGlow)" />
        <circle cx="130" cy="78" r="8" fill="#2a2a2a" stroke="#FF6A00" strokeWidth="1.6" />
      </g>

      {/* Top L accent */}
      <path d="M68 30 L82 30 L82 34 L72 34 L72 44 L68 44 Z" fill="#FF6A00" />

      {/* Sleepy Zz */}
      {mood === "sleepy" && (
        <g fill="#FF6A00" fontFamily="Plus Jakarta Sans, sans-serif" fontWeight="700">
          <text x="120" y="30" fontSize="14">Z</text>
          <text x="130" y="22" fontSize="10">z</text>
        </g>
      )}
    </svg>
  );
}

export default function MascotCompanion(props: Props) {
  const { lang } = useLanguage();
  const mood = useMemo(() => resolveMood(props), [props]);
  const streak = props.streak ?? 0;

  const [blink, setBlink] = useState(false);
  useEffect(() => {
    const id = setInterval(() => {
      setBlink(true);
      setTimeout(() => setBlink(false), 150);
    }, 4000);
    return () => clearInterval(id);
  }, []);

  // Rotate messages every 5s — for now we have a single message per mood,
  // but we cycle a small variety pool so it feels alive.
  const pool = useMemo(() => {
    if (props.message) return [{ m: mood, text: props.message }];
    const moods: Mood[] = [mood, "happy", mood === "determined" ? "excited" : "determined"];
    return Array.from(new Set(moods)).map((m) => ({ m, text: getMessage(lang, m, streak) }));
  }, [mood, lang, streak, props.message]);
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    setIdx(0);
    if (pool.length <= 1) return;
    const id = setInterval(() => setIdx((i) => (i + 1) % pool.length), 5000);
    return () => clearInterval(id);
  }, [pool]);

  return (
    <div className="flex items-center gap-3 mb-4 select-none">
      {/* Mascot */}
      <div className="relative shrink-0 mascot-float-wrap" style={{ width: 80, height: 90 }}>
        {/* Glow halo */}
        <div className="absolute inset-0 rounded-full mascot-glow-pulse pointer-events-none"
          style={{ background: "radial-gradient(circle at 50% 55%, rgba(255,106,0,0.45), transparent 65%)", filter: "blur(8px)" }}
        />
        {/* Floor ring */}
        <div className="absolute left-1/2 -translate-x-1/2 mascot-ring-pulse"
          style={{ bottom: 2, width: 56, height: 10, borderRadius: "50%", background: "radial-gradient(ellipse, rgba(255,106,0,0.55), transparent 70%)" }}
        />
        <div className="relative w-full h-full mascot-float">
          <MascotSvg mood={mood} blink={blink} />
        </div>
      </div>

      {/* Bubble */}
      <div
        className="relative flex-1 min-w-0 rounded-2xl px-3.5 py-2.5 backdrop-blur-md"
        style={{
          background: "rgba(255,255,255,0.05)",
          border: "1px solid rgba(255,106,0,0.4)",
          maxWidth: 240,
          boxShadow: "0 4px 20px -6px rgba(255,106,0,0.30)",
        }}
      >
        <span aria-hidden className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-3 h-3 rotate-45"
          style={{ background: "rgba(255,255,255,0.05)", borderLeft: "1px solid rgba(255,106,0,0.4)", borderBottom: "1px solid rgba(255,106,0,0.4)" }}
        />
        <p className="text-[10px] uppercase tracking-[0.14em] font-bold mb-0.5" style={{ color: "#FF6A00" }}>
          SUNY
        </p>
        <p key={idx} className="text-sm font-medium text-foreground leading-snug animate-fade-in">
          {pool[idx]?.text}
        </p>
      </div>
    </div>
  );
}
