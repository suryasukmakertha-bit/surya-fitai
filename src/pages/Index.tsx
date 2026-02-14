import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Dumbbell, Brain, Utensils, ChevronRight, BarChart3, LogIn, LogOut, User, FolderOpen } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import heroBg from "@/assets/hero-bg.jpg";

export default function Index() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      {/* Top nav */}
      <nav className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between max-w-5xl mx-auto px-4 py-4">
        <span className="font-display font-bold text-foreground text-lg">FitAI</span>
        <div className="flex items-center gap-3">
          {user ? (
            <>
              <button onClick={() => navigate("/saved-plans")} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors">
                <FolderOpen className="w-4 h-4" /> My Plans
              </button>
              <button onClick={() => navigate("/progress")} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors">
                <BarChart3 className="w-4 h-4" /> Progress
              </button>
              <button onClick={() => signOut()} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors">
                <LogOut className="w-4 h-4" /> Sign Out
              </button>
            </>
          ) : (
            <button onClick={() => navigate("/auth")} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors">
              <LogIn className="w-4 h-4" /> Sign In
            </button>
          )}
        </div>
      </nav>

      {/* Hero */}
      <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
        <img src={heroBg} alt="" className="absolute inset-0 w-full h-full object-cover opacity-40" />
        <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/40 to-background" />
        <div className="relative z-10 max-w-3xl mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-1.5 mb-6">
            <Brain className="w-4 h-4 text-primary" />
            <span className="text-xs text-primary font-medium tracking-wide uppercase">AI-Powered Training</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-display font-black text-foreground leading-tight mb-6">
            Your Personal <br />
            <span className="text-gradient">AI Trainer</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-8">
            Get a fully personalized workout plan, nutrition guide, and grocery list — generated in seconds by AI, tailored to your body and goals.
          </p>
          <Button size="lg" onClick={() => navigate("/programs")} className="h-14 px-8 text-lg font-bold animate-pulse-neon">
            Start My Program <ChevronRight className="w-5 h-5 ml-1" />
          </Button>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-display font-bold text-center text-foreground mb-12">
            How It <span className="text-gradient">Works</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { icon: Dumbbell, title: "Choose Your Program", desc: "Pick from Beginner, Bulking, Cutting, or Senior fitness programs tailored to your needs." },
              { icon: Brain, title: "AI Analyzes You", desc: "Our AI engine processes your body data, goals, and limitations to create the perfect plan." },
              { icon: Utensils, title: "Get Your Plan", desc: "Receive a complete workout schedule, meal plan, grocery list, and progress targets." },
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
          <h2 className="text-3xl font-display font-bold text-foreground mb-4">Ready to Transform?</h2>
          <p className="text-muted-foreground mb-6">Join thousands who already use AI to reach their fitness goals faster.</p>
          <Button size="lg" onClick={() => navigate("/programs")} className="h-12 px-8 font-bold">
            Get Started Free <ChevronRight className="w-5 h-5 ml-1" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 px-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between text-sm text-muted-foreground">
          <span className="font-display font-bold text-foreground">FitAI</span>
          <span>© 2026 All rights reserved</span>
        </div>
      </footer>
    </div>
  );
}
