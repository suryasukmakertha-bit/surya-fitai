import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Bike, Lock, Trophy } from "lucide-react";
import RunningIcon from "@/components/icons/RunningIcon";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSubscription } from "@/hooks/useSubscription";
import {
  type ActivityType,
  type ActivitySession,
  loadSessions,
  getPersonalBest,
  formatDuration,
  formatPace,
} from "@/lib/activityTracking";

export default function ActivityPre({ activity }: { activity: ActivityType }) {
  const nav = useNavigate();
  const { user } = useAuth();
  const { t, lang } = useLanguage();
  const tt = (k: string, vars?: Record<string, string | number>) => {
    let s = (t as any)[k] || k;
    if (vars) for (const [k2, v] of Object.entries(vars)) s = s.replace(`{{${k2}}}`, String(v));
    return s;
  };
  const { access } = useSubscription();
  const isFree = access.isFreeTier && !access.isUnlimited;
  const [sessions, setSessions] = useState<ActivitySession[]>([]);
  const [pb, setPb] = useState<ActivitySession | null>(null);
  const isRunning = activity === "running";
  const title = activity === "running" ? tt("running.title") : tt("cycling.title");
  const startCta = activity === "running" ? tt("running.start") : tt("cycling.start");
  const locale = lang === "id" ? "id-ID" : lang === "zh" ? "zh-CN" : "en-US";

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const [s, p] = await Promise.all([loadSessions(user.id, activity, 5), getPersonalBest(user.id, activity)]);
      if (cancelled) return;
      setSessions(s);
      setPb(p);
    })();
    return () => { cancelled = true; };
  }, [user, activity]);

  return (
    <div className="min-h-screen page-bg pb-24">
      <header className="px-4 pt-4 pb-2 flex items-center gap-3">
        <button onClick={() => nav("/")} className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "hsl(var(--surface))" }} aria-label="Back">
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <h1 className="text-lg font-display font-bold text-foreground">{title}</h1>
      </header>

      <div className="px-4 max-w-3xl mx-auto">
        <div className="flex justify-center my-6">
          <div className="w-24 h-24 rounded-full flex items-center justify-center" style={{ background: "linear-gradient(135deg, rgba(255,107,0,0.15), rgba(255,61,127,0.10))", border: "1px solid rgba(255,107,0,0.3)" }}>
            {isRunning ? (
              <RunningIcon size={64} color="#ff6b00" />
            ) : (
              <Bike className="w-16 h-16" style={{ color: "#ff6b00" }} />
            )}
          </div>
        </div>

        {pb && (
          <div className="rounded-card p-4 mb-4 flex items-center gap-3" style={{ background: "rgba(255,107,0,0.08)", border: "1px solid rgba(255,107,0,0.2)" }}>
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-extrabold" style={{ background: "#ff6b00", color: "#000" }}>
              <Trophy className="w-3 h-3" /> {tt("activity.pb")}
            </span>
            <div className="flex-1">
              <p className="text-sm font-extrabold text-foreground">{pb.distance_km.toFixed(2)} km</p>
              <p className="text-[11px] text-muted-foreground">{formatPace(pb.avg_pace_seconds_per_km)} /km · {formatDuration(pb.duration_seconds)}</p>
            </div>
          </div>
        )}

        {isFree && (
          <div className="rounded-card p-3 mb-4 flex items-center gap-2" style={{ background: "hsl(var(--surface))", border: "1px dashed hsl(var(--border) / 0.3)" }}>
            <Lock className="w-4 h-4 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">{tt("activity.locationLocked")}</p>
          </div>
        )}

        <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">{tt("activity.lastSessions")}</h2>
        {sessions.length === 0 ? (
          <div className="rounded-card p-6 text-center" style={{ background: "hsl(var(--surface))", border: "1px solid hsl(var(--border) / 0.12)" }}>
            <p className="text-sm text-muted-foreground">{tt("activity.noSessions")}</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {sessions.map((s) => (
              <li key={s.id} className="rounded-card p-3 grid grid-cols-4 gap-2 items-center" style={{ background: "hsl(var(--surface))", border: "1px solid hsl(var(--border) / 0.12)" }}>
                <span className="text-[11px] text-muted-foreground">{new Date(s.date).toLocaleDateString(locale, { day: "2-digit", month: "short" })}</span>
                <span className="text-sm font-bold text-foreground">{s.distance_km.toFixed(2)} km</span>
                <span className="text-[12px] text-muted-foreground">{formatDuration(s.duration_seconds)}</span>
                <span className="text-[12px] text-muted-foreground text-right">{formatPace(s.avg_pace_seconds_per_km)}/km</span>
              </li>
            ))}
          </ul>
        )}

        <button
          onClick={() => nav(`/${activity}/active`)}
          className="mt-6 w-full h-14 rounded-btn font-extrabold text-white text-base"
          style={{ background: "linear-gradient(90deg,#ff6b00,#ff3d7f)", boxShadow: "0 4px 24px rgba(255,107,0,0.4)" }}
        >
          {startCta}
        </button>
      </div>
    </div>
  );
}