import { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { LogIn, LogOut, FolderOpen, Menu, X, Globe, Check, Download, ScrollText, Crown, Bell, MessageSquare, ShieldCheck, RotateCcw, Sun, Moon } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage, Lang } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import DownloadAppModal from "@/components/DownloadAppModal";
import PricingModal from "@/components/pricing/PricingModal";
import { PRICING_TEXT, type PricingLang } from "@/components/pricing/pricingContent";
import { UI, LangCode } from "@/components/legal/legalContent";
import { openLegalPopup } from "@/components/legal/legalEvents";
import NotificationSettingsPopup from "@/components/pwa/NotificationSettingsPopup";
import { useSubscription } from "@/hooks/useSubscription";
import SubscriptionPopup from "@/components/subscription/SubscriptionPopup";
import FeedbackModal from "@/components/FeedbackModal";
import BrandLogo from "@/components/brand/BrandLogo";
import TierBadge, { Tier } from "@/components/brand/TierBadge";
import { useTheme } from "@/hooks/useTheme";
import { OPEN_PROFILE_DRAWER_EVENT } from "@/components/nav/BottomNav";

const ADMIN_EMAIL = "surya.sukmakertha@gmail.com";

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
  const [downloadOpen, setDownloadOpen] = useState(false);
  const [pricingOpen, setPricingOpen] = useState(false);
  const [notifSettingsOpen, setNotifSettingsOpen] = useState(false);
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>("default");
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const langRef = useRef<HTMLDivElement>(null);
  const { access, guardSavedPlans, checkMyPlansGuard, openPopup: openSubPopup, showPopup: showSubPopup, popupTrigger: subPopupTrigger, closePopup: closeSubPopup, userEmail: subEmail, refetch: refetchSub } = useSubscription();

  const isAdmin = (user?.email ?? "").toLowerCase() === ADMIN_EMAIL;
  const feedbackLabel = lang === "id" ? "Masukan & Saran" : lang === "zh" ? "反馈与建议" : "Feedback";
  const adminLabel = lang === "id" ? "Admin Report" : lang === "zh" ? "管理员报告" : "Admin Report";
  const { theme, toggleTheme } = useTheme();

  const tier: Tier = isAdmin
    ? "ADMIN"
    : access.isUnlimited || access.isSubscriptionActive
    ? "PAID"
    : access.isTrialActive
    ? "TRIAL"
    : access.isExpired
    ? "EXPIRED"
    : "FREE";

  // Track notification permission
  useEffect(() => {
    if ("Notification" in window) {
      setNotifPermission(Notification.permission);
    }
  }, [notifSettingsOpen]);

  // Open drawer when bottom nav "Profil" tab is clicked
  useEffect(() => {
    const handler = () => setDrawerOpen(true);
    window.addEventListener(OPEN_PROFILE_DRAWER_EVENT, handler);
    return () => window.removeEventListener(OPEN_PROFILE_DRAWER_EVENT, handler);
  }, []);

  const isHome = location.pathname === "/";

  const handleRefresh = () => {
    // Simple soft-refresh of the current view
    window.location.reload();
  };

  // Close lang dropdown on outside click (desktop only)
  useEffect(() => {
    if (!langOpen || drawerOpen) return;
    const handler = (e: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(e.target as Node)) {
        setLangOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [langOpen, drawerOpen]);

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
      <nav className="sticky top-0 left-0 right-0 z-20 bg-background/80 backdrop-blur-sm" style={{ borderBottom: "1px solid hsl(var(--border) / 0.07)" }}>
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <button onClick={() => navigate("/")} className="transition-opacity hover:opacity-90" aria-label="Surya-FitAi home">
            <BrandLogo size={32} />
          </button>

          {/* Right-side icon buttons (visible on all screens) */}
          <div className="flex items-center gap-2 sm:hidden">
            <button
              onClick={handleRefresh}
              aria-label="Refresh"
              className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
              style={{ background: "hsl(var(--surface))", color: "hsl(var(--foreground))" }}
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
              style={{ background: "hsl(var(--surface))", color: "hsl(var(--foreground))" }}
            >
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button data-tour="language-selector" onClick={() => setDrawerOpen(true)} className="text-muted-foreground hover:text-foreground p-1" aria-label="Open menu">
              <Menu className="w-5 h-5" />
            </button>
          </div>

          {/* Desktop / tablet nav */}
          <div className="hidden sm:flex items-center gap-2 lg:gap-4">
            {user && (
              <div className="flex items-center gap-1 lg:gap-3 mr-2">
                {[
                  { key: "home", path: "/", label: t.home || (lang === "id" ? "Home" : lang === "zh" ? "主页" : "Home") },
                  { key: "program", path: "/program/custom", label: lang === "id" ? "Program" : lang === "zh" ? "计划" : "Program" },
                  { key: "plans", path: "/saved-plans", label: lang === "id" ? "Rencana" : lang === "zh" ? "我的计划" : "Plans", guard: () => guardSavedPlans() },
                  { key: "profile", path: "/profile", label: lang === "id" ? "Profil" : lang === "zh" ? "个人" : "Profile" },
                ].map((item) => {
                  const active = location.pathname === item.path;
                  return (
                    <button
                      key={item.key}
                      onClick={() => {
                        if (item.guard && !item.guard()) return;
                        navigate(item.path);
                      }}
                      className="hidden lg:inline-flex px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors"
                      style={{
                        color: active ? "#ff6b00" : "hsl(var(--muted-foreground))",
                        background: active ? "rgba(255,107,0,0.10)" : "transparent",
                      }}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            )}
            <button
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
              style={{ background: "hsl(var(--surface))", color: "hsl(var(--foreground))" }}
            >
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button
              onClick={handleRefresh}
              aria-label="Refresh"
              className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
              style={{ background: "hsl(var(--surface))", color: "hsl(var(--foreground))" }}
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            {user ? (
              <button
                onClick={() => setDrawerOpen(true)}
                aria-label="Open menu"
                className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
                style={{ background: "hsl(var(--surface))", color: "hsl(var(--foreground))" }}
              >
                <Menu className="w-4 h-4" />
                {notifPermission === "denied" && <span className="absolute w-2 h-2 rounded-full bg-red-500 -mt-3 ml-3" />}
              </button>
            ) : (
              <button onClick={() => navigate("/auth")} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors px-3 py-1.5">
                <LogIn className="w-4 h-4" /> {t.signIn}
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Side Drawer (mobile) */}
      {drawerOpen && (
        <div className="fixed inset-0 z-[9998]" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={closeDrawer} />
          <div className="absolute right-0 top-0 bottom-0 w-full max-w-xs bg-card border-l border-border shadow-2xl animate-in slide-in-from-right duration-300 overflow-y-auto">
            <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: "1px solid hsl(var(--border) / 0.07)" }}>
              <BrandLogo size={28} />
              <button onClick={closeDrawer} className="text-muted-foreground hover:text-foreground p-1" aria-label="Close menu">
                <X className="w-5 h-5" />
              </button>
            </div>
            {user && (
              <div className="px-5 py-3 flex items-center gap-3" style={{ borderBottom: "1px solid hsl(var(--border) / 0.07)" }}>
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center font-extrabold text-white"
                  style={{ background: "linear-gradient(135deg,#ff6b00,#ff3d7f)" }}
                >
                  {(user.email ?? "U").slice(0, 1).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-foreground truncate">{user.email}</div>
                  <div className="mt-0.5"><TierBadge tier={tier} /></div>
                </div>
              </div>
            )}

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
                  {/* Pro Plan */}
                  <button
                    onClick={() => {
                      closeDrawer();
                      if (access.isSubscriptionActive || access.isUnlimited) {
                        toast({ title: lang === "id" ? "Langganan Pro kamu aktif ✅" : lang === "zh" ? "您的Pro订阅已激活 ✅" : "Your Pro subscription is active ✅" });
                      } else {
                        openSubPopup('save_plan');
                      }
                    }}
                    className="flex items-center gap-3 w-full py-3 text-sm text-foreground hover:text-primary transition-colors"
                  >
                    <Crown className="w-4 h-4 text-primary" />
                    <span className="font-medium">{(PRICING_TEXT[lang as PricingLang] ?? PRICING_TEXT.en).planName}</span>
                  </button>

                  {/* Download App */}
                  <button
                    onClick={() => { closeDrawer(); setDownloadOpen(true); }}
                    className="flex items-center gap-3 w-full py-3 text-sm text-foreground hover:text-primary transition-colors"
                  >
                    <Download className="w-4 h-4 text-primary" />
                    <span className="font-medium">
                      {lang === "id" ? "Unduh Aplikasi" : lang === "zh" ? "下载应用" : "Download App"}
                    </span>
                  </button>

                  {/* Notifications */}
                  <button
                    onClick={() => { closeDrawer(); setNotifSettingsOpen(true); }}
                    className="flex items-center gap-3 w-full py-3 text-sm text-foreground hover:text-primary transition-colors"
                  >
                    <Bell className="w-4 h-4 text-primary" />
                    <span className="font-medium flex items-center gap-2">
                      {lang === "id" ? "Notifikasi" : lang === "zh" ? "通知" : "Notifications"}
                      {notifPermission === "granted" && <span className="w-2 h-2 rounded-full bg-primary inline-block" />}
                      {notifPermission === "denied" && <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />}
                    </span>
                  </button>

                  {/* Terms & Privacy */}
                  <button
                    onClick={() => { closeDrawer(); openLegalPopup('terms'); }}
                    className="flex items-center gap-3 w-full py-3 text-sm text-foreground hover:text-primary transition-colors"
                  >
                    <ScrollText className="w-4 h-4 text-primary" />
                    <span className="font-medium">{UI[lang as LangCode].menuItem}</span>
                  </button>

                  {/* Feedback */}
                  <button
                    onClick={() => { closeDrawer(); setFeedbackOpen(true); }}
                    className="flex items-center gap-3 w-full py-3 text-sm text-foreground hover:text-primary transition-colors"
                  >
                    <MessageSquare className="w-4 h-4 text-primary" />
                    <span className="font-medium">{feedbackLabel}</span>
                  </button>

                  {/* Admin Report (admin only) */}
                  {isAdmin && (
                    <button
                      onClick={() => { closeDrawer(); navigate("/admin"); }}
                      className="flex items-center gap-3 w-full py-3 text-sm text-foreground hover:text-primary transition-colors"
                    >
                      <ShieldCheck className="w-4 h-4 text-primary" />
                      <span className="font-medium">{adminLabel}</span>
                    </button>
                  )}

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
      <DownloadAppModal open={downloadOpen} onOpenChange={setDownloadOpen} />
      <PricingModal isOpen={pricingOpen} onClose={() => setPricingOpen(false)} />
      <NotificationSettingsPopup open={notifSettingsOpen} onOpenChange={setNotifSettingsOpen} />
      <SubscriptionPopup isOpen={showSubPopup} onClose={closeSubPopup} trigger={subPopupTrigger} userEmail={subEmail} onPaymentDone={refetchSub} trialNotStarted={access.trialNotStarted} isTrialActive={access.isTrialActive} />
      <FeedbackModal open={feedbackOpen} onClose={() => setFeedbackOpen(false)} />
    </>
  );
}
