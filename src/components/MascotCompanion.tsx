import { useEffect, useMemo, useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import mascotImg from "@/assets/mascot-suny.png";

type Mood = "happy" | "determined" | "excited" | "sleepy";

interface Props {
  streak?: number;
  workoutsToday?: number;
  hasActivePlan?: boolean;
  mood?: Mood;
}

function pickMessages(lang: string, streak: number, workoutsToday: number, hasActivePlan: boolean): string[] {
  const id = lang === "id";
  const zh = lang === "zh";
  const msgs: string[] = [];

  if (workoutsToday > 0) {
    msgs.push(id ? "Kerja bagus hari ini" : zh ? "今天表现很棒" : "Great work today");
  }
  if (streak >= 3) {
    msgs.push(id ? `Streak ${streak} hari` : zh ? `连续${streak}天打卡` : `${streak} day streak`);
  }
  if (hasActivePlan) {
    msgs.push(id ? "Siap latihan hari ini?" : zh ? "准备开始训练了吗？" : "Ready to train?");
  } else {
    msgs.push(id ? "Yuk buat rencana baru" : zh ? "来制定一个新计划吧" : "Let's build your plan");
  }
  msgs.push(id ? "Progress kamu keren" : zh ? "你的进步很棒" : "You're doing great");
  msgs.push(id ? "Konsistensi mengalahkan intensitas" : zh ? "坚持胜过强度" : "Consistency beats intensity");
  return msgs;
}

export default function MascotCompanion({ streak = 0, workoutsToday = 0, hasActivePlan = false, mood }: Props) {
  const { lang } = useLanguage();
  const messages = useMemo(
    () => pickMessages(lang, streak, workoutsToday, hasActivePlan),
    [lang, streak, workoutsToday, hasActivePlan]
  );
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    setIdx(0);
    const id = setInterval(() => setIdx((i) => (i + 1) % messages.length), 5000);
    return () => clearInterval(id);
  }, [messages]);

  const resolvedMood: Mood = mood ?? (workoutsToday > 0 ? "happy" : streak >= 3 ? "excited" : hasActivePlan ? "determined" : "sleepy");
  const glowOpacity = resolvedMood === "excited" ? 0.55 : resolvedMood === "happy" ? 0.45 : resolvedMood === "determined" ? 0.40 : 0.25;

  return (
    <div className="flex items-center gap-3 mb-4 select-none" aria-hidden={false}>
      {/* Mascot */}
      <div className="relative shrink-0" style={{ width: 72, height: 72 }}>
        {/* Glow */}
        <div
          className="absolute inset-0 rounded-full blur-2xl mascot-glow-pulse"
          style={{ background: `radial-gradient(circle, rgba(255,107,0,${glowOpacity}) 0%, transparent 70%)` }}
          aria-hidden
        />
        {/* Floating image */}
        <div className="relative w-full h-full mascot-float">
          <img
            src={mascotImg}
            alt="Suny — your AI fitness buddy"
            draggable={false}
            className="w-full h-full object-contain drop-shadow-[0_8px_18px_rgba(255,107,0,0.25)] mascot-blink"
          />
        </div>
      </div>

      {/* Bubble */}
      <div
        className="relative flex-1 min-w-0 rounded-2xl px-3.5 py-2.5 backdrop-blur-md transition-all"
        style={{
          background: "linear-gradient(135deg, hsl(var(--surface) / 0.65), hsl(var(--surface) / 0.35))",
          border: "1px solid rgba(255,107,0,0.30)",
          boxShadow: "0 4px 20px -6px rgba(255,107,0,0.25), inset 0 1px 0 rgba(255,255,255,0.04)",
        }}
      >
        {/* Tail */}
        <span
          aria-hidden
          className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-3 h-3 rotate-45"
          style={{
            background: "hsl(var(--surface) / 0.55)",
            borderLeft: "1px solid rgba(255,107,0,0.30)",
            borderBottom: "1px solid rgba(255,107,0,0.30)",
          }}
        />
        <p className="text-[10px] uppercase tracking-wider font-semibold mb-0.5" style={{ color: "#ff6b00" }}>
          Suny
        </p>
        <p key={idx} className="text-sm font-medium text-foreground leading-snug truncate animate-fade-in">
          {messages[idx]}
        </p>
      </div>
    </div>
  );
}