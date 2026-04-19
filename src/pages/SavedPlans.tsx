import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Trash2, Loader2, Eye, Pencil, Check, X, Flame, CheckCircle2, Lock } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import AppHeader from "@/components/AppHeader";
import { useSubscription } from "@/hooks/useSubscription";
import SubscriptionPopup from "@/components/subscription/SubscriptionPopup";

interface SavedPlan {
  id: string;
  program_type: string;
  user_info: any;
  plan_data: any;
  created_at: string;
  plan_name: string | null;
  plan_month_number?: number;
  plan_completed_at?: string | null;
}

export default function SavedPlans() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const { t, lang } = useLanguage();
  const [plans, setPlans] = useState<SavedPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const { access, loading: subLoading, openPopup, checkMyPlansGuard, checkSaveGuard, guardSavedPlanItem, showPopup, popupTrigger, closePopup, userEmail, refetch: refetchSub, savedPlansCount } = useSubscription();

  const planLimitToastMsg = lang === "id" ? "Maksimal 3 plan tersimpan. Hapus 1 plan untuk menyimpan yang baru." : lang === "zh" ? "已达到最多3个计划。删除一个计划以保存新计划。" : "Maximum 3 plans reached. Delete a plan to save a new one.";

  const lockedTitle = lang === "id" ? "Upgrade untuk akses program kamu" : lang === "zh" ? "升级以访问您的计划" : "Upgrade to access your plans";
  const lockedBtn = lang === "id" ? "Lihat Paket Pro" : lang === "zh" ? "查看Pro计划" : "See Pro Plans";

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate("/auth");
      return;
    }
    fetchPlans();

    // Refetch when tab/window regains focus so badges reflect latest DB state
    const onFocus = () => fetchPlans();
    const onVisibility = () => {
      if (document.visibilityState === "visible") fetchPlans();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [user, authLoading]);

  // Check access on page load — show popup only if trial expired & not subscribed
  useEffect(() => {
    if (!subLoading) {
      const guard = checkMyPlansGuard();
      if (guard === 'popup') openPopup('saved_plans');
    }
  }, [subLoading, checkMyPlansGuard]);

  const fetchPlans = async () => {
    const { data, error } = await supabase
      .from("saved_plans")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error && data) setPlans(data as SavedPlan[]);
    setLoading(false);
  };

  const deletePlan = async (id: string) => {
    await supabase.from("saved_plans").delete().eq("id", id);
    setPlans((prev) => prev.filter((p) => p.id !== id));
    toast({ title: t.planDeleted });
    await refetchSub();
  };

  const startRename = (plan: SavedPlan) => {
    setEditingId(plan.id);
    setEditName(plan.plan_name || `${plan.program_type} ${t.program}`);
  };

  const saveRename = async (id: string) => {
    if (!editName.trim()) return;
    await supabase.from("saved_plans").update({ plan_name: editName.trim() }).eq("id", id);
    setPlans((prev) => prev.map((p) => (p.id === id ? { ...p, plan_name: editName.trim() } : p)));
    setEditingId(null);
    toast({ title: t.planRenamed || "Plan renamed" });
  };

  const handlePlanClick = (plan: SavedPlan) => {
    if (!guardSavedPlanItem()) return;
    navigate("/results", { state: { plan: plan.plan_data, userInfo: plan.user_info, programType: plan.program_type, planId: plan.id } });
  };

  const handleAddPlan = () => {
    const guard = checkSaveGuard();
    if (guard === 'popup') { openPopup('saved_plans'); return; }
    if (guard === 'toast_limit') {
      toast({ title: planLimitToastMsg, duration: 3000 });
      return;
    }
    navigate("/programs");
  };

  // Determine add plan button state
  const addGuard = checkSaveGuard();
  const isAddDisabled = addGuard === 'toast_limit';

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Show locked state only when trial expired & not subscribed (not for trialNotStarted)
  const showLockedState = !access.canAccessSavedPlans && !access.trialNotStarted;

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-3xl font-display font-bold text-foreground">
            {t.savedPlans} <span className="text-gradient">{t.plans}</span>
          </h1>
          <Button
            onClick={handleAddPlan}
            size="sm"
            disabled={isAddDisabled}
            className={isAddDisabled ? "opacity-50 cursor-not-allowed" : ""}
          >
            {t.addPlan || "+ Add Plan"}
          </Button>
        </div>
        <p className="text-muted-foreground mb-8">{t.savedPlansDesc}</p>

        {/* Locked state when trial expired & not subscribed */}
        {showLockedState && (
          <div className="relative">
            <div className="filter blur-sm pointer-events-none select-none opacity-40">
              <div className="rounded-2xl bg-secondary h-28 mb-3" />
              <div className="rounded-2xl bg-secondary h-28 mb-3" />
              <div className="rounded-2xl bg-secondary h-28" />
            </div>
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
              <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center">
                <Lock className="w-8 h-8 text-primary" strokeWidth={1.5} />
              </div>
              <p className="font-semibold text-foreground text-lg text-center px-4">
                {lockedTitle}
              </p>
              <button onClick={() => openPopup('saved_plans')} className="bg-primary text-primary-foreground font-bold px-6 py-3 rounded-2xl">
                {lockedBtn}
              </button>
            </div>
          </div>
        )}

        {!showLockedState && plans.length === 0 ? (
          <div className="card-gradient rounded-lg p-8 border border-border/50 text-center">
            <p className="text-muted-foreground mb-4">{t.noSavedPlans}</p>
            <Button onClick={() => navigate("/programs")}>{t.generateFirst}</Button>
          </div>
        ) : !showLockedState && (
          <div className="space-y-3">
            {plans.map((p) => (
              <div key={p.id} className="card-gradient rounded-lg p-5 border border-border/50 flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  {editingId === p.id ? (
                    <div className="flex items-center gap-2">
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="bg-secondary border-border h-8 text-sm"
                        autoFocus
                        onKeyDown={(e) => e.key === "Enter" && saveRename(p.id)}
                      />
                      <button onClick={() => saveRename(p.id)} className="text-primary hover:text-primary/80 p-1">
                        <Check className="w-4 h-4" />
                      </button>
                      <button onClick={() => setEditingId(null)} className="text-muted-foreground hover:text-foreground p-1">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-display font-bold text-foreground capitalize truncate">
                          {p.plan_name || `${p.program_type} ${t.program}`}
                        </h3>
                        {/* Bulan X badge — pill with icon on the left */}
                        <span
                          className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/30 shrink-0"
                          aria-label={p.plan_completed_at ? (t as any).completedBadgeLabel : (t as any).activeBadgeLabel}
                        >
                          {p.plan_completed_at ? (
                            <CheckCircle2 className="w-3 h-3" strokeWidth={1.5} style={{ color: "#22c55e" }} />
                          ) : (
                            <Flame className="w-3 h-3" strokeWidth={1.5} style={{ color: "#22c55e" }} />
                          )}
                          <span>{(t as any).monthBadge} {p.plan_month_number || 1}</span>
                        </span>
                        <button onClick={() => startRename(p)} className="text-muted-foreground hover:text-primary transition-colors p-1">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <p className="text-xs text-muted-foreground">{new Date(p.created_at).toLocaleDateString()}</p>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-2 ml-3">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => handlePlanClick(p)}
                  >
                    <Eye className="w-4 h-4 mr-1" /> {t.view}
                  </Button>
                  <button onClick={() => deletePlan(p.id)} className="text-muted-foreground hover:text-destructive transition-colors p-2">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <SubscriptionPopup isOpen={showPopup} onClose={closePopup} trigger={popupTrigger} userEmail={userEmail} onPaymentDone={refetchSub} trialNotStarted={access.trialNotStarted} isTrialActive={access.isTrialActive} />
    </div>
  );
}
