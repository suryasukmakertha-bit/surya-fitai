import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Pause, Play, Square, Lock } from "lucide-react";
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

export default function ActivityActive({ activity }: { activity: ActivityType }) {
  const nav = useNavigate();
  const { user } = useAuth();
  const { t } = useLanguage();
  const tt = (k: string) => (t as any)[k] || k;
  const { access } = useSubscription();
  const isFree = access.isFreeTier && !access.isUnlimited;

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

  const startedAtRef = useRef(Date.now());
  const accumPausedRef = useRef(0);
  const pauseStartRef = useRef<number | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const pointsRef = useRef<Point[]>([]);
  const distanceRef = useRef(0);
  const lastSplitKmRef = useRef(0);
  const lastAltRef = useRef<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Load weight
  useEffect(() => { if (user) getUserWeightKg(user.id).then(setWeightKg); }, [user]);

  // Timer
  useEffect(() => {
    const id = setInterval(() => {
      if (!running) return;
      const sec = Math.floor((Date.now() - startedAtRef.current - accumPausedRef.current) / 1000);
      setElapsed(sec);
    }, 1000);
    return () => clearInterval(id);
  }, [running]);

  // Geolocation
  useEffect(() => {
    if (!navigator.geolocation) { setHasGeo(false); return; }
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        setHasGeo(true);
        if (!running) return;
        const p: Point = {
          lat: pos.coords.latitude, lng: pos.coords.longitude,
          t: Date.now(), alt: pos.coords.altitude, speed: pos.coords.speed,
        };
        const prev = pointsRef.current[pointsRef.current.length - 1];
        if (prev) {
          const d = haversineKm(prev, p);
          if (d > 0 && d < 0.2) { // ignore jumps
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
    return () => { if (watchIdRef.current != null) navigator.geolocation.clearWatch(watchIdRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    const distanceFinal = distanceRef.current;
    const durationSec = Math.floor((Date.now() - startedAtRef.current - accumPausedRef.current) / 1000);
    const avgPace = distanceFinal > 0.001 ? Math.round(durationSec / distanceFinal) : 0;
    const avgSpeed = durationSec > 0 ? (distanceFinal / (durationSec / 3600)) : 0;
    const calories = calcCalories(activity, weightKg, durationSec / 3600);
    const session = {
      activity_type: activity,
      date: new Date().toISOString().slice(0, 10),
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

  const pace = distance >= 0.1 ? Math.round(elapsed / distance) : 0;
  const calories = calcCalories(activity, weightKg, elapsed / 3600);

  return (
    <div className="min-h-screen page-bg pb-24">
      <header className="px-4 pt-4 pb-2 text-center">
        <span className="inline-block px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider"
          style={{ background: running ? "rgba(16,185,129,0.15)" : "rgba(255,107,0,0.15)", color: running ? "#10b981" : "#ff6b00" }}>
          {running ? tt("activity.recording") : tt("activity.paused")}
        </span>
      </header>

      <div className="px-4 max-w-3xl mx-auto">
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: tt("activity.distance"), value: distance.toFixed(2), unit: "km", color: "#ff6b00" },
            { label: tt("activity.time"), value: formatDuration(elapsed), unit: "", color: "hsl(var(--foreground))" },
            { label: tt("activity.pace"), value: pace > 0 ? formatPace(pace) : "--:--", unit: "/km", color: "hsl(var(--foreground))" },
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

      <div className="fixed bottom-4 left-0 right-0 px-4 z-30">
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
    </div>
  );
}