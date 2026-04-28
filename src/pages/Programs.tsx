import { useEffect } from "react";
import ProgramCard from "@/components/ProgramCard";
import { useNavigate, Navigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, ShieldCheck } from "lucide-react";
import AppHeader from "@/components/AppHeader";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export default function Programs() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();

  // Warn if user has an active uncompleted plan when entering Programs
  useEffect(() => {
    if (loading || !user) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("saved_plans")
        .select("id, plan_completed_at")
        .eq("user_id", user.id)
        .is("plan_completed_at", null)
        .limit(1);
      if (!cancelled && data && data.length > 0) {
        toast({
          title: (t as any).activePlanWarning,
          duration: 5000,
        });
      }
    })();
    return () => { cancelled = true; };
  }, [user, loading, toast, t]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" state={{ redirectTo: "/programs" }} replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-2 mb-3 flex-wrap">
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold"
              style={{ backgroundColor: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.25)', color: '#22c55e' }}>
              <ShieldCheck className="w-3.5 h-3.5" />
              {(t as any).coachProgramPill}
            </span>
          </div>
          <h1 className="text-4xl font-display font-bold text-foreground mb-3">{t.chooseYour} <span className="text-gradient">{t.program}</span></h1>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">{(t as any).programsDescCoach}</p>
        </div>
        <ProgramCard />
      </div>
    </div>
  );
}
