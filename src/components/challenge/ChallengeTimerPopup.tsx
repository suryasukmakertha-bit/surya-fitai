import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import SunyMascot, { SunyMood } from "./SunyMascot";
import {
  findChallengeEntry,
  ChallengePoolEntry,
  ChallengeDifficulty,
} from "@/lib/challengePool";
import { acceptChallenge, completeChallenge, checkAndAwardMedals, type NewMedal } from "@/lib/dailyChallenge";
import { useAuth } from "@/contexts/AuthContext";
import MedalEarnedPopup from "@/components/MedalEarnedPopup";

interface Props {
  open: boolean;
  onClose: () => void;
  exerciseName: string;
  difficulty: ChallengeDifficulty;
  xpReward: number;
  fallbackTarget: number;
  challengeDate: string;
  alreadyCompleted: boolean;
  onCompleted?: () => void;
}

type Phase = "intro" | "countdown" | "active" | "done";

const SPEECH_LANG: Record<string, string> = { id: "id-ID", en: "en-US", zh: "zh-CN" };

function speak(text: string, lang: string) {
  try {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = SPEECH_LANG[lang] || "en-US";
    u.rate = 0.9;
    u.pitch = 1.2;
    window.speechSynthesis.speak(u);
  } catch {}
}

function cancelSpeech() {
  try {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  } catch {}
}

const REP_WORDS: Record<string, string[]> = {
  id: ["satu", "dua", "tiga", "empat", "lima", "enam", "tujuh", "delapan", "sembilan", "sepuluh"],
  en: ["one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"],
  zh: ["一", "二", "三", "四", "五", "六", "七", "八", "九", "十"],
};

function repWord(n: number, lang: string): string {
  const arr = REP_WORDS[lang] || REP_WORDS.en;
  return arr[n - 1] || String(n);
}

function GifSkeleton() {
  return (
    <div
      style={{
        width: "100%",
        aspectRatio: "1 / 1",
        borderRadius: 12,
        background:
          "linear-gradient(90deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.12) 50%, rgba(255,255,255,0.04) 100%)",
        backgroundSize: "200% 100%",
        animation: "challShimmer 1.4s linear infinite",
      }}
    >
      <style>{`@keyframes challShimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }`}</style>
    </div>
  );
}

const ASSET_BASE = "https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/";
const ASSET_FILE: Record<string, string> = {
  "Push-up": "push-up.gif",
  "Sit-up": "sit-up.gif",
  "Squat": "squat.gif",
  "Lunge": "lunges.gif",
  "Burpee": "burpees.gif",
  "Mountain Climber": "mountain-climber.gif",
  "Jump Squat": "jump-squat.gif",
  "Crunch": "crunches.gif",
  "High Knees": "high-knees.gif",
  "Jumping Jack": "jumping-jack.gif",
  "Plank": "plank-hold.jpg",
  "Wall Sit": "wall-sit.jpg",
  "Dead Hang": "dead-hang.jpg",
  "Glute Bridge Hold": "glute-bridge-hold.jpg",
  "Superman Hold": "superman-hold.jpg",
};

export default function ChallengeTimerPopup(props: Props) {
  const { user } = useAuth();
  const { lang, t } = useLanguage();
  const tt = (k: string, vars?: Record<string, string | number>) => {
    let s = (t as any)[k] || k;
    if (vars) for (const [k2, v] of Object.entries(vars)) s = s.replace(`{{${k2}}}`, String(v));
    return s;
  };

  const entry: ChallengePoolEntry | null = findChallengeEntry(props.exerciseName);
  const kind: "reps" | "time" = entry?.kind ?? "reps";
  // Always use the target value from the daily challenge data (shown on the
  // dashboard card). Never hardcode from the local pool.
  const target = props.fallbackTarget;

  const exerciseLabel =
    (t as any)[`exerciseName.${props.exerciseName}`] ||
    (entry ? (t as any)[`exerciseName.${entry.key}`] || entry.key : props.exerciseName);

  const [phase, setPhase] = useState<Phase>("intro");
  const [mood, setMood] = useState<SunyMood>("excited");
  const [gifLoaded, setGifLoaded] = useState(false);
  const [count, setCount] = useState(0); // for reps
  const [secondsLeft, setSecondsLeft] = useState(target); // for time
  const [countdown, setCountdown] = useState(3);
  const [medalQueue, setMedalQueue] = useState<NewMedal[]>([]);
  const timerRef = useRef<number | null>(null);
  const pausedRef = useRef<boolean>(false);
  const wakeLockRef = useRef<any>(null);

  const requestWakeLock = async () => {
    try {
      if (typeof navigator !== "undefined" && "wakeLock" in navigator) {
        wakeLockRef.current = await (navigator as any).wakeLock.request("screen");
      }
    } catch {}
  };
  const releaseWakeLock = () => {
    try {
      if (wakeLockRef.current) {
        wakeLockRef.current.release?.();
        wakeLockRef.current = null;
      }
    } catch {}
  };

  // Re-acquire wake lock when tab becomes visible again during active challenge
  useEffect(() => {
    const onVis = () => {
      if (!document.hidden && (phase === "countdown" || phase === "active") && !wakeLockRef.current) {
        requestWakeLock();
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [phase]);

  // Release wake lock on unmount
  useEffect(() => {
    return () => releaseWakeLock();
  }, []);

  const gifUrl = entry && ASSET_FILE[entry.key] ? ASSET_BASE + ASSET_FILE[entry.key] : null;

  // Reset state when re-opening
  useEffect(() => {
    if (props.open) {
      setPhase("intro");
      setMood("excited");
      setCount(0);
      setSecondsLeft(target);
      setCountdown(3);
      setGifLoaded(false);
    } else {
      cancelSpeech();
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
      releaseWakeLock();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.open]);

  // Page Visibility: pause timer when tab hidden
  useEffect(() => {
    const onVis = () => { pausedRef.current = document.hidden; };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  // Countdown phase
  useEffect(() => {
    if (phase !== "countdown") return;
    setMood("focused");
    setCountdown(3);
    speak("3", lang);
    let n = 3;
    const id = window.setInterval(() => {
      if (pausedRef.current) return;
      n -= 1;
      if (n <= 0) {
        clearInterval(id);
        setCountdown(0);
        setPhase("active");
      } else {
        setCountdown(n);
        speak(String(n), lang);
      }
    }, 1000);
    return () => clearInterval(id);
  }, [phase, lang]);

  // Active phase: time-based timer
  useEffect(() => {
    if (phase !== "active" || kind !== "time") return;
    setMood("hype");
    setSecondsLeft(target);
    const startMsg = lang === "id" ? `Mulai, ${target} detik!` : lang === "zh" ? `开始，${target}秒!` : `Start, ${target} seconds!`;
    speak(startMsg, lang);
    const id = window.setInterval(() => {
      if (pausedRef.current) return;
      setSecondsLeft((s) => {
        const next = s - 1;
        if (next <= 0) {
          clearInterval(id);
          finish();
          return 0;
        }
        if (next === 5) setMood("struggle");
        if (next > 10 && next % 10 === 0) {
          const m = lang === "id" ? `${next} detik lagi` : lang === "zh" ? `还有${next}秒` : `${next} seconds left`;
          speak(m, lang);
        } else if (next <= 10) {
          speak(String(next), lang);
        }
        return next;
      });
    }, 1000);
    timerRef.current = id;
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, kind, target, lang]);

  // Switch to hype when entering active reps
  useEffect(() => {
    if (phase === "active" && kind === "reps") {
      setMood("hype");
    }
  }, [phase, kind]);

  // Auto-increment rep counter every 1.25s during active reps phase
  useEffect(() => {
    if (phase !== "active" || kind !== "reps") return;
    const id = window.setInterval(() => {
      if (pausedRef.current) return;
      setCount((c) => {
        const next = c + 1;
        if (next > target) return c;
        speak(repWord(next, lang), lang);
        if (target - next <= 5 && target - next > 0) setMood("struggle");
        if (next >= target) {
          clearInterval(id);
          setTimeout(() => finish(), 100);
        }
        return next;
      });
    }, 1250);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, kind, target, lang]);

  async function finish() {
    cancelSpeech();
    releaseWakeLock();
    setMood("celebrate");
    setPhase("done");
    const msg =
      kind === "reps"
        ? (lang === "id" ? "Selesai! Keren banget!" : lang === "zh" ? "完成！太棒了！" : "Done! Amazing!")
        : (lang === "id" ? "Selesai! Luar biasa!" : lang === "zh" ? "完成！太厉害了！" : "Done! Outstanding!");
    speak(msg, lang);

    if (user && !props.alreadyCompleted) {
      try {
        await acceptChallenge(user.id, props.challengeDate);
        await completeChallenge(user.id, props.challengeDate, props.xpReward);
        const earned = await checkAndAwardMedals(user.id);
        if (earned.length) setMedalQueue(earned);
        props.onCompleted?.();
      } catch (e) {
        console.error("[challenge-timer] award error", e);
      }
    }
  }

  const onRepTap = () => {
    if (phase !== "active" || kind !== "reps") return;
    setCount((c) => {
      const next = c + 1;
      speak(repWord(next, lang), lang);
      if (target - next <= 5 && target - next > 0) setMood("struggle");
      if (next >= target) {
        setTimeout(() => finish(), 100);
      }
      return next;
    });
  };

  if (!props.open) return null;

  const startLabel = lang === "id" ? "Mulai" : lang === "zh" ? "开始" : "Start";
  const closeLabel = lang === "id" ? "Keren!" : lang === "zh" ? "太棒了!" : "Awesome!";
  const tapToCount =
    lang === "id" ? "Ketuk untuk hitung tiap rep"
      : lang === "zh" ? "点击数每一次"
      : "Tap to count each rep";
  const difficultyLabel = tt(`dailyChallenge.difficulty.${props.difficulty}`);
  const xpLabel = tt("dailyChallenge.xpReward", { xp: props.xpReward });
  const xpEarned =
    lang === "id" ? `+${props.xpReward} XP didapat!`
      : lang === "zh" ? `获得 +${props.xpReward} 经验值!`
      : `+${props.xpReward} XP earned!`;

  return (
    <>
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => { if (e.target === e.currentTarget && phase !== "active" && phase !== "countdown") props.onClose(); }}
        style={{
          position: "fixed", inset: 0, zIndex: 1000,
          background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)",
          display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
          animation: "challFade 0.2s ease-out",
        }}
      >
        <style>{`@keyframes challFade { from { opacity: 0;} to { opacity: 1;} }`}</style>
        <div
          style={{
            background: "hsl(var(--background))",
            color: "hsl(var(--foreground))",
            border: "1px solid rgba(255,106,0,0.35)",
            borderRadius: 20,
            width: "100%", maxWidth: 380,
            maxHeight: "calc(100vh - 120px)",
            display: "flex", flexDirection: "column",
            overflow: "hidden",
            boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
            position: "relative",
          }}
        >
          <button
            onClick={() => { cancelSpeech(); releaseWakeLock(); props.onClose(); }}
            aria-label="Close"
            style={{
              position: "absolute", top: 10, right: 10, zIndex: 2,
              width: 32, height: 32, borderRadius: 16,
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.1)",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "hsl(var(--foreground))",
            }}
          >
            <X size={16} />
          </button>

          <div style={{ overflowY: "auto", padding: 20, paddingBottom: phase === "intro" ? 8 : 20, flex: 1 }}>
          {/* INTRO */}
          {phase === "intro" && (
            <>
              <div style={{ textAlign: "center", marginTop: 6 }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: "#FF6A00", letterSpacing: "0.14em" }}>
                  {tt("dailyChallenge.label")}
                </p>
                <h2 style={{ fontSize: 22, fontWeight: 800, marginTop: 6 }}>{exerciseLabel}</h2>
                <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 8 }}>
                  <span style={{ background: "rgba(255,106,0,0.15)", color: "#FF6A00", padding: "3px 10px", borderRadius: 6, fontSize: 11, fontWeight: 700 }}>
                    {difficultyLabel}
                  </span>
                  <span style={{ background: "rgba(255,179,0,0.15)", color: "#FFB300", padding: "3px 10px", borderRadius: 6, fontSize: 11, fontWeight: 700 }}>
                    {xpLabel}
                  </span>
                </div>
                <p style={{ marginTop: 10, fontSize: 14, color: "hsl(var(--muted-foreground))" }}>
                  {kind === "reps"
                    ? tt("dailyChallenge.doX", { count: target, exercise: exerciseLabel })
                    : tt("dailyChallenge.holdX", { count: target, exercise: exerciseLabel })}
                </p>
              </div>

              <div style={{ marginTop: 14, borderRadius: 12, overflow: "hidden", background: "rgba(255,255,255,0.04)" }}>
                {!gifUrl && <GifSkeleton />}
                {gifUrl && (
                  <img
                    src={gifUrl}
                    alt={exerciseLabel}
                    onLoad={() => setGifLoaded(true)}
                    style={{ width: "100%", aspectRatio: "1 / 1", objectFit: "cover", display: gifLoaded ? "block" : "none" }}
                  />
                )}
                {gifUrl && !gifLoaded && <GifSkeleton />}
              </div>

              <div style={{ display: "flex", justifyContent: "center", marginTop: 12 }}>
                <SunyMascot mood="excited" size={120} />
              </div>
            </>
          )}

          {/* COUNTDOWN */}
          {phase === "countdown" && (
            <div style={{ textAlign: "center", padding: "20px 0" }}>
              <div style={{ display: "flex", justifyContent: "center" }}>
                <SunyMascot mood="focused" size={140} />
              </div>
              <div style={{ fontSize: 96, fontWeight: 900, color: "#FF6A00", lineHeight: 1, marginTop: 10 }}>
                {countdown > 0 ? countdown : ""}
              </div>
            </div>
          )}

          {/* ACTIVE */}
          {phase === "active" && (
            <div style={{ textAlign: "center" }}>
              <p style={{ fontSize: 14, color: "hsl(var(--muted-foreground))" }}>{exerciseLabel}</p>
              <div style={{ display: "flex", justifyContent: "center", marginTop: 6 }}>
                <SunyMascot mood={mood} size={130} />
              </div>
              {kind === "time" ? (
                <>
                  <div style={{ fontSize: 88, fontWeight: 900, color: "#FF6A00", lineHeight: 1, marginTop: 8 }}>
                    {secondsLeft}
                  </div>
                  <p style={{ fontSize: 12, color: "hsl(var(--muted-foreground))", marginTop: 4 }}>
                    {lang === "id" ? "detik" : lang === "zh" ? "秒" : "seconds"}
                  </p>
                </>
              ) : (
                <>
                  <div style={{ fontSize: 60, fontWeight: 900, color: "#FF6A00", lineHeight: 1, marginTop: 8 }}>
                    {count} <span style={{ fontSize: 28, color: "hsl(var(--muted-foreground))" }}>/ {target}</span>
                  </div>
                  <p style={{ fontSize: 12, color: "hsl(var(--muted-foreground))", marginTop: 4 }}>{tapToCount}</p>
                  <button
                    onClick={onRepTap}
                    style={{
                      marginTop: 14, width: "100%",
                      background: "linear-gradient(90deg,#ff6b00,#ff3d7f)",
                      color: "#fff", fontWeight: 900, fontSize: 22,
                      padding: 22, borderRadius: 14, border: "none",
                    }}
                  >
                    +1
                  </button>
                </>
              )}
            </div>
          )}

          {/* DONE */}
          {phase === "done" && (
            <div style={{ textAlign: "center", padding: "10px 0" }}>
              <div style={{ display: "flex", justifyContent: "center" }}>
                <SunyMascot mood="celebrate" size={150} />
              </div>
              <p style={{ fontSize: 22, fontWeight: 800, marginTop: 12 }}>
                {xpEarned}
              </p>
              <p style={{ fontSize: 13, color: "hsl(var(--muted-foreground))", marginTop: 4 }}>
                {tt("dailyChallenge.cta.done")}
              </p>
              <button
                onClick={() => { cancelSpeech(); releaseWakeLock(); props.onClose(); }}
                style={{
                  marginTop: 16, width: "100%",
                  background: "linear-gradient(90deg,#10b981,#0ea371)",
                  color: "#fff", fontWeight: 800, fontSize: 16,
                  padding: 14, borderRadius: 12, border: "none",
                }}
              >
                {closeLabel}
              </button>
            </div>
          )}
          </div>

          {phase === "intro" && (
            <div style={{
              padding: 16,
              borderTop: "1px solid rgba(255,255,255,0.08)",
              background: "hsl(var(--background))",
            }}>
              <button
                onClick={() => { requestWakeLock(); setPhase("countdown"); }}
                style={{
                  width: "100%",
                  background: "linear-gradient(90deg,#ff6b00,#ff3d7f)",
                  color: "#fff", fontWeight: 800, fontSize: 16,
                  padding: 14, borderRadius: 12, border: "none",
                }}
              >
                {startLabel}
              </button>
            </div>
          )}
        </div>
      </div>

      {medalQueue.length > 0 && (
        <MedalEarnedPopup
          medal={medalQueue[0]}
          xpReward={medalQueue[0].xp_earned ?? 0}
          onClose={() => setMedalQueue((q) => q.slice(1))}
        />
      )}
    </>
  );
}