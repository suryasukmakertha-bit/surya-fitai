import { useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Dumbbell, Brain, Utensils, ChevronRight, ChevronDown, ShieldCheck, FolderOpen, Sparkles, ArrowRight, Flame, Trophy, CalendarDays, Crown, CheckCircle2, ChevronsUpDown, Check, Calendar, TrendingUp, Zap, BarChart2 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import AppHeader from "@/components/AppHeader";
import PricingCard from "@/components/pricing/PricingCard";
import { PRICING_TEXT, type PricingLang } from "@/components/pricing/pricingContent";
import { useGenerateLimit } from "@/hooks/useGenerateLimit";
import GenerateLimitIndicator from "@/components/brand/GenerateLimitIndicator";
import TierBadge, { type Tier } from "@/components/brand/TierBadge";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

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
  const navigate = useNavigate();

  const activePlanStorageKey = user ? `surya:activePlanId:${user.id}` : "";

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      try {
        const [{ data: planData, count }, { data: profile }, { data: completions }] = await Promise.all([
          supabase
          .from("saved_plans")
          .select("id, plan_name, program_type, plan_month_number, plan_data, user_info, created_at, plan_started_at", { count: "exact" })
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),
          supabase.from("profiles").select("display_name, avatar_url").eq("user_id", user.id).maybeSingle(),
          supabase
            .from("workout_completions")
            .select("workout_date, day_label")
            .eq("user_id", user.id)
            .eq("completed", true)
            .order("workout_date", { ascending: false })
            .limit(500),
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

        // Compute stats
        const all = completions || [];
        const total = all.length;
        // Streak: consecutive days ending today (or yesterday if no today)
        const dateSet = new Set(all.map((r: any) => r.workout_date));
        let streak = 0;
        let cursor = new Date();
        // If no workout today, allow start from yesterday
        const fmt = (d: Date) => d.toISOString().slice(0, 10);
        if (!dateSet.has(fmt(cursor))) cursor.setDate(cursor.getDate() - 1);
        while (dateSet.has(fmt(cursor))) {
          streak += 1;
          cursor.setDate(cursor.getDate() - 1);
        }
        // Active days this week (Mon-based)
        const now = new Date();
        const dayIdx = (now.getDay() + 6) % 7; // Mon=0
        const monday = new Date(now); monday.setDate(now.getDate() - dayIdx); monday.setHours(0,0,0,0);
        const weekDates = new Set<string>();
        all.forEach((r: any) => {
          const d = new Date(r.workout_date);
          if (d >= monday) weekDates.add(r.workout_date);
        });
        setStats({ total, streak, activeDaysWeek: weekDates.size });

        // Last workout
        if (all.length > 0) {
          const lastDate = all[0].workout_date as string;
          const sameDay = all.filter((r: any) => r.workout_date === lastDate);
          setLastWorkout({
            date: lastDate,
            day_label: (sameDay[0] as any).day_label || "",
            count: sameDay.length,
          });
        }
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
    <section className="px-4 pt-6 pb-20">
      <div className="max-w-3xl mx-auto">
        {/* Greeting + tier */}
        <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">{greeting}</p>
            <h1 className="text-2xl font-display font-bold text-foreground mt-1">
              {userName}!
            </h1>
          </div>
          <TierBadge tier={tier} />
        </div>

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
                    {tx(`Minggu ${stats.activeDaysWeek > 0 ? Math.min(4, activePlan.plan_month_number || 1) : 1}/4`,
                       `Week ${stats.activeDaysWeek > 0 ? Math.min(4, activePlan.plan_month_number || 1) : 1}/4`,
                       `第${stats.activeDaysWeek > 0 ? Math.min(4, activePlan.plan_month_number || 1) : 1}/4周`)}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    {planCount} {tx("tersimpan","saved","已保存")}
                  </span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
                  <div className="h-full rounded-full" style={{ width: `${Math.min(100, (stats.activeDaysWeek / 7) * 100)}%`, background: "linear-gradient(90deg,#ff6b00,#ff3d7f)" }} />
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
            { icon: CheckCircle2, label: tx("Workout Selesai","Workouts Done","已完成训练"), value: String(stats.total) },
            { icon: Flame, label: tx("Streak","Streak","连续天数"), value: `${stats.streak}${tx(" hari"," d"," 天")}` },
            { icon: CalendarDays, label: tx("Minggu Aktif","Active Week","本周活跃"), value: `${stats.activeDaysWeek}/7` },
          ].map((s) => {
            const Icon = s.icon;
            return (
              <div
                key={s.label}
                className="rounded-card p-3 text-center"
                style={{ background: "hsl(var(--surface))", border: "1px solid hsl(var(--border) / 0.12)" }}
              >
                <Icon className="w-4 h-4 mx-auto mb-1" style={{ color: "#ff6b00" }} />
                <p className="text-[10px] text-muted-foreground">{s.label}</p>
                <p className="text-sm font-bold text-foreground mt-0.5">{s.value}</p>
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

        {/* SECTION 4 — Last workout summary */}
        {lastWorkout && activePlan && (
          <div
            className="mt-5 rounded-card p-4"
            style={{ background: "hsl(var(--surface))", border: "1px solid hsl(var(--border) / 0.12)" }}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                {tx("Ringkasan Terakhir","Last Workout","最近训练")}
              </span>
              <span className="text-[10px] text-muted-foreground">
                {new Date(lastWorkout.date).toLocaleDateString(lang === "id" ? "id-ID" : lang === "zh" ? "zh-CN" : "en-US", { weekday: "short", day: "numeric", month: "short" })}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-bold text-foreground truncate">
                  {lastWorkout.day_label || tx("Sesi Latihan","Training Session","训练课")}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {lastWorkout.count} {tx("latihan selesai","exercises done","个练习完成")}
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => onOpenPlan(activePlan.id, activePlan)}
                variant="outline"
                className="font-semibold"
                style={{ borderColor: "rgba(255,107,0,0.4)", color: "#ff6b00" }}
              >
                {tx("Lihat Detail","View Details","查看详情")}
              </Button>
            </div>
          </div>
        )}

        {/* SECTION 5 — Quick access */}
        <div className="mt-5 grid grid-cols-2 gap-3">
          <button
            onClick={onOpenPlans}
            className="rounded-card p-4 text-left transition-transform active:scale-[0.98]"
            style={{ background: "hsl(var(--surface))", border: "1px solid hsl(var(--border) / 0.12)" }}
          >
            <FolderOpen className="w-5 h-5 mb-2" style={{ color: "#ff6b00" }} />
            <p className="text-sm font-bold text-foreground">{tx("Semua Rencana","All Plans","所有计划")}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">{viewPlansCta}</p>
          </button>
          <button
            onClick={onOpenPrograms}
            className="rounded-card p-4 text-left transition-transform active:scale-[0.98]"
            style={{ background: "hsl(var(--surface))", border: "1px solid hsl(var(--border) / 0.12)" }}
          >
            <Dumbbell className="w-5 h-5 mb-2" style={{ color: "#ff6b00" }} />
            <p className="text-sm font-bold text-foreground">{tx("Pilih Program","Choose Program","选择计划")}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">{tx("Jelajahi tipe program","Browse program types","浏览程序类型")}</p>
          </button>
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
      <div className="min-h-screen bg-background">
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
    <div className="min-h-screen bg-background relative">
      <AppHeader />
      <ScrollProgressBar />


      {/* Hero */}
      <section
        className="relative min-h-[90vh] flex items-center justify-center overflow-hidden"
        style={{
          background:
            "radial-gradient(ellipse at top, rgba(255,107,0,0.10), transparent 60%), radial-gradient(ellipse at bottom right, rgba(255,61,127,0.08), transparent 60%), #0f0f11",
        }}
      >
        <div className="relative z-10 max-w-3xl mx-auto px-4 text-center">
          <img src={logo} alt="Surya-FitAi" className="h-24 md:h-28 mx-auto mb-6 object-contain" />
          <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-1.5 mb-6">
            <Brain className="w-4 h-4 text-primary" />
            <span className="text-xs text-primary font-medium tracking-wide uppercase">{t.aiPowered}</span>
          </div>
          <div className="flex items-center justify-center gap-2 flex-wrap mt-2 mb-4">
            <span className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-1.5">
              <ShieldCheck className="w-4 h-4 text-primary" />
              <span className="text-xs text-primary font-medium tracking-wide uppercase">{(t as any).coachCertified}</span>
            </span>
          </div>
          <h1 className="text-5xl md:text-7xl font-display font-black text-foreground leading-tight mb-6">
            {t.heroTitle1} <br />
            <span className="text-gradient">{t.heroTitle2}</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-2">
            {t.heroDesc}
          </p>
          <div className="mb-8" />
          <Button data-tour="start-program" size="lg" onClick={handleStartProgram} className="h-14 px-8 text-lg font-bold animate-pulse-neon">
            {t.startProgram} <ChevronRight className="w-5 h-5 ml-1" />
          </Button>

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
