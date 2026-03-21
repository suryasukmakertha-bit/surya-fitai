import { useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Dumbbell, Brain, Utensils, ChevronRight, ChevronDown } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import AppHeader from "@/components/AppHeader";
import PricingCard from "@/components/pricing/PricingCard";
import { PRICING_TEXT, type PricingLang } from "@/components/pricing/pricingContent";

import heroBg from "@/assets/hero-bg.jpg";
import logo from "@/assets/logo.png";

export default function Index() {
  const navigate = useNavigate();
  const { user } = useAuth();
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

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />


      {/* Hero */}
      <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
        <img src={heroBg} alt="" className="absolute inset-0 w-full h-full object-cover opacity-40" />
        <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/40 to-background" />
        <div className="relative z-10 max-w-3xl mx-auto px-4 text-center">
          <img src={logo} alt="Surya-FitAi" className="h-16 md:h-20 mx-auto mb-6 object-contain" />
          <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-1.5 mb-6">
            <Brain className="w-4 h-4 text-primary" />
            <span className="text-xs text-primary font-medium tracking-wide uppercase">{t.aiPowered}</span>
          </div>
          <div className="flex items-center justify-center gap-2 flex-wrap mt-2 mb-4">
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold"
              style={{ backgroundColor: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.25)', color: '#22c55e' }}>
              {(t as any).coachCertified}
            </span>
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold"
              style={{ backgroundColor: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.25)', color: '#22c55e' }}>
              {(t as any).coachExperience}
            </span>
          </div>
          <h1 className="text-5xl md:text-7xl font-display font-black text-foreground leading-tight mb-6">
            {t.heroTitle1} <br />
            <span className="text-gradient">{t.heroTitle2}</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-2">
            {t.heroDesc}
          </p>
          <p className="text-muted-foreground text-sm mb-8 text-center">
            {(t as any).coachSubtitle}
          </p>
          <Button size="lg" onClick={handleStartProgram} className="h-14 px-8 text-lg font-bold animate-pulse-neon">
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
