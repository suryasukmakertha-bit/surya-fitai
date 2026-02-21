import { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { LogIn, LogOut, FolderOpen, Menu, X, Globe, Check } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage, Lang } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";

const LANG_OPTIONS: { value: Lang; flag: string; label: string }[] = [
  { value: "en", flag: "🇬🇧", label: "English" },
  { value: "id", flag: "🇮🇩", label: "Bahasa Indonesia" },
  { value: "zh", flag: "🇨🇳", label: "简体中文" },
];

export default function AppHeader() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut } = useAuth();
  const { lang, setLang, t } = useLanguage();
  const { toast } = useToast();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const langRef = useRef<HTMLDivElement>(null);

  const isHome = location.pathname === "/";

  // Close lang dropdown on outside click
  useEffect(() => {
    if (!langOpen) return;
    const handler = (e: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(e.target as Node)) {
        setLangOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [langOpen]);

  const handleLangChange = (newLang: Lang) => {
    setLang(newLang);
    setLangOpen(false);
    toast({ title: t.languageChanged });
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setLangOpen(false);
  };

  return (
    <>
      <nav className={`${isHome ? "absolute" : "sticky"} top-0 left-0 right-0 z-20 bg-background/80 backdrop-blur-sm border-b border-border/30`}>
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <button onClick={() => navigate("/")} className="font-display font-bold text-foreground text-lg hover:text-primary transition-colors">
            Surya-FitAi
          </button>

          {/* Desktop nav */}
          <div className="hidden sm:flex items-center gap-3">
            {/* Language dropdown */}
            <div className="relative" ref={langRef}>
              <button
                onClick={() => setLangOpen(!langOpen)}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                <Globe className="w-4 h-4" /> {t.settingsLanguage}
              </button>
              {langOpen && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-card border border-border rounded-xl shadow-2xl py-2 animate-in fade-in slide-in-from-top-2 duration-200 z-50">
                  {LANG_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => handleLangChange(opt.value)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-secondary/60 transition-colors text-left"
                    >
                      <span className="text-lg">{opt.flag}</span>
                      <span className="flex-1 text-foreground">{opt.label}</span>
                      {lang === opt.value && <Check className="w-4 h-4 text-primary" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {user ? (
              <>
                <button onClick={() => navigate("/saved-plans")} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors">
                  <FolderOpen className="w-4 h-4" /> {t.myPlans}
                </button>
                <button onClick={() => signOut()} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors">
                  <LogOut className="w-4 h-4" /> {t.signOut}
                </button>
              </>
            ) : (
              <button onClick={() => navigate("/auth")} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors">
                <LogIn className="w-4 h-4" /> {t.signIn}
              </button>
            )}
          </div>

          {/* Mobile hamburger */}
          <div className="sm:hidden">
            <button onClick={() => setDrawerOpen(true)} className="text-muted-foreground hover:text-foreground p-1">
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </div>
      </nav>

      {/* Side Drawer (mobile) */}
      {drawerOpen && (
        <div className="fixed inset-0 z-[9998]" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={closeDrawer} />
          <div className="absolute right-0 top-0 bottom-0 w-full max-w-xs bg-card border-l border-border shadow-2xl animate-in slide-in-from-right duration-300 overflow-y-auto">
            <div className="px-5 py-4 flex items-center justify-between border-b border-border">
              <span className="font-display font-bold text-foreground text-lg">Surya-FitAi</span>
              <button onClick={closeDrawer} className="text-muted-foreground hover:text-foreground p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-5 py-4 space-y-1">
              {/* Language */}
              <div>
                <button
                  onClick={() => setLangOpen(!langOpen)}
                  className="flex items-center gap-3 w-full py-3 text-sm text-foreground hover:text-primary transition-colors"
                >
                  <Globe className="w-4 h-4 text-primary" />
                  <span className="font-medium">{t.settingsLanguage}</span>
                </button>
                {langOpen && (
                  <div className="ml-7 space-y-1 pb-2">
                    {LANG_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => handleLangChange(opt.value)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all text-left ${
                          lang === opt.value
                            ? "bg-primary/10 text-foreground border border-primary/30"
                            : "text-muted-foreground hover:bg-secondary/60"
                        }`}
                      >
                        <span className="text-lg">{opt.flag}</span>
                        <span className="flex-1">{opt.label}</span>
                        {lang === opt.value && <Check className="w-4 h-4 text-primary" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {user ? (
                <>
                  {/* My Plans */}
                  <button
                    onClick={() => { navigate("/saved-plans"); closeDrawer(); }}
                    className="flex items-center gap-3 w-full py-3 text-sm text-foreground hover:text-primary transition-colors"
                  >
                    <FolderOpen className="w-4 h-4 text-primary" />
                    <span className="font-medium">{t.myPlans}</span>
                  </button>

                  {/* Sign Out */}
                  <button
                    onClick={() => { signOut(); closeDrawer(); }}
                    className="flex items-center gap-3 w-full py-3 text-sm text-foreground hover:text-primary transition-colors"
                  >
                    <LogOut className="w-4 h-4 text-primary" />
                    <span className="font-medium">{t.signOut}</span>
                  </button>
                </>
              ) : (
                <button
                  onClick={() => { navigate("/auth"); closeDrawer(); }}
                  className="flex items-center gap-3 w-full py-3 text-sm text-foreground hover:text-primary transition-colors"
                >
                  <LogIn className="w-4 h-4 text-primary" />
                  <span className="font-medium">{t.signIn}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
