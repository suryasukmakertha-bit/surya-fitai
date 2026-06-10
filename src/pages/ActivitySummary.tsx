import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Bike, Trophy } from "lucide-react";
import RunningIcon from "@/components/icons/RunningIcon";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSubscription } from "@/hooks/useSubscription";
import {
  type ActivityType, type ActivitySession,
  formatDuration, formatPace, saveSession, countSessions,
  getPersonalBest, getPngDownloadCount, incrementPngDownload,
} from "@/lib/activityTracking";
import { downloadActivityPng } from "@/lib/activityImage";
import { checkActivityMedals } from "@/lib/dailyChallenge";
import { emitMedalsEarned } from "@/lib/medalEvents";
import { supabase } from "@/integrations/supabase/client";

const FREE_SAVE_LIMIT = 10;
const FREE_DOWNLOAD_LIMIT = 3;

export default function ActivitySummary({ activity }: { activity: ActivityType }) {
  const nav = useNavigate();
  const { user } = useAuth();
  const { t, lang } = useLanguage();
  const tt = (k: string) => (t as any)[k] || k;
  const { access } = useSubscription();
  const isFree = access.isFreeTier && !access.isUnlimited;
  const locale = lang === "id" ? "id-ID" : lang === "zh" ? "zh-CN" : "en-US";
  const isRunning = activity === "running";
  const title = activity === "running" ? tt("running.title") : tt("cycling.title");

  const session = useMemo<ActivitySession | null>(() => {
    try {
      const raw = sessionStorage.getItem("surya:lastActivity");
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (parsed.activity_type !== activity) return null;
      return parsed;
    } catch { return null; }
  }, [activity]);

  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [isPB, setIsPB] = useState(false);

  useEffect(() => {
    if (!user || !session) return;
    getPersonalBest(user.id, activity).then((pb) => {
      const curPace = Number(session.avg_pace_seconds_per_km);
      if (!(session.distance_km >= 1.0) || !(curPace > 0)) return;
      const pbPace = Number(pb?.avg_pace_seconds_per_km || 0);
      if (!pb || !pbPace || curPace < pbPace) setIsPB(true);
    });
  }, [user, session, activity]);

  if (!session) {
    return (
      <div className="min-h-screen page-bg flex items-center justify-center px-4">
        <p className="text-muted-foreground text-sm">{tt("activity.noSessions")}</p>
      </div>
    );
  }

  const dateStr = new Date().toLocaleDateString(locale, { day: "2-digit", month: "long", year: "numeric" });

  const onSave = async () => {
    if (!user || saved) return;
    setSaving(true);
    try {
      if (isFree) {
        const c = await countSessions(user.id, activity);
        if (c >= FREE_SAVE_LIMIT) { toast.error(tt("activity.saveLimit")); setSaving(false); return; }
      }
      const res = await saveSession({ ...session, user_id: user.id });
      if (!res.ok) { toast.error("Save failed"); setSaving(false); return; }
      setSaved(true);
      toast.success(tt("activity.saveSuccess"));
      const medals = await checkActivityMedals(user.id, activity, session.distance_km);
      if (medals.length) emitMedalsEarned(medals);
    } finally { setSaving(false); }
  };

  const onDownload = async () => {
    if (!user) return;
    setDownloading(true);
    try {
      if (isFree) {
        const c = await getPngDownloadCount(user.id);
        if (c >= FREE_DOWNLOAD_LIMIT) { toast.error(tt("activity.downloadLimit")); setDownloading(false); return; }
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("user_id", user.id)
        .maybeSingle();
      const rawName =
        (profile?.display_name && profile.display_name.trim()) ||
        user.email?.split("@")[0] ||
        "Athlete";
      const userName = rawName
        .replace(/[._-]+/g, " ")
        .split(/\s+/)
        .filter(Boolean)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(" ");
      await downloadActivityPng({
        session: { ...session, created_at: new Date().toISOString() },
        userName,
        i18n: {
          title, distance: tt("activity.distance"), time: tt("activity.time"),
          pace: tt("activity.avgPace"), calories: tt("activity.calories"),
          speed: tt("activity.avgSpeed"), maxSpeed: tt("activity.maxSpeed"),
          elevation: tt("activity.elevation"), splits: tt("activity.splits"),
          locale, tagline: (t as any)["medal.png.tagline"] || "AI-POWERED. YOU. LIMITLESS.",
        },
      });
      if (isFree) await incrementPngDownload(user.id);
    } finally { setDownloading(false); }
  };

  const onShare = async () => {
    const txt = `${title} ${session.distance_km.toFixed(2)}km · ${formatDuration(session.duration_seconds)} · ${formatPace(session.avg_pace_seconds_per_km)}/km`;
    if ((navigator as any).share) {
      try { await (navigator as any).share({ title: "Surya-FitAi", text: txt }); return; } catch {}
    }
    try { await navigator.clipboard.writeText(txt); toast.success("Copied"); } catch {}
  };

  return (
    <div className="min-h-screen page-bg pb-24">
      <header className="px-4 pt-4 pb-2 flex items-center gap-3">
        <button onClick={() => nav("/")} className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "hsl(var(--surface))" }} aria-label="Back">
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <h1 className="text-lg font-display font-bold text-foreground flex items-center gap-2">
          {isRunning ? <RunningIcon size={20} color="#ff6b00" /> : <Bike className="w-5 h-5" style={{ color: "#ff6b00" }} />}
          {title} · {tt("activity.summaryTitle")}
        </h1>
      </header>

      <div className="px-4 max-w-3xl mx-auto">
        <div className="text-center my-6">
          <p className="font-extrabold" style={{ fontSize: 48, color: "#ff6b00", lineHeight: 1 }}>
            {session.distance_km.toFixed(2)} <span style={{ fontSize: 18, color: "hsl(var(--muted-foreground))" }}>km</span>
          </p>
          <p className="text-xs text-muted-foreground mt-1">{dateStr}</p>
        </div>

        {isPB && (
          <div className="rounded-card p-3 mb-4 flex items-center gap-3" style={{ background: "rgba(255,215,0,0.10)", border: "1px solid rgba(255,215,0,0.4)" }}>
            <Trophy className="w-5 h-5" style={{ color: "#ffd700" }} />
            <p className="text-sm font-bold" style={{ color: "#ffd700" }}>
              {tt("activity.newRecord")} {tt("activity.personalBest")}: {formatPace(session.avg_pace_seconds_per_km)} /km
            </p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          {[
            [tt("activity.time"), formatDuration(session.duration_seconds)],
            [tt("activity.avgPace"), `${formatPace(session.avg_pace_seconds_per_km)}/km`],
            [tt("activity.calories"), `${session.calories} kcal`],
            [tt("activity.avgSpeed"), `${Number(session.avg_speed_kmh).toFixed(1)} km/h`],
            [tt("activity.maxSpeed"), `${Number(session.max_speed_kmh).toFixed(1)} km/h`],
            [tt("activity.elevation"), `${Math.round(Number(session.elevation_gain_m))} m`],
          ].map(([l, v]) => (
            <div key={l} className="rounded-card p-3" style={{ background: "hsl(var(--surface))", border: "1px solid hsl(var(--border) / 0.12)" }}>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{l}</p>
              <p className="text-base font-extrabold text-foreground mt-1">{v}</p>
            </div>
          ))}
        </div>

        {session.distance_km >= 1.0 && (() => {
          const fullSplits = (session.splits_json || []).map((s) => ({
            label: String(s.km),
            pace: s.pace_seconds,
            partial: false,
          }));
          const partialKm = session.distance_km - fullSplits.length;
          const bars = [...fullSplits];
          if (partialKm >= 0.1 && Number(session.avg_pace_seconds_per_km) > 0) {
            bars.push({
              label: session.distance_km.toFixed(1),
              pace: Number(session.avg_pace_seconds_per_km),
              partial: true,
            });
          }
          if (bars.length === 0) return null;
          const paces = bars.map((b) => b.pace).filter((p) => p > 0);
          const minPace = Math.min(...paces);
          const maxPace = Math.max(...paces);
          const fastestIdx = bars.findIndex((b) => b.pace === minPace);
          const MIN_H = 20, MAX_H = 52;
          const heightFor = (pace: number) => {
            if (maxPace === minPace) return MAX_H;
            // faster (lower pace) = taller
            const norm = (maxPace - pace) / (maxPace - minPace);
            return MIN_H + norm * (MAX_H - MIN_H);
          };
          return (
            <div className="mt-4 rounded-card p-3" style={{ background: "hsl(var(--surface))", border: "1px solid hsl(var(--border) / 0.12)" }}>
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-3">
                {tt("activity.splitsPerKm") !== "activity.splitsPerKm" ? tt("activity.splitsPerKm") : "SPLITS PER KM"}
              </p>
              <div className="flex items-end gap-1.5 overflow-x-auto pb-1" style={{ minHeight: MAX_H + 24 }}>
                {bars.map((b, i) => {
                  const h = heightFor(b.pace);
                  const isFastest = i === fastestIdx;
                  const color = isFastest ? "#ff3d7f" : "#ff6b00";
                  return (
                    <div key={i} className="flex flex-col items-center flex-1" style={{ minWidth: 18 }}>
                      <div
                        title={`${formatPace(b.pace)}/km`}
                        style={{
                          width: "100%",
                          height: h,
                          borderRadius: 4,
                          background: `linear-gradient(180deg, ${color} 0%, ${color}00 100%)`,
                          boxShadow: isFastest ? "0 0 6px rgba(255,61,127,0.5)" : "none",
                        }}
                      />
                      <span className="text-[10px] mt-1 text-muted-foreground">{b.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

        <div className="mt-6 space-y-2">
          <button onClick={onSave} disabled={saved || saving}
            className="w-full h-12 rounded-btn font-extrabold text-white disabled:opacity-60"
            style={{ background: "linear-gradient(90deg,#ff6b00,#ff3d7f)" }}>
            {saved ? tt("activity.saveSuccess") : tt("activity.save")}
          </button>
          <button onClick={onDownload} disabled={downloading}
            className="w-full h-11 rounded-btn font-bold border"
            style={{ borderColor: "rgba(255,107,0,0.4)", color: "#ff6b00", background: "transparent" }}>
            {tt("activity.download")}
          </button>
          <button onClick={onShare} className="w-full h-10 font-semibold text-muted-foreground">
            {tt("activity.share")}
          </button>
        </div>
      </div>
    </div>
  );
}