import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Pause, Play, Square, Lock, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSubscription } from "@/hooks/useSubscription";
import {
  type ActivityType,
  formatDuration,
  formatPace,
  haversineKm,
  calcCalories,
  getUserWeightKg,
} from "@/lib/activityTracking";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Point { lat: number; lng: number; t: number; alt?: number | null; speed?: number | null }

const isIOS = () =>
  typeof navigator !== "undefined" &&
  (/iPad|iPhone|iPod/.test(navigator.userAgent) ||
    ((navigator as any).platform === "MacIntel" && (navigator as any).maxTouchPoints > 1));

const wakeLockSupported = () =>
  typeof navigator !== "undefined" && "wakeLock" in navigator && !isIOS();

const TXT = {
  warnTitle: { id: "Jaga Layar Tetap Aktif", en: "Keep Screen Active", zh: "保持屏幕开启" },
  warnBody: {
    id: "Untuk hasil terbaik selama perekaman:\n• Jangan tutup atau minimize app\n• Jangan matikan layar\n• Jangan pindah ke aplikasi lain\n\nApp akan mencoba menjaga layar tetap aktif secara otomatis.",
    en: "For best results during recording:\n• Do not close or minimize the app\n• Do not turn off the screen\n• Do not switch to other apps\n\nThe app will try to keep the screen active automatically.",
    zh: "录制期间为获得最佳效果：\n• 不要关闭或最小化应用\n• 不要关闭屏幕\n• 不要切换到其他应用\n\n应用将自动尝试保持屏幕常亮。",
  },
  warnIos: {
    id: "Perangkat kamu tidak mendukung mode layar aktif otomatis. Pastikan layar tetap menyala secara manual.",
    en: "Your device does not support automatic screen lock prevention. Please keep the screen on manually.",
    zh: "您的设备不支持自动防锁屏。请手动保持屏幕常亮。",
  },
  warnCta: { id: "Mengerti, Mulai", en: "Got it, Start", zh: "明白，开始" },
  warnDontShow: { id: "Jangan tampilkan lagi", en: "Don't show again", zh: "不再显示" },
  screenOn: { id: "Layar aktif", en: "Screen on", zh: "屏幕常亮" },
  leaveTitle: {
    id: "Rekaman sedang berjalan. Keluar akan menghentikan rekaman. Lanjutkan?",
    en: "Recording in progress. Leaving will stop the recording. Continue?",
    zh: "录制进行中。离开将停止录制。是否继续？",
  },
  stay: { id: "Tetap di sini", en: "Stay", zh: "留在这里" },
  leave: { id: "Keluar", en: "Leave", zh: "离开" },
};

export default function ActivityActive({ activity }: { activity: ActivityType }) {
  const nav = useNavigate();
  const { user } = useAuth();
  const { t, lang } = useLanguage();
  const tt = (k: string) => (t as any)[k] || k;
  const L = (k: keyof typeof TXT) => TXT[k][lang as "id" | "en" | "zh"] || TXT[k].en;
  const { access } = useSubscription();
  const isFree = access.isFreeTier && !access.isUnlimited;

  const [showWarning, setShowWarning] = useState<boolean>(
    () => typeof window !== "undefined" && localStorage.getItem("hideTrackingWarning") !== "true",
  );
  const [started, setStarted] = useState<boolean>(
    () => typeof window !== "undefined" && localStorage.getItem("hideTrackingWarning") === "true",
  );
  const [running, setRunning] = useState(true);
  const [elapsed, setElapsed] = useState(0);
  const [distance, setDistance] = useState(0);
  const [points, setPoints] = useState<Point[]>([]);
  const [splits, setSplits] = useState<Array<{ km: number; pace_seconds: number; duration_seconds: number }>>([]);
  const [maxSpeed, setMaxSpeed] = useState(0);
  const [currentSpeed, setCurrentSpeed] = useState(0);
  const [elevation, setElevation] = useState(0);
  const [stopOpen, setStopOpen] = useState(false);
  const [weightKg, setWeightKg] = useState(70);
  const [hasGeo, setHasGeo] = useState<boolean | null>(null);
  const [gpsLocked, setGpsLocked] = useState(false);
  const [allowWithoutLock, setAllowWithoutLock] = useState(false);
  const [weakGpsOpen, setWeakGpsOpen] = useState(false);
  const [wakeLockActive, setWakeLockActive] = useState(false);

  const startedAtRef = useRef(Date.now());
  const accumPausedRef = useRef(0);
  const pauseStartRef = useRef<number | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const pointsRef = useRef<Point[]>([]);
  const distanceRef = useRef(0);
  const lastSplitKmRef = useRef(0);
  const lastAltRef = useRef<number | null>(null);
  const gpsLockedRef = useRef(false);
  const allowWithoutLockRef = useRef(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wakeLockRef = useRef<any>(null);
  const recordingRef = useRef(false);

  // Load weight
  useEffect(() => { if (user) getUserWeightKg(user.id).then(setWeightKg); }, [user]);

  // Timer
  useEffect(() => {
    if (!started) return;
    const id = setInterval(() => {
      if (!running) return;
      const sec = Math.floor((Date.now() - startedAtRef.current - accumPausedRef.current) / 1000);
      setElapsed(sec);
    }, 1000);
    return () => clearInterval(id);
  }, [running, started]);

  // Geolocation
  useEffect(() => {
    if (!started) return;
    if (!navigator.geolocation) { setHasGeo(false); return; }
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        setHasGeo(true);
        if (!running) return;
        const acc = pos.coords.accuracy ?? 9999;
        // GPS lock gate: require accuracy ≤ 20m (or user opted to continue with weak signal)
        if (!gpsLockedRef.current && acc <= 20) {
          gpsLockedRef.current = true;
          setGpsLocked(true);
        }
        if (!gpsLockedRef.current && !allowWithoutLockRef.current) {
          // Still searching — do not record points/distance yet
          return;
        }
        const p: Point = {
          lat: pos.coords.latitude, lng: pos.coords.longitude,
          t: Date.now(), alt: pos.coords.altitude, speed: pos.coords.speed,
        };
        const prev = pointsRef.current[pointsRef.current.length - 1];
        if (prev) {
          const d = haversineKm(prev, p);
          const dtSec = Math.max(0.001, (p.t - prev.t) / 1000);
          const speedKmh = (d / dtSec) * 3600;
          // Noise filter: ignore <3m moves (stationary jitter) and >50 km/h jumps
          if (d * 1000 >= 3 && speedKmh <= 50 && d < 0.2) {
            distanceRef.current += d;
            setDistance(distanceRef.current);
            // splits per 1km
            const fullKm = Math.floor(distanceRef.current);
            if (fullKm > lastSplitKmRef.current) {
              const elapsedNow = Math.floor((Date.now() - startedAtRef.current - accumPausedRef.current) / 1000);
              const prevTotal = splits.reduce((a, s) => a + s.duration_seconds, 0);
              const dur = elapsedNow - prevTotal;
              setSplits((arr) => [...arr, { km: fullKm, pace_seconds: dur, duration_seconds: dur }]);
              lastSplitKmRef.current = fullKm;
            }
          } else {
            // Skip: noise or jump artifact — do not append point either
            return;
          }
        }
        pointsRef.current = [...pointsRef.current, p];
        setPoints(pointsRef.current);
        if (typeof p.speed === "number" && p.speed >= 0) {
          const kmh = p.speed * 3.6;
          setCurrentSpeed(kmh);
          setMaxSpeed((m) => Math.max(m, kmh));
        }
        if (typeof p.alt === "number") {
          if (lastAltRef.current != null && p.alt > lastAltRef.current) {
            setElevation((e) => e + (p.alt! - lastAltRef.current!));
          }
          lastAltRef.current = p.alt;
        }
      },
      () => {
        setHasGeo(false);
        toast.error(tt("activity.noMapPermission"));
      },
      { enableHighAccuracy: true, maximumAge: 1000, timeout: 10000 },
    );
    watchIdRef.current = id;
    // 30s timeout: if no GPS lock yet, ask user whether to continue without lock
    const timeoutId = window.setTimeout(() => {
      if (!gpsLockedRef.current && !allowWithoutLockRef.current) {
        setWeakGpsOpen(true);
      }
    }, 30000);
    return () => {
      if (watchIdRef.current != null) navigator.geolocation.clearWatch(watchIdRef.current);
      window.clearTimeout(timeoutId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started]);

  // Wake Lock + beforeunload while recording
  useEffect(() => {
    if (!started) return;
    recordingRef.current = true;
    const acquireWakeLock = async () => {
      if (!wakeLockSupported()) return;
      try {
        const wl = await (navigator as any).wakeLock.request("screen");
        wakeLockRef.current = wl;
        setWakeLockActive(true);
        wl.addEventListener?.("release", () => setWakeLockActive(false));
      } catch {
        /* silent */
      }
    };
    acquireWakeLock();
    const onVis = () => {
      if (document.visibilityState === "visible" && recordingRef.current) acquireWakeLock();
    };
    document.addEventListener("visibilitychange", onVis);
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      recordingRef.current = false;
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("beforeunload", onBeforeUnload);
      if (wakeLockRef.current) {
        try { wakeLockRef.current.release?.(); } catch { /* ignore */ }
        wakeLockRef.current = null;
      }
      setWakeLockActive(false);
    };
  }, [started]);

  // In-app navigation block (custom event from BottomNav)
  const [pendingNav, setPendingNav] = useState<string | null>(null);
  useEffect(() => {
    if (!started) return;
    (window as any).__suryaRecording = true;
    const onAttempt = (e: Event) => {
      const path = (e as CustomEvent).detail?.path;
      if (path) setPendingNav(path);
    };
    window.addEventListener("surya:nav-attempt", onAttempt as EventListener);
    return () => {
      (window as any).__suryaRecording = false;
      window.removeEventListener("surya:nav-attempt", onAttempt as EventListener);
    };
  }, [started]);

  // Draw map
  useEffect(() => {
    const c = canvasRef.current;
    if (!c || isFree || points.length === 0) return;
    const dpr = window.devicePixelRatio || 1;
    const w = c.clientWidth, h = c.clientHeight;
    c.width = w * dpr; c.height = h * dpr;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);
    const lats = points.map(p => p.lat), lngs = points.map(p => p.lng);
    const minLat = Math.min(...lats), maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
    const pad = 16;
    const sx = (lng: number) => pad + ((lng - minLng) / Math.max(1e-9, maxLng - minLng)) * (w - pad * 2);
    const sy = (lat: number) => h - pad - ((lat - minLat) / Math.max(1e-9, maxLat - minLat)) * (h - pad * 2);
    ctx.strokeStyle = "rgba(255,107,0,0.8)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    points.forEach((p, i) => {
      const x = sx(p.lng), y = sy(p.lat);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.stroke();
    // start dot
    const start = points[0], curr = points[points.length - 1];
    ctx.fillStyle = "#10b981";
    ctx.beginPath(); ctx.arc(sx(start.lng), sy(start.lat), 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#ff6b00";
    ctx.beginPath(); ctx.arc(sx(curr.lng), sy(curr.lat), 6, 0, Math.PI * 2); ctx.fill();
  }, [points, isFree]);

  const handlePauseToggle = () => {
    if (running) {
      pauseStartRef.current = Date.now();
      setRunning(false);
    } else {
      if (pauseStartRef.current) accumPausedRef.current += Date.now() - pauseStartRef.current;
      pauseStartRef.current = null;
      setRunning(true);
    }
  };

  const confirmStop = () => {
    setStopOpen(false);
    recordingRef.current = false;
    if (wakeLockRef.current) {
      try { wakeLockRef.current.release?.(); } catch { /* ignore */ }
      wakeLockRef.current = null;
    }
    const distanceFinal = distanceRef.current;
    const durationSec = Math.floor((Date.now() - startedAtRef.current - accumPausedRef.current) / 1000);
    const avgPace = distanceFinal > 0.001 ? Math.round(durationSec / distanceFinal) : 0;
    const avgSpeed = durationSec > 0 ? (distanceFinal / (durationSec / 3600)) : 0;
    const calories = calcCalories(activity, weightKg, durationSec / 3600);
    const session = {
      activity_type: activity,
      date: getTodayLocal(),
      distance_km: Number(distanceFinal.toFixed(3)),
      duration_seconds: durationSec,
      avg_pace_seconds_per_km: avgPace,
      calories,
      avg_speed_kmh: Number(avgSpeed.toFixed(2)),
      max_speed_kmh: Number(maxSpeed.toFixed(2)),
      elevation_gain_m: Number(elevation.toFixed(1)),
      splits_json: splits,
      route_json: pointsRef.current.map(p => ({ lat: p.lat, lng: p.lng, t: p.t, alt: p.alt ?? null })),
    };
    sessionStorage.setItem("surya:lastActivity", JSON.stringify(session));
    nav(`/${activity}/summary`);
  };

  const beginRecording = (rememberHide: boolean) => {
    if (rememberHide) {
      try { localStorage.setItem("hideTrackingWarning", "true"); } catch { /* ignore */ }
    }
    startedAtRef.current = Date.now();
    accumPausedRef.current = 0;
    setShowWarning(false);
    setStarted(true);
  };

  const searchingGps = !gpsLocked && !allowWithoutLock;
  const pace = !searchingGps && distance >= 0.1 ? Math.round(elapsed / distance) : 0;
  const calories = calcCalories(activity, weightKg, elapsed / 3600);

  return (
    <div className="min-h-screen page-bg" style={{ paddingBottom: "calc(160px + env(safe-area-inset-bottom, 16px))" }}>
      <header className="px-4 pt-4 pb-2 text-center">
        <div className="inline-flex items-center gap-2">
          <span className="inline-block px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider"
            style={{ background: running ? "rgba(16,185,129,0.15)" : "rgba(255,107,0,0.15)", color: running ? "#10b981" : "#ff6b00" }}>
            {running ? tt("activity.recording") : tt("activity.paused")}
          </span>
          {wakeLockActive && (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold" style={{ color: "#10b981" }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#10b981", boxShadow: "0 0 6px #10b981" }} />
              {L("screenOn")}
            </span>
          )}
        </div>
        {searchingGps && (
          <p className="mt-2 text-xs font-semibold" style={{ color: "#ff6b00" }}>
            {tt("activity.gpsSearching")}
          </p>
        )}
      </header>

      <div className="px-4 max-w-3xl mx-auto">
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: tt("activity.distance"), value: searchingGps ? "0.00" : distance.toFixed(2), unit: "km", color: "#ff6b00" },
            { label: tt("activity.time"), value: formatDuration(elapsed), unit: "", color: "hsl(var(--foreground))" },
            { label: tt("activity.pace"), value: !searchingGps && pace > 0 ? formatPace(pace) : "--:--", unit: "/km", color: "hsl(var(--foreground))" },
            { label: tt("activity.calories"), value: String(calories), unit: "kcal", color: "hsl(var(--foreground))" },
          ].map((c) => (
            <div key={c.label} className="rounded-card p-4" style={{ background: "hsl(var(--surface))", border: "1px solid hsl(var(--border) / 0.12)" }}>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{c.label}</p>
              <p className="font-extrabold mt-1" style={{ fontSize: 28, color: c.color, lineHeight: 1.1 }}>{c.value}<span style={{ fontSize: 12, color: "hsl(var(--muted-foreground))", marginLeft: 4 }}>{c.unit}</span></p>
            </div>
          ))}
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3 text-center">
          <div className="rounded-card p-2" style={{ background: "hsl(var(--surface))", border: "1px solid hsl(var(--border) / 0.12)" }}>
            <p className="text-[10px] text-muted-foreground">{tt("activity.speed")}</p>
            <p className="text-sm font-bold text-foreground">{currentSpeed.toFixed(1)} km/h</p>
          </div>
          <div className="rounded-card p-2" style={{ background: "hsl(var(--surface))", border: "1px solid hsl(var(--border) / 0.12)" }}>
            <p className="text-[10px] text-muted-foreground">{tt("activity.elevation")}</p>
            <p className="text-sm font-bold text-foreground">{Math.round(elevation)} m</p>
          </div>
        </div>

        <div className="mt-4 rounded-card overflow-hidden relative" style={{ background: "hsl(var(--surface))", border: "1px solid hsl(var(--border) / 0.12)", height: 180 }}>
          {isFree ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2" style={{ background: "rgba(15,15,17,0.85)", backdropFilter: "blur(6px)" }}>
              <Lock className="w-6 h-6 text-muted-foreground" />
              <p className="text-xs font-semibold text-muted-foreground">{tt("activity.mapLockedFree")}</p>
            </div>
          ) : hasGeo === false ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <p className="text-xs text-muted-foreground">{tt("activity.noMapPermission")}</p>
            </div>
          ) : (
            <canvas ref={canvasRef} className="w-full h-full" style={{ display: "block" }} />
          )}
        </div>

        {!isFree && splits.length > 0 && (
          <div className="mt-3 rounded-card p-3" style={{ background: "hsl(var(--surface))", border: "1px solid hsl(var(--border) / 0.12)" }}>
            <p className="text-[11px] font-bold text-foreground">
              KM {splits[splits.length - 1].km}: {formatPace(splits[splits.length - 1].pace_seconds)} pace
            </p>
          </div>
        )}
      </div>

      <div className="fixed left-0 right-0 px-4 z-30" style={{ bottom: "calc(65px + env(safe-area-inset-bottom, 16px) + 16px)" }}>
        <div className="max-w-3xl mx-auto flex items-center justify-center gap-4">
          {running ? (
            <button onClick={handlePauseToggle} aria-label={tt("activity.pause")}
              className="w-14 h-14 rounded-full flex items-center justify-center"
              style={{ background: "linear-gradient(135deg,#ff6b00,#ff3d7f)", boxShadow: "0 6px 20px rgba(255,107,0,0.5)" }}>
              <Pause className="w-6 h-6 text-white" />
            </button>
          ) : (
            <>
              <button onClick={handlePauseToggle} aria-label={tt("activity.resume")}
                className="w-14 h-14 rounded-full flex items-center justify-center"
                style={{ background: "linear-gradient(135deg,#ff6b00,#ff3d7f)" }}>
                <Play className="w-6 h-6 text-white" />
              </button>
              <button onClick={() => setStopOpen(true)} aria-label={tt("activity.confirm")}
                className="w-14 h-14 rounded-full flex items-center justify-center"
                style={{ background: "#ef4444" }}>
                <Square className="w-6 h-6 text-white" />
              </button>
            </>
          )}
        </div>
      </div>

      <AlertDialog open={stopOpen} onOpenChange={setStopOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{tt("activity.stopConfirm")}</AlertDialogTitle>
            <AlertDialogDescription>{tt("activity.stopConfirmBody")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tt("activity.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmStop} style={{ background: "#ef4444" }}>{tt("activity.confirm")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={weakGpsOpen} onOpenChange={setWeakGpsOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{tt("activity.gpsWeakTitle")}</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { setWeakGpsOpen(false); nav("/"); }}>
              {tt("activity.gpsCancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                allowWithoutLockRef.current = true;
                setAllowWithoutLock(true);
                setWeakGpsOpen(false);
              }}
              style={{ background: "#ff6b00" }}
            >
              {tt("activity.gpsContinue")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Pre-recording warning */}
      {showWarning && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4" style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)" }}>
          <div className="w-full max-w-sm rounded-2xl p-6" style={{ background: "hsl(var(--surface))", border: "1px solid hsl(var(--border) / 0.2)" }}>
            <div className="flex justify-center mb-3">
              <AlertTriangle size={40} color="#ff6b00" />
            </div>
            <h2 className="text-center text-lg font-extrabold text-foreground mb-3">{L("warnTitle")}</h2>
            <p className="text-sm text-muted-foreground whitespace-pre-line mb-2">{L("warnBody")}</p>
            {!wakeLockSupported() && (
              <p className="text-xs font-semibold mt-2 mb-2" style={{ color: "#ff6b00" }}>{L("warnIos")}</p>
            )}
            <button
              onClick={() => beginRecording(false)}
              className="mt-4 w-full h-12 rounded-btn font-extrabold text-white"
              style={{ background: "linear-gradient(90deg,#ff6b00,#ff3d7f)", boxShadow: "0 4px 20px rgba(255,107,0,0.4)" }}
            >
              {L("warnCta")}
            </button>
            <button
              onClick={() => beginRecording(true)}
              className="mt-3 w-full text-xs font-semibold text-muted-foreground underline"
            >
              {L("warnDontShow")}
            </button>
          </div>
        </div>
      )}

      {/* In-app navigation block */}
      <AlertDialog open={!!pendingNav} onOpenChange={(o) => { if (!o) setPendingNav(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{L("leaveTitle")}</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingNav(null)}>{L("stay")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                recordingRef.current = false;
                (window as any).__suryaRecording = false;
                if (wakeLockRef.current) {
                  try { wakeLockRef.current.release?.(); } catch { /* ignore */ }
                  wakeLockRef.current = null;
                }
                const target = pendingNav!;
                setPendingNav(null);
                nav(target);
              }}
              style={{ background: "#ef4444" }}
            >
              {L("leave")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}