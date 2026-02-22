import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Dumbbell, Brain, Utensils, ChevronRight } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import AppHeader from "@/components/AppHeader";
import heroBg from "@/assets/hero-bg.jpg";
import logo from "@/assets/logo.png";

export default function Index() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLanguage();

  const handleStartProgram = () => {
    if (user) {
      navigate("/programs");
    } else {
      navigate("/auth", { state: { redirectTo: "/programs" } });
    }
  };
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
          <h1 className="text-5xl md:text-7xl font-display font-black text-foreground leading-tight mb-6">
            {t.heroTitle1} <br />
            <span className="text-gradient">{t.heroTitle2}</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-8">
            {t.heroDesc}
          </p>
          <Button size="lg" onClick={handleStartProgram} className="h-14 px-8 text-lg font-bold animate-pulse-neon">
            {t.startProgram} <ChevronRight className="w-5 h-5 ml-1" />
          </Button>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4">
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

      {/* CTA */}
      <section className="py-16 px-4">
        <div className="max-w-3xl mx-auto text-center neon-border rounded-2xl p-12">
          <h2 className="text-3xl font-display font-bold text-foreground mb-4">{t.readyTransform}</h2>
          <p className="text-muted-foreground mb-6">{t.ctaDesc}</p>
          <Button size="lg" onClick={handleStartProgram} className="h-12 px-8 font-bold">
            {t.getStarted} <ChevronRight className="w-5 h-5 ml-1" />
          </Button>
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
