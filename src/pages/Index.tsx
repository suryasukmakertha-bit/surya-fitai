import { useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Dumbbell, Brain, Utensils, ChevronRight, ChevronDown, ShieldCheck, FolderOpen, Sparkles, ArrowRight } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import AppHeader from "@/components/AppHeader";
import PricingCard from "@/components/pricing/PricingCard";
import { PRICING_TEXT, type PricingLang } from "@/components/pricing/pricingContent";
import { useGenerateLimit } from "@/hooks/useGenerateLimit";
import GenerateLimitIndicator from "@/components/brand/GenerateLimitIndicator";
import TierBadge, { type Tier } from "@/components/brand/TierBadge";
import { supabase } from "@/integrations/supabase/client";

import logo from "@/assets/logo.png";

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

function LoggedInDashboard({ onGenerate, onOpenPlans }: { onGenerate: () => void; onOpenPlans: () => void }) {
  const { lang } = useLanguage();
  const { user } = useAuth();
  const { info: limit } = useGenerateLimit();
  const [latestPlan, setLatestPlan] = useState<{ id: string; plan_name: string | null; program_type: string; plan_month_number?: number } | null>(null);
  const [planCount, setPlanCount] = useState<number>(0);
  const [loadingPlans, setLoadingPlans] = useState(true);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      try {
        const { data, count } = await supabase
          .from("saved_plans")
          .select("id, plan_name, program_type, plan_month_number", { count: "exact" })
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1);
        if (cancelled) return;
        setLatestPlan((data && data[0]) || null);
        setPlanCount(count ?? 0);
      } finally {
        if (!cancelled) setLoadingPlans(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user]);

  const tier: Tier =
    limit.status === "admin" ? "ADMIN" :
    limit.status === "active" ? "PAID" :
    limit.status === "trial" ? "TRIAL" :
    limit.isExpiredFallback ? "EXPIRED" : "FREE";

  const greeting =
    lang === "id" ? "Selamat datang kembali" :
    lang === "zh" ? "欢迎回来" :
    "Welcome back";
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
    lang === "id" ? "Buat Program Baru" :
    lang === "zh" ? "创建新计划" :
    "Generate New Program";
  const viewPlansCta =
    lang === "id" ? "Lihat Semua Rencana" :
    lang === "zh" ? "查看所有计划" :
    "View All Plans";
  const monthLabel = (n?: number) =>
    lang === "id" ? `Bulan ${n ?? 1}` :
    lang === "zh" ? `第${n ?? 1}个月` :
    `Month ${n ?? 1}`;

  return (
    <section className="px-4 pt-8 pb-16">
      <div className="max-w-3xl mx-auto">
        {/* Greeting + tier */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">{greeting}</p>
            <h1 className="text-2xl font-display font-bold text-foreground mt-1">
              {user?.email?.split("@")[0] ?? "Athlete"}
            </h1>
          </div>
          <TierBadge tier={tier} />
        </div>

        {/* Active plan card or empty state */}
        {loadingPlans ? (
          <div
            className="rounded-card p-6 animate-pulse"
            style={{ background: "hsl(var(--surface))", border: "1px solid hsl(var(--border) / 0.12)", height: 140 }}
          />
        ) : latestPlan ? (
          <button
            onClick={onOpenPlans}
            className="w-full text-left rounded-card p-5 transition-transform hover:scale-[1.01] active:scale-[0.99]"
            style={{
              background: "linear-gradient(135deg, rgba(255,107,0,0.10), rgba(255,61,127,0.05))",
              border: "1px solid rgba(255,107,0,0.25)",
            }}
          >
            <div className="flex items-center justify-between gap-3 mb-3">
              <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "#ff6b00" }}>
                {activeLabel}
              </span>
              <span
                className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{
                  background: "rgba(255,107,0,0.15)",
                  color: "#ff6b00",
                  border: "0.5px solid rgba(255,107,0,0.3)",
                }}
              >
                {monthLabel(latestPlan.plan_month_number)}
              </span>
            </div>
            <h2 className="text-lg font-display font-bold text-foreground mb-1">
              {latestPlan.plan_name || latestPlan.program_type}
            </h2>
            <p className="text-xs text-muted-foreground mb-4">{latestPlan.program_type}</p>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {planCount} {lang === "id" ? "program tersimpan" : lang === "zh" ? "个保存的计划" : "saved"}
              </span>
              <ArrowRight className="w-4 h-4" style={{ color: "#ff6b00" }} />
            </div>
          </button>
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

        {/* Generate limit + actions */}
        <div
          className="mt-5 rounded-card p-4 flex items-center justify-between gap-3 flex-wrap"
          style={{ background: "hsl(var(--surface))", border: "1px solid hsl(var(--border) / 0.12)" }}
        >
          <GenerateLimitIndicator used={limit.used} max={limit.max} />
          {latestPlan && (
            <Button
              onClick={onGenerate}
              size="sm"
              className="font-bold text-primary-foreground"
              style={{ background: "linear-gradient(90deg, #ff6b00, #ff3d7f)" }}
            >
              {generateNewCta}
            </Button>
          )}
        </div>

        {latestPlan && (
          <button
            onClick={onOpenPlans}
            className="mt-3 w-full rounded-card p-4 flex items-center justify-between transition-colors"
            style={{ background: "hsl(var(--surface))", border: "1px solid hsl(var(--border) / 0.12)" }}
          >
            <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <FolderOpen className="w-4 h-4" style={{ color: "#ff6b00" }} />
              {viewPlansCta}
            </span>
            <ArrowRight className="w-4 h-4 text-muted-foreground" />
          </button>
        )}
      </div>
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
