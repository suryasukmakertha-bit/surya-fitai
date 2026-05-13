import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Award, Lock, Download, Pin, PinOff, X } from "lucide-react";
import { toast } from "sonner";
import AppHeader from "@/components/AppHeader";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { ALL_MEDALS, TIER_COLOR, tierGradient } from "@/lib/medalCatalog";
import { useFeaturedMedal } from "@/hooks/useFeaturedMedal";
import { downloadMedalPng } from "@/lib/medalImage";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useLanguage } from "@/contexts/LanguageContext";
import { getPlanProgress } from "@/lib/planProgress";

interface UserMedal {
  id: string;
  medal_id: string;
  medal_name: string;
  medal_tier: string;
  medal_description: string | null;
  earned_at: string;
}

export default function Medals() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { t, lang } = useLanguage();
  const tt = (k: string, vars?: Record<string, string | number>) => {
    let s = (t as any)[k] || k;
    if (vars) for (const [k2, v] of Object.entries(vars)) s = s.replace(`{{${k2}}}`, String(v));
    return s;
  };
  const locale = lang === "id" ? "id-ID" : lang === "zh" ? "zh-CN" : "en-US";
  const localizeMedal = (m: { medal_id: string; medal_name: string; medal_description?: string | null; medal_tier: string }) => ({
    name: (t as any)[`medal.${m.medal_id}.name`] || m.medal_name,
    description: (t as any)[`medal.${m.medal_id}.description`] || m.medal_description || "",
    tier: (t as any)[`medal.tier.${m.medal_tier}`] || m.medal_tier,
  });
  const [tab, setTab] = useState<"earned" | "locked">("earned");
  const [medals, setMedals] = useState<UserMedal[]>([]);
  const [displayName, setDisplayName] = useState("");
  const [selected, setSelected] = useState<UserMedal | null>(null);
  const { featured, setFeaturedMedal: setFeaturedMedalHook, removeFeaturedMedal } = useFeaturedMedal();
  const [lockedProgress, setLockedProgress] = useState<Record<string, { current: number; total: number; label: string }>>({});

  useEffect(() => { if (!authLoading && !user) navigate("/auth"); }, [authLoading, user, navigate]);

  const load = useCallback(async () => {
    if (!user) return;
    const sb = supabase as any;
    const [{ data }, { data: profile }] = await Promise.all([
      sb.from("user_medals").select("id, medal_id, medal_name, medal_tier, medal_description, earned_at").eq("user_id", user.id).order("earned_at", { ascending: false }),
      sb.from("profiles").select("display_name").eq("user_id", user.id).maybeSingle(),
    ]);
    setMedals(data || []);
    setDisplayName(profile?.display_name || user.email?.split("@")[0] || "");
  }, [user]);

  useEffect(() => { load(); }, [load]);

  // Load real progress data for locked medals
  useEffect(() => {
    if (!user) return;
    (async () => {
      const sb = supabase as any;
      const [challenges, workouts, runAgg, rideAgg, rideCount, plans, checkins] = await Promise.all([
        sb.from("user_challenge_progress").select("id", { count: "exact", head: true }).eq("user_id", user.id).not("completed_at", "is", null),
        sb.from("workout_completions").select("workout_date").eq("user_id", user.id).eq("completed", true).order("workout_date", { ascending: false }).limit(500),
        sb.from("activity_sessions").select("distance_km").eq("user_id", user.id).eq("activity_type", "running"),
        sb.from("activity_sessions").select("distance_km").eq("user_id", user.id).eq("activity_type", "cycling"),
        sb.from("activity_sessions").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("activity_type", "cycling"),
        sb.from("saved_plans").select("id, plan_data, user_info, plan_started_at, plan_completed_at, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(10),
        sb.from("progress_checkins").select("weight, date").eq("user_id", user.id).order("date", { ascending: true }),
      ]);

      const challengeCount = challenges.count || 0;

      // Streak calc
      const dates: string[] = (workouts.data || []).map((r: any) => r.workout_date);
      const dateSet = new Set(dates);
      const fmt = (d: Date) => d.toISOString().slice(0, 10);
      const cursor = new Date();
      if (!dateSet.has(fmt(cursor))) cursor.setDate(cursor.getDate() - 1);
      let streak = 0;
      while (dateSet.has(fmt(cursor))) { streak++; cursor.setDate(cursor.getDate() - 1); }

      const totalRunKm = (runAgg.data || []).reduce((s: number, r: any) => s + Number(r.distance_km || 0), 0);
      const totalRideKm = (rideAgg.data || []).reduce((s: number, r: any) => s + Number(r.distance_km || 0), 0);
      const cyclingSessions = rideCount.count || 0;

      // Weight goal progress: from start weight -> current weight -> target weight
      const activePlan = (plans.data || []).find((p: any) => !p.plan_completed_at) || (plans.data || [])[0];
      const ui = activePlan?.user_info || activePlan?.plan_data?.userInfo || {};
      const targetWeight = Number(
        ui.targetWeight ?? ui.target_weight ?? ui.weightTarget ?? ui.goalWeight ?? ui.target ?? 0
      );
      const startWeightForm = Number(ui.weight ?? ui.currentWeight ?? ui.startWeight ?? 0);
      const checkinList = (checkins.data || []) as Array<{ weight: number; date: string }>;
      const startWeight = checkinList.length > 0 ? Number(checkinList[0].weight) : startWeightForm;
      const currentWeight = checkinList.length > 0 ? Number(checkinList[checkinList.length - 1].weight) : startWeightForm;
      let weightPct = 0;
      let weightLabelKg = "";
      if (targetWeight > 0 && startWeight > 0) {
        const totalDelta = Math.abs(targetWeight - startWeight);
        const doneDelta = Math.abs(currentWeight - startWeight);
        if (totalDelta > 0) {
          const goingDown = targetWeight < startWeight;
          const movedRight = goingDown ? currentWeight <= startWeight : currentWeight >= startWeight;
          weightPct = Math.round(Math.max(0, Math.min(100, movedRight ? (doneDelta / totalDelta) * 100 : 0)));
        } else {
          weightPct = 100;
        }
        weightLabelKg = `${currentWeight.toFixed(1)} → ${targetWeight.toFixed(1)} kg`;
      }

      const sesiWord = lang === "id" ? "sesi" : lang === "zh" ? "次" : "session";
      const tantanganWord = lang === "id" ? "tantangan" : lang === "zh" ? "挑战" : "challenges";
      const streakWord = lang === "id" ? "hari streak" : lang === "zh" ? "天连击" : "day streak";
      const noTargetWord = lang === "id" ? "Target belum diatur" : lang === "zh" ? "未设置目标" : "No target set";

      setLockedProgress({
        DAILY_30:    { current: challengeCount, total: 30, label: `${Math.min(challengeCount, 30)}/30 ${tantanganWord}` },
        STREAK_30:   { current: streak,         total: 30, label: `${Math.min(streak, 30)}/30 ${streakWord}` },
        WEIGHT_GOAL: { current: weightPct, total: 100, label: weightLabelKg ? `${weightLabelKg} (${weightPct}%)` : noTargetWord },
        RUN_10K:     { current: totalRunKm,     total: 10, label: `${totalRunKm.toFixed(1)}/10 km` },
        FIRST_RIDE:  { current: Math.min(cyclingSessions, 1), total: 1, label: `${Math.min(cyclingSessions, 1)}/1 ${sesiWord}` },
        RIDE_20K:    { current: totalRideKm,    total: 20, label: `${totalRideKm.toFixed(1)}/20 km` },
      });
    })().catch(() => {});
  }, [user, lang]);

  if (!user) return null;

  const earnedIds = new Set(medals.map((m) => m.medal_id));
  const locked = ALL_MEDALS.filter((m) => !earnedIds.has(m.medal_id));

  const setFeaturedMedal = async (m: UserMedal) => {
    const ok = await setFeaturedMedalHook({ medal_id: m.medal_id, medal_name: m.medal_name, medal_tier: m.medal_tier });
    if (ok) {
      setSelected(null);
      toast.success(tt("featuredMedal.toastSet"));
    }
  };

  const removeFeatured = async () => {
    const ok = await removeFeaturedMedal();
    if (ok) {
      setSelected(null);
      toast(tt("featuredMedal.toastRemoved"));
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <div className="max-w-3xl mx-auto px-4 pt-4 pb-24">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: "hsl(var(--surface))" }}>
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-xl font-display font-bold text-foreground">{tt("medals.galleryTitle")}</h1>
            <p className="text-xs text-muted-foreground">({medals.length} medal)</p>
          </div>
        </div>

        <div className="flex gap-2 mb-5">
          {(["earned", "locked"] as const).map((tk) => (
            <button
              key={tk}
              onClick={() => setTab(tk)}
              className="flex-1 py-2 rounded-lg font-bold text-sm"
              style={{
                background: tab === tk ? "linear-gradient(90deg,#ff6b00,#ff3d7f)" : "hsl(var(--surface))",
                color: tab === tk ? "#fff" : "hsl(var(--muted-foreground))",
                border: tab === tk ? "none" : "1px solid hsl(var(--border) / 0.12)",
              }}
            >
              {tk === "earned" ? `${tt("medals.tabEarned")} (${medals.length})` : `${tt("medals.tabLocked")} (${locked.length})`}
            </button>
          ))}
        </div>

        {tab === "earned" ? (
          medals.length === 0 ? (
            <div className="text-center py-16">
              <Award size={48} color="#333" className="mx-auto mb-3" />
              <p className="text-muted-foreground">{tt("medals.empty")}</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {medals.map((m) => {
                const color = TIER_COLOR[m.medal_tier] || "#ff6b00";
                const isFeatured = featured?.medal_id === m.medal_id;
                const loc = localizeMedal(m);
                return (
                  <button
                    key={m.id}
                    onClick={() => setSelected(m)}
                    style={{
                      height: 140, borderRadius: 14, padding: 12,
                      background: tierGradient(m.medal_tier),
                      border: `1px solid ${color}`,
                      display: "flex", flexDirection: "column", alignItems: "center",
                      justifyContent: "center", gap: 6, position: "relative",
                    }}
                  >
                    {isFeatured && (
                      <span className="absolute top-1.5 right-1.5" style={{ background: "#10b981", color: "#000", fontSize: 8, fontWeight: 800, padding: "1px 6px", borderRadius: 999 }}>
                        {tt("medals.featured")}
                      </span>
                    )}
                    <Award size={36} color={color} style={{ filter: `drop-shadow(0 0 10px ${color})` }} />
                    <p style={{ fontSize: 13, fontWeight: 700, color: "#fff", textAlign: "center", lineHeight: 1.15 }}>{loc.name}</p>
                    <span style={{ background: color, color: "#000", fontSize: 8, fontWeight: 800, padding: "2px 6px", borderRadius: 999, textTransform: "uppercase", letterSpacing: "0.1em" }}>{loc.tier}</span>
                    <p style={{ fontSize: 10, color: "#888" }}>
                      {new Date(m.earned_at).toLocaleDateString(locale, { day: "2-digit", month: "short", year: "numeric" })}
                    </p>
                  </button>
                );
              })}
            </div>
          )
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {locked.map((m) => {
              const loc = localizeMedal(m);
              const prog = lockedProgress[m.medal_id];
              const total = prog?.total ?? m.progressHint?.total ?? 1;
              const current = prog?.current ?? 0;
              const pct = Math.max(0, Math.min(100, (current / total) * 100));
              const labelText = prog?.label ?? m.progressHint?.label ?? "Terkunci";
              return (
              <div key={m.medal_id} style={{
                height: 140, borderRadius: 14, padding: 12,
                background: "#1a1a1a",
                border: "1px solid rgba(255,255,255,0.06)",
                display: "flex", flexDirection: "column", alignItems: "center",
                justifyContent: "center", gap: 6, position: "relative",
              }}>
                <div className="relative">
                  <Award size={36} color="#333" />
                  <Lock size={16} color="#555" style={{ position: "absolute", bottom: -2, right: -6 }} />
                </div>
                <p style={{ fontSize: 13, fontWeight: 500, color: "#666", textAlign: "center", lineHeight: 1.15 }}>{loc.name}</p>
                <p style={{ fontSize: 10, color: "#888" }}>{labelText}</p>
                <div style={{ width: "80%", height: 4, background: "#2a2a2a", borderRadius: 999, overflow: "hidden" }}>
                  <div style={{ width: `${pct}%`, height: "100%", background: "linear-gradient(90deg, #FF6A00, #FFB300)", borderRadius: 999, transition: "width 0.3s ease" }} />
                </div>
              </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Detail sheet */}
      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent side="bottom" className="rounded-t-3xl">
          {selected && (() => {
            const color = TIER_COLOR[selected.medal_tier] || "#ff6b00";
            const isFeatured = featured?.medal_id === selected.medal_id;
            const loc = localizeMedal(selected);
            return (
              <div className="text-center pb-4">
                <Award size={64} color={color} style={{ filter: `drop-shadow(0 0 20px ${color})`, margin: "0 auto" }} />
                <h2 className="text-xl font-extrabold text-foreground mt-3">{loc.name}</h2>
                <span style={{ background: color, color: "#000", fontSize: 10, fontWeight: 800, padding: "2px 8px", borderRadius: 999, textTransform: "uppercase", letterSpacing: "0.1em", display: "inline-block", marginTop: 6 }}>{loc.tier}</span>
                <p className="text-sm text-muted-foreground mt-3">{loc.description}</p>
                <p className="text-xs text-muted-foreground mt-2">
                  {tt("medals.dateEarned", { date: new Date(selected.earned_at).toLocaleDateString(locale, { day: "2-digit", month: "short", year: "numeric" }) })}
                </p>

                <div className="grid grid-cols-2 gap-2 mt-5">
                  <button
                    onClick={() => {
                      const dateStr = new Date(selected.earned_at).toLocaleDateString(locale, { day: "2-digit", month: "short", year: "numeric" });
                      const earnedTpl = ((t as any)["medals.dateEarned"] || "Earned: {{date}}").replace("{{date}}", dateStr);
                      downloadMedalPng({
                        ...selected,
                        medal_description: selected.medal_description || "",
                        user_name: displayName,
                        i18n: {
                          name: loc.name,
                          description: loc.description,
                          tier: loc.tier,
                          header: (t as any)["medal.png.header"],
                          tagline: (t as any)["medal.png.tagline"],
                          earnedLabel: earnedTpl,
                          locale,
                        },
                      });
                    }}
                    className="font-bold text-white inline-flex items-center justify-center gap-2"
                    style={{ background: "linear-gradient(90deg,#ff6b00,#ff3d7f)", borderRadius: 10, padding: 10 }}
                  >
                    <Download size={14} /> {tt("medal.downloadShare")}
                  </button>
                  {isFeatured ? (
                    <button
                      onClick={removeFeatured}
                      className="font-bold inline-flex items-center justify-center gap-2"
                      style={{ background: "transparent", border: "1px solid #f87171", color: "#f87171", borderRadius: 10, padding: 10 }}
                    >
                      <PinOff size={14} /> {tt("medals.removeFeatured")}
                    </button>
                  ) : (
                    <button
                      onClick={() => setFeaturedMedal(selected)}
                      className="font-bold inline-flex items-center justify-center gap-2"
                      style={{ background: "transparent", border: "1px solid #ff6b00", color: "#ff6b00", borderRadius: 10, padding: 10 }}
                    >
                      <Pin size={14} /> {tt("medals.setFeatured")}
                    </button>
                  )}
                </div>
              </div>
            );
          })()}
        </SheetContent>
      </Sheet>
    </div>
  );
}
