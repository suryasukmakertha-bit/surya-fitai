import { useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Dumbbell, Brain, Utensils, ChevronRight, ChevronDown, ShieldCheck, FolderOpen, Sparkles, ArrowRight, Flame, Trophy, CalendarDays, Crown, CheckCircle2, ChevronsUpDown, Check, Calendar, TrendingUp, Zap, BarChart2, Bike } from "lucide-react";
import RunningIcon from "@/components/icons/RunningIcon";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import AppHeader from "@/components/AppHeader";
import MascotCompanion from "@/components/MascotCompanion";
import PricingCard from "@/components/pricing/PricingCard";
import { PRICING_TEXT, type PricingLang } from "@/components/pricing/pricingContent";
import { useGenerateLimit } from "@/hooks/useGenerateLimit";
import GenerateLimitIndicator from "@/components/brand/GenerateLimitIndicator";
import TierBadge, { type Tier } from "@/components/brand/TierBadge";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { getPlanProgress } from "@/lib/planProgress";
import { computeCurrentStreak, getRestDayIndices } from "@/lib/streak";
import { readLongestStreak } from "@/lib/longestStreak";
import DailyChallengeCard from "@/components/DailyChallengeCard";
import { useFeaturedMedal } from "@/hooks/useFeaturedMedal";
import FeaturedMedalChip from "@/components/medals/FeaturedMedalChip";
import { getWeeklyTotalKm, loadSessions } from "@/lib/activityTracking";

function ScrollProgressBar() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(docHeight > 0 ? Math.min(1, scrollTop / docHeight) : 0);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  if (progress <= 0.01) return null;

  return (
    <div className="fixed right-0 top-0 bottom-0 w-1 z-50 pointer-events-none">
      <div
        className="w-full bg-primary/80 rounded-b-full transition-all duration-150"
        style={{ height: `${progress * 100}%` }}
      />
    </div>
  );
}

interface DashboardProps {
  onGenerate: () => void;
  onOpenPlans: () => void;
  onOpenPrograms: () => void;
  onOpenPlan: (planId: string, plan: any) => void;
}

function LoggedInDashboard({ onGenerate, onOpenPlans, onOpenPrograms, onOpenPlan }: DashboardProps) {
  const { lang } = useLanguage();
  const { user } = useAuth();
  const { info: limit } = useGenerateLimit();
  const { featured } = useFeaturedMedal();
  const [activePlan, setActivePlan] = useState<any | null>(null);
  const [allPlans, setAllPlans] = useState<any[]>([]);
  const [planCount, setPlanCount] = useState<number>(0);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [displayName, setDisplayName] = useState<string>("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [stats, setStats] = useState({ total: 0, streak: 0, activeDaysWeek: 0 });
  const [planStats, setPlanStats] = useState({ completedDays: 0, totalDays: 28, currentWeek: 1, totalWeeks: 4 });
  const [lastWorkout, setLastWorkout] = useState<{ date: string; day_label: string; count: number } | null>(null);
  const [planPickerOpen, setPlanPickerOpen] = useState(false);
  const [runStats, setRunStats] = useState<{ weekly: number; last: number | null }>({ weekly: 0, last: null });
  const [rideStats, setRideStats] = useState<{ weekly: number; last: number | null }>({ weekly: 0, last: null });
  const navigate = useNavigate();

  const activePlanStorageKey = user ? `surya:activePlanId:${user.id}` : "";

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      try {
        const [{ data: planData, count }, { data: profile }] = await Promise.all([
          supabase
          .from("saved_plans")
          .select("id, plan_name, program_type, plan_month_number, plan_data, user_info, created_at, plan_started_at", { count: "exact" })
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),
          supabase.from("profiles").select("display_name, avatar_url").eq("user_id", user.id).maybeSingle(),
        ]);
        if (cancelled) return;
        const plans = planData || [];
        setAllPlans(plans);
        setPlanCount(count ?? 0);
        // Resolve active plan: stored choice if still exists, else most recent.
        const storedId = activePlanStorageKey ? localStorage.getItem(activePlanStorageKey) : null;
        const stored = storedId ? plans.find((p: any) => p.id === storedId) : null;
        setActivePlan(stored || plans[0] || null);
        setDisplayName(((profile as any)?.display_name as string) || "");
        setAvatarUrl(((profile as any)?.avatar_url as string) || null);

        setStats({ total: 0, streak: 0, activeDaysWeek: 0 });
        setLastWorkout(null);
      } finally {
        if (!cancelled) setLoadingPlans(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user]);

  const setAsActive = (planId: string) => {
    if (activePlanStorageKey) localStorage.setItem(activePlanStorageKey, planId);
    const p = allPlans.find((x) => x.id === planId);
    if (p) setActivePlan(p);
    setPlanPickerOpen(false);
  };

  // Compute plan-specific stats when active plan changes
  useEffect(() => {
    if (!user || !activePlan) {
      setPlanStats({ completedDays: 0, totalDays: 28, currentWeek: 1, totalWeeks: 4 });
      setStats({ total: 0, streak: 0, activeDaysWeek: 0 });
      setLastWorkout(null);
      return;
    }
    let cancelled = false;
    (async () => {
      let completionsQuery = supabase
        .from("workout_completions")
        .select("workout_date, day_label, completed_at")
        .eq("user_id", user.id)
        .eq("plan_id", activePlan.id)
        .eq("completed", true)
        .order("workout_date", { ascending: false })
        .limit(500);
      if (activePlan.plan_started_at) {
        completionsQuery = completionsQuery.gte("completed_at", activePlan.plan_started_at);
      }
      const [p, { data: completions }] = await Promise.all([
        getPlanProgress(user.id, activePlan),
        completionsQuery,
      ]);
      if (cancelled) return;
      const all = completions || [];
      const completedDates = Array.from(new Set(all.map((r: any) => r.workout_date)));
      const restDays = getRestDayIndices(activePlan.plan_data);
      // Streak shown in Suny bubble = historical best across ALL plans (monotonic, never decreases).
      // Suny bubble reads stored longest_streak; bump happens on workout toggle.
      const streak = await readLongestStreak(user.id);
      const now = new Date();
      const dayIdx = (now.getDay() + 6) % 7;
      const monday = new Date(now); monday.setDate(now.getDate() - dayIdx); monday.setHours(0,0,0,0);
      const weekDates = new Set<string>();
      completedDates.forEach((date) => {
        const d = new Date(`${date}T00:00:00`);
        if (d >= monday) weekDates.add(date);
      });
      setPlanStats({
        completedDays: p.completedDays,
        totalDays: p.totalDays,
        currentWeek: p.currentWeek,
        totalWeeks: p.totalWeeks,
      });
      setStats({ total: p.completedDays, streak, activeDaysWeek: weekDates.size });
      if (all.length > 0) {
        const lastDate = all[0].workout_date as string;
        const sameDay = all.filter((r: any) => r.workout_date === lastDate);
        setLastWorkout({
          date: lastDate,
          day_label: (sameDay[0] as any).day_label || "",
          count: sameDay.length,
        });
      } else {
        setLastWorkout(null);
      }
    })();
    return () => { cancelled = true; };
  }, [user, activePlan]);

  // Load activity stats for dashboard cards
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const [rw, rl, cw, cl] = await Promise.all([
        getWeeklyTotalKm(user.id, "running"),
        loadSessions(user.id, "running", 1),
        getWeeklyTotalKm(user.id, "cycling"),
        loadSessions(user.id, "cycling", 1),
      ]);
      if (cancelled) return;
      setRunStats({ weekly: rw, last: rl[0]?.distance_km ?? null });
      setRideStats({ weekly: cw, last: cl[0]?.distance_km ?? null });
    })();
    return () => { cancelled = true; };
  }, [user]);

  const tier: Tier =
    limit.status === "admin" ? "ADMIN" :
    limit.status === "active" ? "PAID" :
    limit.status === "trial" ? "TRIAL" :
    limit.isExpiredFallback ? "EXPIRED" : "FREE";

  const greeting =
    lang === "id" ? "Hai," :
    lang === "zh" ? "你好，" :
    "Hi,";
  const activeLabel =
    lang === "id" ? "Program Aktif" :
    lang === "zh" ? "活跃计划" :
    "Active Plan";
  const noPlanTitle =
    lang === "id" ? "Belum ada program tersimpan" :
    lang === "zh" ? "还没有保存的计划" :
    "No saved plans yet";
  const noPlanDesc =
    lang === "id" ? "Mulai perjalanan kebugaranmu dengan membuat program pertama bersama Coach Surya." :
    lang === "zh" ? "通过Coach Surya创建您的第一个计划开始健身之旅。" :
    "Start your fitness journey by generating your first program with Coach Surya.";
  const generateFirstCta =
    lang === "id" ? "Generate Program Pertama" :
    lang === "zh" ? "生成第一个计划" :
    "Generate First Program";
  const generateNewCta =
    lang === "id" ? "Buat Baru" :
    lang === "zh" ? "新建" :
    "Generate New";
  const viewProgramCta =
    lang === "id" ? "Lihat Program" :
    lang === "zh" ? "查看计划" :
    "View Program";
  const viewPlansCta =
    lang === "id" ? "Lihat Semua Rencana" :
    lang === "zh" ? "查看所有计划" :
    "View All Plans";
  const monthLabel = (n?: number) =>
    lang === "id" ? `Bulan ${n ?? 1}` :
    lang === "zh" ? `第${n ?? 1}个月` :
    `Month ${n ?? 1}`;
  const tx = (id: string, en: string, zh: string) =>
    lang === "id" ? id : lang === "zh" ? zh : en;

  const userName =
    displayName || user?.email?.split("@")[0] || "Athlete";
  const upgradeCta = tx("Upgrade ke Pro — Rp 19.900/bulan", "Upgrade to Pro — Rp 19,900/month", "升级到 Pro — Rp 19,900/月");
  const showUpgrade = tier === "FREE" && Number.isFinite(limit.max) && limit.used >= (limit.max as number);

  return (
    <section className="px-4 pt-4 pb-24 relative">
      <div className="max-w-3xl mx-auto relative">
        {/* AI mascot companion */}
        <MascotCompanion
          streak={stats.streak}
          hasActivePlan={!!activePlan}
        />
        {/* Greeting (avatar + name) + tier */}
        <div className="flex items-center justify-between mb-5 gap-3">
          <button
            type="button"
            onClick={() => navigate("/profile")}
            className="flex items-center gap-3 min-w-0 text-left"
            aria-label="Open profile"
          >
            <div
              className="w-9 h-9 rounded-full overflow-hidden flex items-center justify-center font-extrabold text-white shrink-0 shadow-md"
              style={{ background: avatarUrl ? "transparent" : "linear-gradient(135deg,#ff6b00,#ff3d7f)", fontSize: 14 }}
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <span>{userName.slice(0,1).toUpperCase()}</span>
              )}
            </div>
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground leading-none">{greeting}</p>
              <h1 className="text-xl font-display font-bold text-foreground mt-1 truncate">
                {userName}!
              </h1>
            </div>
          </button>
          <div className="flex items-center gap-1.5 shrink-0">
            {featured && <FeaturedMedalChip medal={featured} />}
            <TierBadge tier={tier} />
          </div>
        </div>

        {/* Radial gradient glow accent behind active plan card */}
        {activePlan && (
          <div
            aria-hidden
            className="pointer-events-none absolute"
            style={{
              top: 60,
              right: -40,
              width: 220,
              height: 220,
              background: "radial-gradient(circle, rgba(255,107,0,0.14) 0%, transparent 70%)",
              zIndex: 0,
            }}
          />
        )}
        <div className="relative" style={{ zIndex: 1 }}>

        {/* SECTION 1 — Active plan card or empty state */}
        {loadingPlans ? (
          <div
            className="rounded-card p-6 animate-pulse"
            style={{ background: "hsl(var(--surface))", border: "1px solid hsl(var(--border) / 0.12)", height: 140 }}
          />
        ) : activePlan ? (
          <div
            className="w-full rounded-card p-5"
            style={{
              background: "linear-gradient(135deg, rgba(255,107,0,0.10), rgba(255,61,127,0.05))",
              border: "1px solid rgba(255,107,0,0.25)",
            }}
          >
            <div className="flex items-center justify-between gap-3 mb-3">
              <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "#ff6b00" }}>
                {activeLabel}
              </span>
              <div className="flex items-center gap-2">
                <span
                  className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full"
                  style={{
                    background: "rgba(255,107,0,0.15)",
                    color: "#ff6b00",
                    border: "0.5px solid rgba(255,107,0,0.3)",
                  }}
                >
                  {monthLabel(activePlan.plan_month_number)}
                </span>
                {allPlans.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setPlanPickerOpen(true)}
                    className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full"
                    style={{
                      background: "rgba(255,255,255,0.06)",
                      color: "#ff6b00",
                      border: "0.5px solid rgba(255,107,0,0.3)",
                    }}
                    aria-label={tx("Ganti program aktif","Change active plan","切换计划")}
                  >
                    {tx("Ganti","Change","切换")}
                    <ChevronsUpDown className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={() => onOpenPlan(activePlan.id, activePlan)}
              className="w-full text-left transition-transform hover:scale-[1.005] active:scale-[0.995]"
            >
              <h2 className="text-lg font-display font-bold text-foreground mb-1">
                {activePlan.plan_name || activePlan.program_type}
              </h2>
              <p className="text-xs text-muted-foreground mb-3">{activePlan.program_type}</p>
              {/* Mini progress bar */}
              <div className="mb-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] text-muted-foreground">
                    {tx(`Minggu ${planStats.currentWeek}/${planStats.totalWeeks}`,
                       `Week ${planStats.currentWeek}/${planStats.totalWeeks}`,
                       `第${planStats.currentWeek}/${planStats.totalWeeks}周`)}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    {planCount} {tx("tersimpan","saved","已保存")}
                  </span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
                  <div className="h-full rounded-full" style={{ width: `${planStats.totalDays > 0 ? Math.min(100, Math.round((planStats.completedDays / planStats.totalDays) * 100)) : 0}%`, background: "linear-gradient(90deg,#ff6b00,#ff3d7f)" }} />
                </div>
              </div>
            </button>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => onOpenPlan(activePlan.id, activePlan)}
                size="sm"
                className="flex-1 font-bold text-primary-foreground"
                style={{ background: "linear-gradient(90deg, #ff6b00, #ff3d7f)" }}
              >
                {viewProgramCta}
              </Button>
              <Button
                onClick={onGenerate}
                size="sm"
                variant="outline"
                className="flex-1 font-semibold"
                style={{ borderColor: "rgba(255,107,0,0.4)", color: "#ff6b00" }}
              >
                {generateNewCta}
              </Button>
            </div>
          </div>
        ) : (
          <div
            className="rounded-card p-6 text-center"
            style={{
              background: "hsl(var(--surface))",
              border: "1px dashed hsl(var(--border) / 0.3)",
            }}
          >
            <div
              className="w-14 h-14 rounded-xl mx-auto mb-3 flex items-center justify-center"
              style={{ background: "rgba(255,107,0,0.15)" }}
            >
              <Sparkles className="w-7 h-7" style={{ color: "#ff6b00" }} />
            </div>
            <h2 className="text-lg font-display font-bold text-foreground mb-1">{noPlanTitle}</h2>
            <p className="text-sm text-muted-foreground mb-5">{noPlanDesc}</p>
            <Button
              onClick={onGenerate}
              className="h-12 px-6 font-bold text-primary-foreground"
              style={{ background: "linear-gradient(90deg, #ff6b00, #ff3d7f)" }}
            >
              {generateFirstCta} <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        )}

        {/* SECTION 2 — Stats Row */}
        <div className="mt-5 grid grid-cols-3 gap-3">
          {[
            { icon: CheckCircle2, label: tx("Latihan Selesai","Workouts Done","已完成训练"), value: String(planStats.completedDays) },
            { icon: TrendingUp,   label: tx("Progress","Progress","进度"), value: `${planStats.totalDays > 0 ? Math.round((planStats.completedDays / planStats.totalDays) * 100) : 0}%` },
            { icon: Calendar,     label: tx("Minggu","Week","周"), value: `${planStats.currentWeek}/${planStats.totalWeeks}` },
          ].map((s) => {
            const Icon = s.icon;
            return (
              <div
                key={s.label}
                className="rounded-card p-3 text-center surface-depth"
                style={{ background: "hsl(var(--surface))", border: "1px solid hsl(var(--border) / 0.12)" }}
              >
                <Icon className="w-4 h-4 mx-auto mb-1" style={{ color: "#ff6b00" }} />
                <p className="text-[10px] text-muted-foreground">{s.label}</p>
                <p className="text-base font-extrabold mt-0.5" style={{ color: "#ff6b00" }}>{s.value}</p>
              </div>
            );
          })}
        </div>

        {/* SECTION 3 — Generate limit */}
        <div
          className="mt-5 rounded-card p-4"
          style={{ background: "hsl(var(--surface))", border: "1px solid hsl(var(--border) / 0.12)" }}
        >
          <GenerateLimitIndicator used={limit.used} max={limit.max} />
          {showUpgrade && (
            <button
              onClick={onGenerate /* opens flow that triggers upgrade gating */}
              className="mt-3 w-full rounded-btn px-4 py-2.5 flex items-center justify-center gap-2 font-bold text-primary-foreground text-sm"
              style={{ background: "linear-gradient(90deg,#ff6b00,#ff3d7f)" }}
            >
              <Crown className="w-4 h-4" />
              {upgradeCta}
            </button>
          )}
        </div>

        {/* SECTION 4 — Daily Challenge */}
        <DailyChallengeCard />

        {/* SECTION 5 — Quick access */}
        <div className="mt-5 grid grid-cols-2 gap-3">
          {([
            { kind: "running" as const, icon: RunningIcon,
              title: tx("Lari","Running","跑步"),
              last: runStats.last, weekly: runStats.weekly,
              lastTpl: tx("Lari terakhir: {{distance}} km","Last run: {{distance}} km","上次跑步: {{distance}} 公里"),
              empty: tx("Mulai berlari pertamamu","Start your first run","开始你的第一次跑步"),
              weeklyTpl: tx("Minggu ini: {{km}} km","This week: {{km}} km","本周: {{km}} 公里"),
              cta: tx("Mulai Lari","Start Run","开始跑步"),
              path: "/running" },
            { kind: "cycling" as const, icon: Bike,
              title: tx("Sepeda","Cycling","骑行"),
              last: rideStats.last, weekly: rideStats.weekly,
              lastTpl: tx("Ride terakhir: {{distance}} km","Last ride: {{distance}} km","上次骑行: {{distance}} 公里"),
              empty: tx("Mulai bersepeda pertamamu","Start your first ride","开始你的第一次骑行"),
              weeklyTpl: tx("Minggu ini: {{km}} km","This week: {{km}} km","本周: {{km}} 公里"),
              cta: tx("Mulai Ride","Start Ride","开始骑行"),
              path: "/cycling" },
          ]).map((c) => {
            const I = c.icon;
            const lastText = c.last != null
              ? c.lastTpl.replace("{{distance}}", c.last.toFixed(2))
              : c.empty;
            return (
              <button
                key={c.kind}
                onClick={() => navigate(c.path)}
                className="rounded-card p-4 text-left transition-transform active:scale-[0.98]"
                style={{ background: "hsl(var(--surface))", border: "1px solid hsl(var(--border) / 0.12)" }}
              >
                <I size={24} color="#ff6b00" style={{ marginBottom: 8 }} />
                <p className="text-sm font-bold text-foreground">{c.title}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{lastText}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{c.weeklyTpl.replace("{{km}}", c.weekly.toFixed(1))}</p>
                <p className="text-[11px] font-bold mt-2" style={{ color: "#ff6b00" }}>{c.cta} →</p>
              </button>
            );
          })}
        </div>
        </div>
      </div>

      {/* Active plan picker bottom sheet */}
      <Sheet open={planPickerOpen} onOpenChange={setPlanPickerOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl border-t border-border/40 bg-background max-h-[80vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-left text-foreground">
              {tx("Pilih Program Aktif","Choose Active Plan","选择活跃计划")}
            </SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-2 pb-4">
            {allPlans.map((p) => {
              const isActive = activePlan?.id === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => setAsActive(p.id)}
                  className="w-full rounded-card p-4 text-left transition-transform active:scale-[0.99]"
                  style={{
                    background: isActive ? "rgba(255,107,0,0.10)" : "hsl(var(--surface))",
                    border: isActive ? "1px solid rgba(255,107,0,0.4)" : "1px solid hsl(var(--border) / 0.12)",
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-foreground truncate">
                        {p.plan_name || p.program_type}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                        {p.program_type} · {monthLabel(p.plan_month_number)}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {new Date(p.created_at).toLocaleDateString(lang === "id" ? "id-ID" : lang === "zh" ? "zh-CN" : "en-US", { day: "numeric", month: "short", year: "numeric" })}
                      </p>
                    </div>
                    {isActive && (
                      <span
                        className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0"
                        style={{ background: "rgba(255,107,0,0.18)", color: "#ff6b00" }}
                      >
                        <Check className="w-3 h-3" />
                        {tx("Aktif","Active","活跃")}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </SheetContent>
      </Sheet>
    </section>
  );
}

export default function Index() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { t, lang } = useLanguage();
  const featuresRef = useRef<HTMLElement>(null);
  const [showArrow, setShowArrow] = useState(true);

  const handleStartProgram = () => {
    if (user) {
      navigate("/programs");
    } else {
      navigate("/auth", { state: { redirectTo: "/programs" } });
    }
  };

  const scrollToFeatures = () => {
    featuresRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Auto-hide arrow on scroll > 120px or features visible
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 120) {
        setShowArrow(false);
        return;
      }
      if (featuresRef.current) {
        const rect = featuresRef.current.getBoundingClientRect();
        if (rect.top < window.innerHeight) {
          setShowArrow(false);
          return;
        }
      }
      setShowArrow(true);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Logged-in users see their dashboard, not the marketing landing.
  if (!authLoading && user) {
    return (
      <div className="min-h-screen page-bg noise-overlay">
        <AppHeader />
        <LoggedInDashboard
          onGenerate={() => navigate("/programs")}
          onOpenPlans={() => navigate("/saved-plans")}
          onOpenPrograms={() => navigate("/programs")}
          onOpenPlan={(planId, plan) => {
            navigate("/results", {
              state: {
                plan: plan.plan_data,
                userInfo: plan.user_info,
                programType: plan.program_type,
                planId,
              },
            });
          }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen landing-bg relative noise-overlay">
      <AppHeader />
      <ScrollProgressBar />


      {/* SUNY mascot greeting (landing) */}
      <div className="relative z-10 px-4 pt-3 flex justify-center">
        <div className="w-full max-w-3xl">
          <MascotCompanion
            mood="excited"
            message={
              lang === "id"
                ? "Siap ubah hidupmu? 🚀"
                : lang === "zh"
                ? "准备好改变了吗？🚀"
                : "Ready to transform? 🚀"
            }
          />
        </div>
      </div>

      {/* Hero */}
      <section
        className="relative flex items-start justify-center overflow-hidden"
      >
        {/* Floating decorative orbs (CSS only) */}
        <div className="landing-orb-1" aria-hidden />
        <div className="landing-orb-2" aria-hidden />

        <div className="relative z-10 max-w-3xl mx-auto px-4 text-center pt-2">
          {/* Floating badge row (lucide only) */}
          <div className="flex items-center justify-center gap-2 flex-wrap mb-6">
            <span
              className="inline-flex items-center gap-2 rounded-full px-3.5 py-1.5"
              style={{
                background: "rgba(255,107,0,0.10)",
                border: "1px solid rgba(255,107,0,0.30)",
              }}
            >
              <Brain className="w-3.5 h-3.5" style={{ color: "#ff6b00" }} />
              <span className="text-[11px] font-bold tracking-wider uppercase" style={{ color: "#ff6b00" }}>
                {t.aiPowered}
              </span>
            </span>
            <span
              className="inline-flex items-center gap-2 rounded-full px-3.5 py-1.5"
              style={{
                background: "rgba(255,107,0,0.10)",
                border: "1px solid rgba(255,107,0,0.30)",
              }}
            >
              <ShieldCheck className="w-3.5 h-3.5" style={{ color: "#ff6b00" }} />
              <span className="text-[11px] font-bold tracking-wider uppercase" style={{ color: "#ff6b00" }}>
                {lang === "id" ? "Certified Coach" : lang === "zh" ? "认证教练" : "Certified Coach"}
              </span>
            </span>
          </div>

          {/* Headline */}
          <h1
            className="font-display font-extrabold text-foreground leading-[1.05] mb-4"
            style={{ fontSize: "clamp(32px, 9vw, 56px)" }}
          >
            {t.heroTitle1}
            <br />
            <span
              className="bg-clip-text text-transparent"
              style={{
                backgroundImage: "linear-gradient(90deg, #ff6b00, #ff3d7f)",
                fontSize: "clamp(36px, 10vw, 64px)",
                fontWeight: 800,
              }}
            >
              {t.heroTitle2}
            </span>
          </h1>

          <p
            className="max-w-md mx-auto mb-8 text-muted-foreground"
            style={{ fontSize: 14, lineHeight: 1.5 }}
          >
            {t.heroDesc}
          </p>

          <Button
            data-tour="start-program"
            onClick={handleStartProgram}
            className="animate-cta-pulse text-white"
            style={{
              background: "linear-gradient(90deg, #ff6b00, #ff3d7f)",
              boxShadow: "0 4px 24px rgba(255,107,0,0.45)",
              borderRadius: 14,
              padding: "16px 32px",
              fontWeight: 700,
              fontSize: 16,
              height: "auto",
            }}
          >
            {t.startProgram} <ChevronRight className="w-5 h-5 ml-1" />
          </Button>

          {/* Social proof strip — lucide only, no emoji */}
          <div
            className="mt-8 mx-auto flex items-center justify-center gap-3 flex-wrap"
            style={{ maxWidth: 360 }}
          >
            {[
              { icon: Zap, label: lang === "id" ? "AI Coach 24/7" : lang === "zh" ? "AI教练 24/7" : "AI Coach 24/7" },
              { icon: BarChart2, label: lang === "id" ? "Personal Plan" : lang === "zh" ? "个性化计划" : "Personal Plan" },
              { icon: TrendingUp, label: lang === "id" ? "Hasil Lebih Cepat" : lang === "zh" ? "更快效果" : "Faster Results" },
            ].map((it, i, arr) => {
              const I = it.icon;
              return (
                <div key={it.label} className="flex items-center gap-3">
                  <span className="inline-flex items-center gap-1.5">
                    <I style={{ width: 12, height: 12, color: "#ff6b00" }} />
                    <span className="text-muted-foreground" style={{ fontSize: 11 }}>{it.label}</span>
                  </span>
                  {i < arr.length - 1 && (
                    <span className="bg-border/30" style={{ width: 1, height: 12 }} />
                  )}
                </div>
              );
            })}
          </div>

          {/* Scroll indicator */}
          <div
            onClick={scrollToFeatures}
            className={`mt-10 flex flex-col items-center gap-2 cursor-pointer transition-opacity duration-500 ${showArrow ? "opacity-100" : "opacity-0 pointer-events-none"}`}
          >
            <ChevronDown className="w-6 h-6 text-muted-foreground animate-[scrollBounce_1.2s_ease-in-out_infinite]" />
            <span className="text-xs text-muted-foreground/70">
              {lang === "id" ? "Gulir untuk lihat fitur & harga" : lang === "zh" ? "向下滚动查看功能与价格" : "Scroll to explore features & pricing"}
            </span>
          </div>
        </div>
      </section>

      {/* Features */}
      <section ref={featuresRef} className="py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-display font-bold text-center text-foreground mb-12">
            {t.howItWorks} <span className="text-gradient">{t.works}</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { icon: Dumbbell, title: t.feature1Title, desc: t.feature1Desc },
              { icon: Brain, title: t.feature2Title, desc: t.feature2Desc },
              { icon: Utensils, title: t.feature3Title, desc: t.feature3Desc },
            ].map((f, i) => (
              <div key={i} className="card-gradient rounded-lg p-6 border border-border/50 text-center group hover:neon-border transition-all duration-300">
                <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4 group-hover:bg-primary/20 transition-colors">
                  <f.icon className="w-7 h-7 text-primary" />
                </div>
                <h3 className="text-lg font-display font-bold text-foreground mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-display font-bold text-foreground mb-2">
              {(PRICING_TEXT[lang as PricingLang] ?? PRICING_TEXT.en).sectionTitle}
            </h2>
            <p className="text-muted-foreground text-base">
              {(PRICING_TEXT[lang as PricingLang] ?? PRICING_TEXT.en).sectionSubtitle}
            </p>
          </div>
          <PricingCard variant="landing" onCtaClick={handleStartProgram} />
        </div>
      </section>


      {/* Footer */}
      <footer className="border-t border-border py-8 px-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between text-sm text-muted-foreground">
          <span className="font-display font-bold text-foreground">Surya-FitAi</span>
          <span>{t.rights}</span>
        </div>
      </footer>
    </div>
  );
}
