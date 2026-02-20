import { useState, useEffect } from "react";
import { X, Globe, FolderOpen, Trash2, ArrowRight, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useLanguage, Lang } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface SavedPlan {
  id: string;
  program_type: string;
  plan_name: string | null;
  created_at: string;
  user_info: any;
}

const LANG_OPTIONS: { value: Lang; flag: string; label: string }[] = [
  { value: "en", flag: "🇬🇧", label: "English" },
  { value: "id", flag: "🇮🇩", label: "Bahasa Indonesia" },
  { value: "zh", flag: "🇨🇳", label: "简体中文" },
];

export default function SettingsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { lang, setLang, t } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [plans, setPlans] = useState<SavedPlan[]>([]);
  const [loading, setLoading] = useState(false);
  const [activePlanId, setActivePlanId] = useState<string | null>(() => localStorage.getItem("fitai-active-plan"));

  useEffect(() => {
    if (open && user) {
      setLoading(true);
      supabase
        .from("saved_plans")
        .select("id, program_type, plan_name, created_at, user_info")
        .order("created_at", { ascending: false })
        .then(({ data }) => {
          if (data) setPlans(data as SavedPlan[]);
          setLoading(false);
        });
    }
  }, [open, user]);

  if (!open) return null;

  const handleLangChange = (newLang: Lang) => {
    setLang(newLang);
    toast({ title: t.languageChanged });
  };

  const handleSwitchPlan = (planId: string) => {
    localStorage.setItem("fitai-active-plan", planId);
    setActivePlanId(planId);
    toast({ title: t.planSwitched });
  };

  const handleDeletePlan = async (planId: string) => {
    await supabase.from("saved_plans").delete().eq("id", planId);
    setPlans((prev) => prev.filter((p) => p.id !== planId));
    if (activePlanId === planId) {
      localStorage.removeItem("fitai-active-plan");
      setActivePlanId(null);
    }
    toast({ title: t.planDeleted });
  };

  return (
    <div className="fixed inset-0 z-[9998]" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute right-0 top-0 bottom-0 w-full max-w-md bg-card border-l border-border shadow-2xl animate-in slide-in-from-right duration-300 overflow-y-auto">
        <div className="sticky top-0 bg-card/95 backdrop-blur-sm border-b border-border z-10 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-display font-bold text-foreground">{t.settings}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-md hover:bg-secondary">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-6 space-y-8">
          {/* Language Section */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Globe className="w-4 h-4 text-primary" />
              <h3 className="font-display font-semibold text-foreground">{t.settingsLanguage}</h3>
            </div>
            <div className="space-y-2">
              {LANG_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => handleLangChange(opt.value)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg border transition-all text-left ${
                    lang === opt.value
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border bg-secondary/30 text-muted-foreground hover:border-primary/50 hover:bg-secondary/60"
                  }`}
                >
                  <span className="text-xl">{opt.flag}</span>
                  <span className="font-medium text-sm">{opt.label}</span>
                  {lang === opt.value && (
                    <span className="ml-auto text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full font-medium">
                      ✓
                    </span>
                  )}
                </button>
              ))}
            </div>
          </section>

          <div className="border-t border-border" />

          {/* My Plans Section */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <FolderOpen className="w-4 h-4 text-primary" />
              <h3 className="font-display font-semibold text-foreground">{t.settingsMyPlans}</h3>
            </div>

            {!user ? (
              <div className="card-gradient rounded-lg p-6 border border-border/50 text-center">
                <p className="text-sm text-muted-foreground mb-3">{t.signInToSave}</p>
                <Button size="sm" onClick={() => { onClose(); navigate("/auth"); }}>
                  {t.signIn}
                </Button>
              </div>
            ) : loading ? (
              <div className="flex justify-center py-8">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : plans.length === 0 ? (
              <div className="card-gradient rounded-lg p-6 border border-border/50 text-center">
                <p className="text-sm text-muted-foreground mb-3">{t.noPlansYet}</p>
                <Button size="sm" onClick={() => { onClose(); navigate("/programs"); }}>
                  <Plus className="w-4 h-4 mr-1" /> {t.createNewPlan}
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {plans.map((p) => {
                  const isActive = activePlanId === p.id;
                  return (
                    <div
                      key={p.id}
                      className={`rounded-lg p-4 border transition-all ${
                        isActive ? "border-primary bg-primary/5" : "border-border/50 card-gradient"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="min-w-0 flex-1">
                          <h4 className="font-medium text-foreground text-sm truncate">
                            {p.plan_name || `${p.program_type} ${t.program}`}
                          </h4>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {new Date(p.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0 ${
                          isActive ? "bg-primary/20 text-primary" : "bg-secondary text-muted-foreground"
                        }`}>
                          {isActive ? t.active : t.inactive}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        {!isActive && (
                          <Button
                            size="sm"
                            variant="secondary"
                            className="h-7 text-xs flex-1"
                            onClick={() => handleSwitchPlan(p.id)}
                          >
                            <ArrowRight className="w-3 h-3 mr-1" /> {t.switchPlan}
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs text-muted-foreground hover:text-destructive"
                          onClick={() => handleDeletePlan(p.id)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full mt-2"
                  onClick={() => { onClose(); navigate("/programs"); }}
                >
                  <Plus className="w-4 h-4 mr-1" /> {t.createNewPlan}
                </Button>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
