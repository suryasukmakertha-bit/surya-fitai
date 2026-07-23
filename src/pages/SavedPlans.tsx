import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Trash2, Loader2, Eye, Pencil, Check, X, Flame, CheckCircle2, Lock, AlertTriangle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { getPlanProgress, type PlanProgress } from "@/lib/planProgress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import AppHeader from "@/components/AppHeader";
import { useSubscription } from "@/hooks/useSubscription";
import SubscriptionPopup from "@/components/subscription/SubscriptionPopup";
import LockedPlanModal from "@/components/subscription/LockedPlanModal";

interface SavedPlan {
  id: string;
  program_type: string;
  user_info: any;
  plan_data: any;
  created_at: string;
  plan_name: string | null;
  plan_month_number?: number;
  plan_completed_at?: string | null;
  plan_started_at?: string | null;
}

function PlanProgressBar({ userId, plan }: { userId: string; plan: SavedPlan }) {
  const [p, setP] = useState<PlanProgress | null>(null);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const r = await getPlanProgress(userId, { id: plan.id, plan_data: plan.plan_data, plan_started_at: plan.plan_started_at });
      if (!cancelled) setP(r);
    })();
    return () => { cancelled = true; };
  }, [userId, plan.id, plan.plan_started_at]);
  const pct = p?.percentage ?? 0;
  return (
    <div className="mt-2">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] text-muted-foreground">
          {p ? `${p.completedDays}/${p.totalDays} · Minggu ${p.currentWeek}/${p.totalWeeks}` : "—"}
        </span>
        <span className="text-[10px] font-semibold" style={{ color: "#ff6b00" }}>{pct}%</span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
        <div
          className="h-full rounded-full"
          style={{ width: `${pct}%`, background: "linear-gradient(90deg,#ff6b00,#ff3d7f)" }}
        />
      </div>
    </div>
  );
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
  const [lockedModalPlan, setLockedModalPlan] = useState<SavedPlan | null>(null);

  const { access, loading: subLoading, openPopup, checkMyPlansGuard, checkSaveGuard, guardSavedPlanItem, showPopup, popupTrigger, closePopup, userEmail, refetch: refetchSub, savedPlansCount } = useSubscription();

  const planLimitToastMsg = lang === "id" ? "Maksimal 3 plan tersimpan. Hapus 1 plan untuk menyimpan yang baru." : lang === "zh" ? "已达到最多3个计划。删除一个计划以保存新计划。" : "Maximum 3 plans reached. Delete a plan to save a new one.";

  const activeBadge = lang === "id" ? "Aktif" : lang === "zh" ? "激活" : "Active";
  const lockedBtnText = lang === "id" ? "Terkunci" : lang === "zh" ? "已锁定" : "Locked";

  const expiredBannerText =
    lang === "id" ? "Trial kamu telah berakhir. Kamu hanya bisa mengakses 1 program terbaru. Subscribe untuk buka semua program dan fitur."
    : lang === "zh" ? "您的试用已结束。您只能访问最新的一个计划。订阅以解锁所有计划和功能。"
    : "Your trial has ended. You can only access your most recent plan. Subscribe to unlock all plans and features.";
  const expiredBannerBtn =
    lang === "id" ? "Subscribe Sekarang" : lang === "zh" ? "立即订阅" : "Subscribe Now";

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate("/auth");
      return;
    }
    fetchPlans();

    // Refetch when tab/window regains focus or an extended plan broadcasts a refresh
    // so badges reflect the latest DB state only.
    const onFocus = () => fetchPlans();
    const onVisibility = () => {
      if (document.visibilityState === "visible") fetchPlans();
    };
    const onSavedPlansRefetch = () => fetchPlans();
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("surya-fitai:saved-plans-refetch", onSavedPlansRefetch);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("surya-fitai:saved-plans-refetch", onSavedPlansRefetch);
    };
  }, [user, authLoading]);

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
    // Free/expired tier: only the most recent plan is accessible.
    if (access.isFreeTier && !access.isUnlimited) {
      const mostRecentId = getMostRecentPlanId();
      if (plan.id !== mostRecentId) {
        setLockedModalPlan(plan);
        return;
      }
    }
    if (!guardSavedPlanItem()) return;
    navigate("/results", { state: { plan: plan.plan_data, userInfo: plan.user_info, programType: plan.program_type, planId: plan.id } });
  };

  const handleAddPlan = () => {
    const guard = checkSaveGuard();
    if (guard === 'popup') { openPopup('saved_plans'); return; }
    if (guard === 'free_limit') { openPopup('save_limit' as any); return; }
    if (guard === 'toast_limit') {
      toast({ title: planLimitToastMsg, duration: 3000 });
      return;
    }
    navigate("/program/custom");
  };

  // Most recent plan id by GREATEST(updated_at, created_at)
  const getMostRecentPlanId = (): string | null => {
    if (plans.length === 0) return null;
    const sorted = [...plans].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return sorted[0].id;
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

  const isFreeOrExpired = access.isFreeTier && !access.isUnlimited;
  const mostRecentId = getMostRecentPlanId();

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

        {/* Expired banner — show only for users whose trial/sub ended (not for never-subscribed) */}
        {access.isExpired && (
          <div
            className="flex items-center gap-2.5"
            style={{
              background: "rgba(245,158,11,0.1)",
              border: "1px solid rgba(245,158,11,0.3)",
              borderRadius: 12,
              padding: "12px 16px",
              marginBottom: 16,
            }}
          >
            <AlertTriangle className="w-4 h-4 shrink-0" style={{ color: "#f59e0b" }} />
            <p className="text-xs text-foreground/85 flex-1 leading-relaxed">{expiredBannerText}</p>
            <button
              onClick={() => openPopup('save_plan')}
              className="shrink-0 text-xs font-semibold px-3 py-1.5 rounded-md border"
              style={{ color: "#f59e0b", borderColor: "rgba(245,158,11,0.5)", background: "transparent" }}
            >
              {expiredBannerBtn}
            </button>
          </div>
        )}

        {plans.length === 0 ? (
          <div className="card-gradient rounded-lg p-8 border border-border/50 text-center">
            <p className="text-muted-foreground mb-4">{t.noSavedPlans}</p>
            <Button onClick={() => navigate("/program/custom")}>{t.generateFirst}</Button>
          </div>
        ) : (
          <div className="space-y-3">
            {plans.map((p) => {
              const isLocked = isFreeOrExpired && p.id !== mostRecentId;
              const isAccessible = isFreeOrExpired && p.id === mostRecentId;
              return (
              <div key={p.id} className="relative card-gradient rounded-lg p-5 border border-border/50 flex items-center justify-between">
                {isLocked && (
                  <>
                    <div className="absolute inset-0 rounded-lg pointer-events-none" style={{ background: "rgba(0,0,0,0.3)" }} />
                    <Lock className="absolute top-3 right-3 w-4 h-4 text-muted-foreground z-10" strokeWidth={2} />
                  </>
                )}
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
                        {/* Active badge for the one accessible free plan */}
                        {isAccessible && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/30 shrink-0">
                            {activeBadge}
                          </span>
                        )}
                        {/* Bulan X badge — pill with icon on the left */}
                        <span
                          className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/30 shrink-0"
                          aria-label={p.plan_completed_at ? (t as any).completedBadgeLabel : (t as any).activeBadgeLabel}
                        >
                          {p.plan_completed_at ? (
                            <CheckCircle2 className="w-3 h-3" strokeWidth={1.5} style={{ color: "#10b981" }} />
                          ) : (
                            <Flame className="w-3 h-3" strokeWidth={1.5} style={{ color: "#ff6b00" }} />
                          )}
                          <span>{(t as any).monthBadge} {p.plan_month_number || 1}</span>
                        </span>
                        <button onClick={() => startRename(p)} className="text-muted-foreground hover:text-primary transition-colors p-1">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <p className="text-xs text-muted-foreground">{new Date(p.plan_started_at || p.created_at).toLocaleDateString()}</p>
                      {user && <PlanProgressBar userId={user.id} plan={p} />}
                    </>
                  )}
                </div>
                <div className="flex items-center gap-2 ml-3 relative z-10">
                  {isLocked ? (
                    <button
                      onClick={() => setLockedModalPlan(p)}
                      className="inline-flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-md"
                      style={{
                        background: "rgba(255,255,255,0.05)",
                        border: "1px solid rgba(255,255,255,0.1)",
                        color: "rgba(255,255,255,0.35)",
                      }}
                    >
                      <Lock className="w-3.5 h-3.5" />
                      {lockedBtnText}
                    </button>
                  ) : (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handlePlanClick(p)}
                    >
                      <Eye className="w-4 h-4 mr-1" /> {t.view}
                    </Button>
                  )}
                  <button onClick={() => deletePlan(p.id)} className="text-muted-foreground hover:text-destructive transition-colors p-2">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              );
            })}
          </div>
        )}
      </div>
      <SubscriptionPopup isOpen={showPopup} onClose={closePopup} trigger={popupTrigger} userEmail={userEmail} onPaymentDone={refetchSub} trialNotStarted={access.trialNotStarted} isTrialActive={access.isTrialActive} />
      <LockedPlanModal
        isOpen={!!lockedModalPlan}
        planName={lockedModalPlan?.plan_name || `${lockedModalPlan?.program_type || ''} ${t.program}`.trim()}
        onClose={() => setLockedModalPlan(null)}
        onSubscribe={() => { setLockedModalPlan(null); openPopup('saved_plan_item'); }}
      />
    </div>
  );
}
