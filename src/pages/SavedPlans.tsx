import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Trash2, Loader2, Eye, Plus, Pencil, Check, X } from "lucide-react";
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

  const { access, loading: subLoading, openPopup, guardSavedPlans, guardSavedPlanItem, isAtPlanLimit, showPopup, popupTrigger, closePopup, userEmail, refetch: refetchSub } = useSubscription();

  const planLimitTooltip = lang === "id" ? "Hapus 1 plan untuk menyimpan yang baru" : lang === "zh" ? "删除一个计划以保存新计划" : "Delete a plan to save a new one";

  const lockedTitle = lang === "id" ? "Upgrade untuk akses program kamu" : lang === "zh" ? "升级以访问您的计划" : "Upgrade to access your plans";
  const lockedBtn = lang === "id" ? "Lihat Paket Pro" : lang === "zh" ? "查看Pro计划" : "See Pro Plans";

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate("/auth");
      return;
    }
    fetchPlans();
  }, [user, authLoading]);

  // Check access on page load
  useEffect(() => {
    if (!subLoading && !access.canAccessSavedPlans) openPopup('saved_plans');
  }, [subLoading, access.canAccessSavedPlans]);

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
    refetchSub();
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

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-3xl font-display font-bold text-foreground">
            {t.savedPlans} <span className="text-gradient">{t.plans}</span>
          </h1>
          <Button
            onClick={() => navigate("/programs")}
            size="sm"
            disabled={isAtPlanLimit}
            title={isAtPlanLimit ? planLimitTooltip : undefined}
            className={isAtPlanLimit ? "opacity-50 cursor-not-allowed" : ""}
          >
            {t.addPlan || "+ Add Plan"}
          </Button>
        </div>
        <p className="text-muted-foreground mb-8">{t.savedPlansDesc}</p>

        {/* Locked state when no access */}
        {!access.canAccessSavedPlans && (
          <div className="relative">
            <div className="filter blur-sm pointer-events-none select-none opacity-40">
              <div className="rounded-2xl bg-secondary h-28 mb-3" />
              <div className="rounded-2xl bg-secondary h-28 mb-3" />
              <div className="rounded-2xl bg-secondary h-28" />
            </div>
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
              <span className="text-5xl">🔒</span>
              <p className="font-semibold text-foreground text-lg text-center px-4">
                {lockedTitle}
              </p>
              <button onClick={() => openPopup('saved_plans')} className="bg-primary text-primary-foreground font-bold px-6 py-3 rounded-2xl">
                {lockedBtn}
              </button>
            </div>
          </div>
        )}

        {access.canAccessSavedPlans && plans.length === 0 ? (
          <div className="card-gradient rounded-lg p-8 border border-border/50 text-center">
            <p className="text-muted-foreground mb-4">{t.noSavedPlans}</p>
            <Button onClick={() => navigate("/programs")}>{t.generateFirst}</Button>
          </div>
        ) : access.canAccessSavedPlans && (
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
                      <div className="flex items-center gap-2">
                        <h3 className="font-display font-bold text-foreground capitalize truncate">
                          {p.plan_name || `${p.program_type} ${t.program}`}
                        </h3>
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
      <SubscriptionPopup isOpen={showPopup} onClose={closePopup} trigger={popupTrigger} userEmail={userEmail} onPaymentDone={refetchSub} />
    </div>
  );
}
