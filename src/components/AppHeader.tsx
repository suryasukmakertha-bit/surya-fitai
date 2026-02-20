import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Settings, LogIn, LogOut, FolderOpen, Home, Menu, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import SettingsModal from "@/components/SettingsModal";

export default function AppHeader() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut } = useAuth();
  const { t } = useLanguage();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isHome = location.pathname === "/";

  return (
    <>
      <nav className={`${isHome ? "absolute" : "sticky"} top-0 left-0 right-0 z-20 bg-background/80 backdrop-blur-sm border-b border-border/30`}>
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <button onClick={() => navigate("/")} className="font-display font-bold text-foreground text-lg hover:text-primary transition-colors">
            Surya-FitAi
          </button>

          {/* Desktop nav */}
          <div className="hidden sm:flex items-center gap-3">
            {user ? (
              <>
                <button onClick={() => navigate("/saved-plans")} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors">
                  <FolderOpen className="w-4 h-4" /> {t.myPlans}
                </button>
                <button onClick={() => signOut()} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors">
                  <LogOut className="w-4 h-4" /> {t.signOut}
                </button>
                <button
                  onClick={() => setSettingsOpen(true)}
                  className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors bg-secondary/60 rounded-full px-3 py-1.5 border border-border/50"
                  title={t.settings}
                >
                  <Settings className="w-4 h-4" />
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
            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="text-muted-foreground hover:text-foreground p-1">
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="sm:hidden border-t border-border/30 bg-card/95 backdrop-blur-sm px-4 py-3 space-y-2 animate-in slide-in-from-top-2 duration-200">
            {!isHome && (
              <button onClick={() => { navigate("/"); setMobileMenuOpen(false); }} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary w-full py-2">
                <Home className="w-4 h-4" /> {t.home}
              </button>
            )}
            {user ? (
              <>
                <button onClick={() => { navigate("/saved-plans"); setMobileMenuOpen(false); }} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary w-full py-2">
                  <FolderOpen className="w-4 h-4" /> {t.myPlans}
                </button>
                <button onClick={() => { signOut(); setMobileMenuOpen(false); }} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary w-full py-2">
                  <LogOut className="w-4 h-4" /> {t.signOut}
                </button>
                <button onClick={() => { setSettingsOpen(true); setMobileMenuOpen(false); }} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary w-full py-2">
                  <Settings className="w-4 h-4" /> {t.settings}
                </button>
              </>
            ) : (
              <button onClick={() => { navigate("/auth"); setMobileMenuOpen(false); }} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary w-full py-2">
                <LogIn className="w-4 h-4" /> {t.signIn}
              </button>
            )}
          </div>
        )}
      </nav>

      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  );
}
