import { useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useLanguage } from "@/contexts/LanguageContext";
import { downloadDailyProgress } from "@/lib/dailyProgressDownload";

interface Exercise {
  name: string;
  sets: string;
  reps: string;
  rest: string;
}

interface DailyCelebrationPopupProps {
  open: boolean;
  onClose: () => void;
  dayLabel: string;
  exercises: Exercise[];
  completedExercises: string[];
  totalExercises: number;
  planMonthNumber?: number;
  dayNumber?: number;
}

const STR = {
  id: { title: "Luar Biasa! 🎉", subtitle: "Latihan hari ini selesai!", exercise: "Exercise", sets: "Sets", day: "Hari", quote: "Setiap rep membawamu lebih dekat ke tujuan.", cta: "Unduh Kemajuan Harian", close: "Tutup" },
  en: { title: "Amazing! 🎉", subtitle: "Today's workout complete!", exercise: "Exercise", sets: "Sets", day: "Day", quote: "Every rep brings you closer to your goal.", cta: "Download Daily Progress", close: "Close" },
  zh: { title: "太棒了！🎉", subtitle: "今天的训练完成了！", exercise: "训练", sets: "组", day: "第", quote: "每一次重复都让你更接近目标。", cta: "下载今日进度", close: "关闭" },
};

export default function DailyCelebrationPopup({
  open,
  onClose,
  dayLabel,
  exercises,
  completedExercises,
  totalExercises,
  planMonthNumber = 1,
  dayNumber,
}: DailyCelebrationPopupProps) {
  const { lang, tKey } = useLanguage();
  const s = STR[lang] || STR.en;
  const resolveExerciseName = (raw: string): string =>
    raw && raw.startsWith("exercise.") ? tKey(raw) : raw;

  const totalSets = useMemo(() => {
    return exercises.reduce((sum, ex) => {
      const n = parseInt(String(ex.sets).match(/\d+/)?.[0] || "0", 10);
      return sum + (isNaN(n) ? 0 : n);
    }, 0);
  }, [exercises]);

  const handleDownload = () => {
    downloadDailyProgress({ dayLabel, exercises, completedExercises, totalExercises, planMonthNumber, lang, resolveExerciseName });
    onClose();
  };

  // Generate sparkle positions (stable per open)
  const sparkles = useMemo(
    () => [
      { x: 10, y: 20, delay: 0 },
      { x: 85, y: 15, delay: 0.1 },
      { x: 5, y: 70, delay: 0.2 },
      { x: 90, y: 60, delay: 0.15 },
      { x: 50, y: 5, delay: 0.05 },
      { x: 50, y: 95, delay: 0.25 },
    ],
    []
  );

  // Mount keyframes once
  useEffect(() => {
    if (typeof document === "undefined") return;
    if (document.getElementById("suny-celebration-styles")) return;
    const style = document.createElement("style");
    style.id = "suny-celebration-styles";
    style.textContent = `
      @keyframes suny-float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
      @keyframes suny-glow { 0%,100%{filter:drop-shadow(0 0 8px rgba(255,106,0,0.6))} 50%{filter:drop-shadow(0 0 18px rgba(255,106,0,1))} }
      @keyframes suny-eye-pulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.2)} }
      @keyframes suny-sparkle-burst { 0%{transform:scale(0);opacity:0} 30%{transform:scale(1.4);opacity:1} 100%{transform:scale(0.6);opacity:0} }
    `;
    document.head.appendChild(style);
  }, []);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className="sm:max-w-sm p-0 overflow-hidden border-0 bg-transparent shadow-none"
        aria-describedby="celebration-desc"
      >
        <div
          className="rounded-3xl p-8 relative"
          style={{
            background: "#111111",
            border: "1px solid rgba(255,106,0,0.5)",
            boxShadow: "0 0 40px rgba(255,106,0,0.2)",
            backdropFilter: "blur(8px)",
          }}
        >
          {/* Mascot + sparkles */}
          <div className="relative mx-auto" style={{ width: 160, height: 180 }}>
            {sparkles.map((sp, i) => (
              <span
                key={i}
                aria-hidden
                style={{
                  position: "absolute",
                  left: `${sp.x}%`,
                  top: `${sp.y}%`,
                  width: 4,
                  height: 4,
                  borderRadius: "50%",
                  background: "#FF6A00",
                  boxShadow: "0 0 6px #FF6A00",
                  animation: `suny-sparkle-burst 1.6s ${sp.delay}s ease-out infinite`,
                }}
              />
            ))}
            <svg
              viewBox="0 0 100 120"
              width="160"
              height="180"
              style={{ animation: "suny-float 2.5s ease-in-out infinite, suny-glow 2s ease-in-out infinite" }}
              aria-label="SUNY"
            >
              <defs>
                <radialGradient id="sunyHead" cx="50%" cy="40%" r="60%">
                  <stop offset="0%" stopColor="#FFFFFF" />
                  <stop offset="100%" stopColor="#D8D8D8" />
                </radialGradient>
                <filter id="eyeGlow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="1.2" result="b" />
                  <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
              </defs>
              {/* Head */}
              <circle cx="50" cy="42" r="34" fill="url(#sunyHead)" />
              {/* Orange L-stripe */}
              <path d="M30 18 L62 18 L62 24 L36 24 L36 32 L30 32 Z" fill="#FF6A00" />
              {/* Visor */}
              <rect x="22" y="36" width="56" height="22" rx="11" fill="#080808" />
              {/* Ears */}
              <circle cx="14" cy="46" r="5" fill="#2a2a2a" stroke="#FF6A00" strokeWidth="1.5" />
              <circle cx="86" cy="46" r="5" fill="#2a2a2a" stroke="#FF6A00" strokeWidth="1.5" />
              {/* Star eyes */}
              <g filter="url(#eyeGlow)" style={{ transformOrigin: "37px 47px", animation: "suny-eye-pulse 1.5s ease-in-out infinite" }}>
                <polygon points="37,41 39,45.5 44,46 40,49.3 41.2,54 37,51.5 32.8,54 34,49.3 30,46 35,45.5" fill="#FFB300" />
              </g>
              <g filter="url(#eyeGlow)" style={{ transformOrigin: "63px 47px", animation: "suny-eye-pulse 1.5s ease-in-out infinite" }}>
                <polygon points="63,41 65,45.5 70,46 66,49.3 67.2,54 63,51.5 58.8,54 60,49.3 56,46 61,45.5" fill="#FFB300" />
              </g>
              {/* Body */}
              <rect x="28" y="78" width="44" height="36" rx="10" fill="url(#sunyHead)" />
              <text x="50" y="103" textAnchor="middle" fontFamily="Plus Jakarta Sans, Inter, sans-serif" fontWeight="800" fontSize="20" fill="#FF6A00">S</text>
            </svg>
          </div>

          {/* Title */}
          <DialogTitle className="text-center mt-2" style={{ color: "#FFFFFF", fontSize: 22, fontWeight: 800 }}>
            {s.title}
          </DialogTitle>
          <DialogDescription id="celebration-desc" className="text-center mt-1" style={{ color: "#FF6A00", fontSize: 15 }}>
            {s.subtitle}
          </DialogDescription>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-2 mt-5">
            <div className="rounded-xl p-3 text-center" style={{ background: "#1a1a1a" }}>
              <div style={{ color: "#FF6A00", fontSize: 20, fontWeight: 800 }}>{completedExercises.length}</div>
              <div style={{ color: "#888", fontSize: 11, marginTop: 2 }}>{s.exercise}</div>
            </div>
            <div className="rounded-xl p-3 text-center" style={{ background: "#1a1a1a" }}>
              <div style={{ color: "#FF6A00", fontSize: 20, fontWeight: 800 }}>{totalSets}</div>
              <div style={{ color: "#888", fontSize: 11, marginTop: 2 }}>{s.sets}</div>
            </div>
            <div className="rounded-xl p-3 text-center" style={{ background: "#1a1a1a" }}>
              <div style={{ color: "#FF6A00", fontSize: 20, fontWeight: 800 }}>
                {lang === "zh" ? `${dayNumber ?? "-"}` : dayNumber ?? "-"}
              </div>
              <div style={{ color: "#888", fontSize: 11, marginTop: 2 }}>
                {lang === "zh" ? `${s.day}天` : s.day}
              </div>
            </div>
          </div>

          {/* Quote */}
          <p className="text-center mt-4 italic" style={{ color: "#888", fontSize: 13 }}>
            "{s.quote}"
          </p>

          {/* CTA */}
          <button
            onClick={handleDownload}
            className="w-full mt-5 rounded-xl font-semibold text-white"
            style={{
              height: 50,
              background: "linear-gradient(90deg, #FF6A00 0%, #FF2D87 100%)",
              boxShadow: "0 8px 24px rgba(255,106,0,0.35)",
            }}
          >
            {s.cta}
          </button>

          {/* Dismiss */}
          <button
            onClick={onClose}
            className="block mx-auto mt-3 text-center"
            style={{ color: "#888", fontSize: 13 }}
          >
            {s.close}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
