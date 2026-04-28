import { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { LogIn, LogOut, FolderOpen, Menu, X, Globe, Check, Download, ScrollText, Crown, Bell, Home, MessageSquare, ShieldCheck } from "lucide-react";
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

  // Track notification permission
  useEffect(() => {
    if ("Notification" in window) {
      setNotifPermission(Notification.permission);
    }
  }, [notifSettingsOpen]);

  const isHome = location.pathname === "/";

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
      <nav className={`${isHome ? "absolute" : "sticky"} top-0 left-0 right-0 z-20 bg-background/80 backdrop-blur-sm border-b border-border/30`}>
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <button onClick={() => navigate("/")} className={`font-display font-bold text-lg transition-colors ${isHome ? "text-foreground hover:text-primary" : "text-primary hover:opacity-80"}`}>
            {isHome ? "Surya-FitAi" : <Home className="w-6 h-6" />}
          </button>

          {/* Desktop nav */}
          <div className="hidden sm:flex items-center gap-3">
            {/* Language dropdown */}
            <div className="relative" ref={langRef}>
              <button
                data-tour="language-selector"
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
                <button onClick={() => { if (!guardSavedPlans()) return; navigate("/saved-plans"); }} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors">
                  <FolderOpen className="w-4 h-4" /> {t.myPlans}
                </button>
                <button onClick={() => {
                  if (access.isSubscriptionActive || access.isUnlimited) {
                    toast({ title: lang === "id" ? "Langganan Pro kamu aktif ✅" : lang === "zh" ? "您的Pro订阅已激活 ✅" : "Your Pro subscription is active ✅" });
                  } else {
                    openSubPopup('save_plan');
                  }
                }} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors">
                  <Crown className="w-4 h-4 text-primary" />
                  {(PRICING_TEXT[lang as PricingLang] ?? PRICING_TEXT.en).planName}
                </button>
                <button onClick={() => setDownloadOpen(true)} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors">
                  <Download className="w-4 h-4 text-primary" />
                  {lang === "id" ? "Unduh Aplikasi" : lang === "zh" ? "下载应用" : "Download App"}
                </button>
                <button onClick={() => setNotifSettingsOpen(true)} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors">
                  <Bell className="w-4 h-4 text-primary" />
                  {lang === "id" ? "Notifikasi" : lang === "zh" ? "通知" : "Notifications"}
                  {notifPermission === "granted" && <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />}
                  {notifPermission === "denied" && <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />}
                </button>
                <button onClick={() => openLegalPopup('terms')} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors">
                  <ScrollText className="w-4 h-4 text-primary" />
                  {UI[lang as LangCode].menuItem}
                </button>
                <button onClick={() => setFeedbackOpen(true)} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors">
                  <MessageSquare className="w-4 h-4 text-primary" />
                  {feedbackLabel}
                </button>
                {isAdmin && (
                  <button onClick={() => navigate("/admin")} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors">
                    <ShieldCheck className="w-4 h-4 text-primary" />
                    {adminLabel}
                  </button>
                )}
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
            <button data-tour="language-selector" onClick={() => setDrawerOpen(true)} className="text-muted-foreground hover:text-foreground p-1">
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
                    onClick={() => { if (!guardSavedPlans()) { closeDrawer(); return; } navigate("/saved-plans"); closeDrawer(); }}
                    className="flex items-center gap-3 w-full py-3 text-sm text-foreground hover:text-primary transition-colors"
                  >
                    <FolderOpen className="w-4 h-4 text-primary" />
                    <span className="font-medium">{t.myPlans}</span>
                  </button>

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
                      {notifPermission === "granted" && <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />}
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
