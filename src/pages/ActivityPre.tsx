import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Bike, Lock, Trophy, TrendingUp, TrendingDown, Minus } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Area,
} from "recharts";
import RunningIcon from "@/components/icons/RunningIcon";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSubscription } from "@/hooks/useSubscription";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import AppHeader from "@/components/AppHeader";
import {
  type ActivityType,
  type ActivitySession,
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
  const [loading, setLoading] = useState(true);
  const isRunning = activity === "running";
  const title = activity === "running" ? tt("running.title") : tt("cycling.title");
  const startCta = activity === "running" ? tt("running.start") : tt("cycling.start");
  const locale = lang === "id" ? "id-ID" : lang === "zh" ? "zh-CN" : "en-US";

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      const sb = supabase as any;
      const [sRes, p] = await Promise.all([
        sb
          .from("activity_sessions")
          .select("*")
          .eq("user_id", user.id)
          .eq("activity_type", activity)
          .order("date", { ascending: false })
          .limit(20),
        getPersonalBest(user.id, activity),
      ]);
      if (cancelled) return;
      setSessions((sRes?.data || []) as ActivitySession[]);
      setPb(p);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user, activity]);

  // Monday-anchored week start for a date
  const weekStart = (d: Date) => {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    const idx = (x.getDay() + 6) % 7;
    x.setDate(x.getDate() - idx);
    return x;
  };
  const fmtDate = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  const stats = useMemo(() => {
    const now = new Date();
    const currentWeek = weekStart(now);
    // Build up to 8 weekly buckets ending at current week
    const buckets: { key: string; label: string; start: Date; km: number; paceSum: number; paceCount: number; kcal: number; count: number }[] = [];
    for (let i = 7; i >= 0; i--) {
      const start = new Date(currentWeek);
      start.setDate(currentWeek.getDate() - i * 7);
      buckets.push({
        key: fmtDate(start),
        label: start.toLocaleDateString(locale, { day: "2-digit", month: "short" }),
        start,
        km: 0, paceSum: 0, paceCount: 0, kcal: 0, count: 0,
      });
    }
    const byKey = new Map(buckets.map((b) => [b.key, b]));
    let totalKm = 0;
    for (const s of sessions) {
      totalKm += Number(s.distance_km || 0);
      const wk = weekStart(new Date(s.date));
      const key = fmtDate(wk);
      const b = byKey.get(key);
      if (!b) continue;
      b.km += Number(s.distance_km || 0);
      b.kcal += Number(s.calories || 0);
      b.count += 1;
      const p = Number(s.avg_pace_seconds_per_km || 0);
      if (p > 0) { b.paceSum += p; b.paceCount += 1; }
    }
    // Trim leading empty buckets if user has < 8 weeks of history, but keep at least the weeks since first session
    let firstNonEmpty = 0;
    for (let i = 0; i < buckets.length; i++) {
      if (buckets[i].count > 0) { firstNonEmpty = i; break; }
      firstNonEmpty = i;
    }
    const trimmed = buckets.slice(Math.max(0, firstNonEmpty));
    const distanceData = trimmed.map((b) => ({ label: b.label, km: Number(b.km.toFixed(2)), current: b.key === fmtDate(currentWeek) }));
    const paceData = trimmed
      .map((b) => ({ label: b.label, pace: b.paceCount > 0 ? Math.round(b.paceSum / b.paceCount) : null, current: b.key === fmtDate(currentWeek) }));
    const caloriesData = trimmed.map((b) => ({ label: b.label, kcal: Math.round(b.kcal), current: b.key === fmtDate(currentWeek) }));

    const cur = byKey.get(fmtDate(currentWeek))!;
    const prevStart = new Date(currentWeek); prevStart.setDate(currentWeek.getDate() - 7);
    const prev = byKey.get(fmtDate(prevStart));
    const trend: "up" | "down" | "eq" =
      !prev ? "eq" : cur.km > prev.km + 0.01 ? "up" : cur.km < prev.km - 0.01 ? "down" : "eq";

    const paceValues = paceData.map((p) => p.pace).filter((x): x is number => !!x);
    const avgPace = paceValues.length ? Math.round(paceValues.reduce((a, b) => a + b, 0) / paceValues.length) : 0;

    return {
      distanceData, paceData, caloriesData,
      weekKm: cur.km, weekSessions: cur.count, weekKcal: Math.round(cur.kcal),
      trend, totalKm, totalCount: sessions.length, avgPace,
    };
  }, [sessions, locale]);

  const showCharts = sessions.length >= 1;
  const ORANGE = "#FF5E1A";
  const MUTED = "rgba(255,94,26,0.4)";
  const GRID = "hsl(var(--border))";
  const AXIS = "hsl(var(--foreground))";
  const AXIS_OPACITY = 0.5;
  const GRID_OPACITY = 0.4;

  const paceTickFmt = (v: number) => {
    if (!v || !Number.isFinite(v)) return "";
    const m = Math.floor(v / 60);
    const s = Math.floor(v % 60);
    return `${m}:${String(s).padStart(2, "0")}`;
  };

  // Shared glassmorphism tooltip
  const GlassTooltip = ({ active, payload, label, valueFmt, suffix }: any) => {
    if (!active || !payload || !payload.length) return null;
    const raw = payload[0].value;
    const display = valueFmt ? valueFmt(raw) : raw;
    return (
      <div
        style={{
          background: "rgba(10,10,18,0.9)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          border: "1px solid rgba(255,94,26,0.3)",
          borderRadius: 10,
          padding: "6px 10px",
          color: "#fff",
          fontSize: 12,
          lineHeight: 1.3,
        }}
      >
        <div style={{ opacity: 0.6, fontSize: 10 }}>{label}</div>
        <div style={{ fontWeight: 700 }}>
          {display}
          {suffix || ""}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen page-bg pb-24">
      <AppHeader />
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
              <p className="text-sm font-extrabold text-foreground">{formatPace(pb.avg_pace_seconds_per_km)} /km</p>
              <p className="text-[11px] text-muted-foreground">{pb.distance_km.toFixed(2)} km · {formatDuration(pb.duration_seconds)}</p>
            </div>
          </div>
        )}

        {/* This week summary */}
        {loading ? (
          <div className="grid grid-cols-3 gap-2 mb-4">
            {[0,1,2].map((i) => <Skeleton key={i} className="h-16 rounded-card" />)}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2 mb-4">
            <div className="rounded-card p-3" style={{ background: "hsl(var(--surface))", border: "1px solid hsl(var(--border) / 0.12)" }}>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Week km</p>
              <div className="flex items-center gap-1">
                <p className="text-base font-extrabold text-foreground">{stats.weekKm.toFixed(2)}</p>
                {stats.trend === "up" && <TrendingUp className="w-3.5 h-3.5 text-green-500" />}
                {stats.trend === "down" && <TrendingDown className="w-3.5 h-3.5 text-red-500" />}
                {stats.trend === "eq" && <Minus className="w-3.5 h-3.5 text-muted-foreground" />}
              </div>
            </div>
            <div className="rounded-card p-3" style={{ background: "hsl(var(--surface))", border: "1px solid hsl(var(--border) / 0.12)" }}>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Sessions</p>
              <p className="text-base font-extrabold text-foreground">{stats.weekSessions}</p>
            </div>
            <div className="rounded-card p-3" style={{ background: "hsl(var(--surface))", border: "1px solid hsl(var(--border) / 0.12)" }}>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Kcal</p>
              <p className="text-base font-extrabold text-foreground">{stats.weekKcal}</p>
            </div>
          </div>
        )}

        {/* Charts */}
        {loading ? (
          <Skeleton className="h-[160px] rounded-card mb-4" />
        ) : showCharts ? (
          <div className="rounded-card p-3 mb-4" style={{ background: "hsl(var(--surface))", border: "1px solid hsl(var(--border) / 0.12)" }}>
            <Tabs defaultValue="distance" className="w-full">
              <TabsList className="grid grid-cols-3 w-full mb-2 bg-transparent p-0 h-auto gap-1">
                {[
                  { v: "distance", l: "Distance" },
                  { v: "pace", l: "Pace" },
                  { v: "calories", l: "Calories" },
                ].map((tab) => (
                  <TabsTrigger
                    key={tab.v}
                    value={tab.v}
                    className="rounded-[10px] h-9 text-xs font-semibold transition-opacity duration-200 bg-transparent text-muted-foreground data-[state=active]:text-white data-[state=active]:shadow-none data-[state=active]:bg-[linear-gradient(90deg,#FF5E1A,#FF2D7A)]"
                  >
                    {tab.l}
                  </TabsTrigger>
                ))}
              </TabsList>
              <TabsContent value="distance">
                <div style={{ width: "100%", height: 120 }}>
                  <ResponsiveContainer>
                    <BarChart data={stats.distanceData} margin={{ top: 8, right: 4, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="barGradDist" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#FF5E1A" stopOpacity={1} />
                          <stop offset="100%" stopColor="#FF5E1A" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="barGradDistMuted" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#FF5E1A" stopOpacity={0.4} />
                          <stop offset="100%" stopColor="#FF5E1A" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke={GRID} strokeOpacity={GRID_OPACITY} vertical={false} />
                      <XAxis dataKey="label" tick={{ fontSize: 10, fill: AXIS, fillOpacity: AXIS_OPACITY }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: AXIS, fillOpacity: AXIS_OPACITY }} axisLine={false} tickLine={false} />
                      <Tooltip cursor={{ fill: "rgba(255,94,26,0.08)" }} content={<GlassTooltip suffix=" km" />} />
                      <Bar dataKey="km" radius={[4, 4, 0, 0]} animationDuration={600} animationEasing="ease-out">
                        {stats.distanceData.map((d, i) => (
                          <Cell key={i} fill={d.current ? "url(#barGradDist)" : "url(#barGradDistMuted)"} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </TabsContent>
              <TabsContent value="pace">
                <div style={{ width: "100%", height: 120 }}>
                  <ResponsiveContainer>
                    <LineChart data={stats.paceData} margin={{ top: 8, right: 4, left: -10, bottom: 0 }}>
                      <defs>
                        <linearGradient id="paceArea" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#FF5E1A" stopOpacity={0.25} />
                          <stop offset="100%" stopColor="#FF5E1A" stopOpacity={0} />
                        </linearGradient>
                        <filter id="paceGlow" x="-20%" y="-20%" width="140%" height="140%">
                          <feDropShadow dx="0" dy="0" stdDeviation="2" floodColor="#FF5E1A" floodOpacity="0.7" />
                        </filter>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke={GRID} strokeOpacity={GRID_OPACITY} vertical={false} />
                      <XAxis dataKey="label" tick={{ fontSize: 10, fill: AXIS, fillOpacity: AXIS_OPACITY }} axisLine={false} tickLine={false} />
                      <YAxis reversed tickFormatter={paceTickFmt} tick={{ fontSize: 10, fill: AXIS, fillOpacity: AXIS_OPACITY }} axisLine={false} tickLine={false} />
                      <Tooltip cursor={{ stroke: "rgba(255,94,26,0.3)" }} content={<GlassTooltip valueFmt={(v: number) => paceTickFmt(v)} suffix=" /km" />} />
                      {stats.avgPace > 0 && (
                        <ReferenceLine y={stats.avgPace} stroke="rgba(255,255,255,0.2)" strokeDasharray="4 4" />
                      )}
                      <Area type="monotone" dataKey="pace" stroke="none" fill="url(#paceArea)" connectNulls isAnimationActive={false} />
                      <Line
                        type="monotone"
                        dataKey="pace"
                        stroke={ORANGE}
                        strokeWidth={2.5}
                        dot={{ r: 3, fill: "#fff", stroke: ORANGE, strokeWidth: 2 }}
                        activeDot={{ r: 5, fill: "#fff", stroke: ORANGE, strokeWidth: 2, filter: "url(#paceGlow)" }}
                        connectNulls
                        style={{ filter: "drop-shadow(0 0 6px rgba(255,94,26,0.7))" }}
                        animationDuration={800}
                        animationEasing="ease-out"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </TabsContent>
              <TabsContent value="calories">
                <div style={{ width: "100%", height: 120 }}>
                  <ResponsiveContainer>
                    <BarChart data={stats.caloriesData} margin={{ top: 8, right: 4, left: -10, bottom: 0 }}>
                      <defs>
                        <linearGradient id="barGradKcal" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#FF5E1A" stopOpacity={1} />
                          <stop offset="100%" stopColor="#FF5E1A" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="barGradKcalMuted" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#FF5E1A" stopOpacity={0.4} />
                          <stop offset="100%" stopColor="#FF5E1A" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke={GRID} strokeOpacity={GRID_OPACITY} vertical={false} />
                      <XAxis dataKey="label" tick={{ fontSize: 10, fill: AXIS, fillOpacity: AXIS_OPACITY }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: AXIS, fillOpacity: AXIS_OPACITY }} axisLine={false} tickLine={false} />
                      <Tooltip cursor={{ fill: "rgba(255,94,26,0.08)" }} content={<GlassTooltip suffix=" kcal" />} />
                      <Bar dataKey="kcal" radius={[4, 4, 0, 0]} animationDuration={600} animationEasing="ease-out">
                        {stats.caloriesData.map((d, i) => (
                          <Cell key={i} fill={d.current ? "url(#barGradKcal)" : "url(#barGradKcalMuted)"} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </TabsContent>
            </Tabs>
            <div className="flex justify-between text-[10px] text-foreground mt-2 px-1">
              <span>Total: {stats.totalKm.toFixed(1)} km</span>
              <span>{stats.totalCount} sessions</span>
            </div>
          </div>
        ) : (
          <div className="rounded-card p-4 mb-4 text-center" style={{ background: "hsl(var(--surface))", border: "1px dashed hsl(var(--border) / 0.3)" }}>
            <p className="text-xs text-muted-foreground">{isRunning ? "Complete your first run to unlock stats" : "Complete your first ride to unlock stats"}</p>
          </div>
        )}

        {isFree && (
          <div className="rounded-card p-3 mb-4 flex items-center gap-2" style={{ background: "hsl(var(--surface))", border: "1px dashed hsl(var(--border) / 0.3)" }}>
            <Lock className="w-4 h-4 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">{tt("activity.locationLocked")}</p>
          </div>
        )}

        <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">{tt("activity.lastSessions")}</h2>
        {loading ? (
          <div className="space-y-2">
            {[0,1,2].map((i) => <Skeleton key={i} className="h-12 rounded-card" />)}
          </div>
        ) : sessions.length === 0 ? (
          <div className="rounded-card p-6 text-center" style={{ background: "hsl(var(--surface))", border: "1px solid hsl(var(--border) / 0.12)" }}>
            <p className="text-sm text-muted-foreground">{tt("activity.noSessions")}</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {sessions.slice(0, 5).map((s) => (
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