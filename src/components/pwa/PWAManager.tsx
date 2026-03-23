import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { usePWAInstall } from "@/hooks/usePWAInstall";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useAuth } from "@/contexts/AuthContext";
import { useTour } from "@/contexts/OnboardingTourContext";
import { supabase } from "@/integrations/supabase/client";
import InstallBanner from "./InstallBanner";
import InstallModal from "./InstallModal";
import IOSInstallGuide from "./IOSInstallGuide";
import NotificationPrompt from "./NotificationPrompt";
import FeatureIntroPopup from "./FeatureIntroPopup";

const MODAL_DISMISS_KEY = "fitai-install-modal-dismissed";
const NOTIF_PROMPT_KEY = "fitai-notif-prompt-dismissed";
const PAGE_VISIT_KEY = "fitai-page-visits";
const INTRO_SEEN_KEY = "fitai-intro-seen";

export default function PWAManager() {
  const navigate = useNavigate();
  const { canPrompt, isInstalled, isIOS, triggerInstall, isStandalone } = usePWAInstall();
  const { permission, isSupported, requestPermission } = usePushNotifications();
  const { user, loading: authLoading } = useAuth();
  const { startTour, tourCompleted } = useTour();

  const [showModal, setShowModal] = useState(false);
  const [showIOSModal, setShowIOSModal] = useState(false);
  const [showNotifPrompt, setShowNotifPrompt] = useState(false);
  const [introActive, setIntroActive] = useState(false);
  const [introChecked, setIntroChecked] = useState(false);

  // Check if intro should show — based on backend saved plans count
  // NEVER show intro if onboarding tour is pending or active
  useEffect(() => {
    if (authLoading) return;

    const tourPending = localStorage.getItem("onboarding_pending") === "true";

    // If tour is pending (user just signed in after tapping Start My First Plan), skip intro entirely
    if (tourPending) {
      setIntroActive(false);
      setIntroChecked(true);
      return;
    }

    if (!user) {
      const seen = localStorage.getItem(INTRO_SEEN_KEY) === "true";
      const hasPlan = localStorage.getItem("fitai-has-created-plan") === "true";
      setIntroActive(!seen && !hasPlan);
      setIntroChecked(true);
      return;
    }

    // Logged in — backend result always wins over localStorage
    supabase
      .from("saved_plans")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .then(({ count }) => {
        // Re-check tour pending inside async callback too
        const stillPending = localStorage.getItem("onboarding_pending") === "true";
        if (stillPending) {
          setIntroActive(false);
          setIntroChecked(true);
          return;
        }
        if (count === 0 || count === null) {
          // Zero plans — force intro to show again for this account
          localStorage.removeItem(INTRO_SEEN_KEY);
          localStorage.removeItem("fitai-has-created-plan");
          setIntroActive(true);
        } else {
          localStorage.setItem(INTRO_SEEN_KEY, "true");
          localStorage.setItem("fitai-has-created-plan", "true");
          setIntroActive(false);
        }
        setIntroChecked(true);
      });
  }, [user, authLoading]);

  // Track page visits for install modal trigger — delay if intro is active or tour not done
  useEffect(() => {
    if (introActive || !introChecked) return;
    // Don't show install modal until tour is completed/skipped
    if (tourCompleted !== true) return;
    const visits = parseInt(localStorage.getItem(PAGE_VISIT_KEY) || "0", 10) + 1;
    localStorage.setItem(PAGE_VISIT_KEY, visits.toString());

    if (visits >= 3 && !isInstalled && !isStandalone && !localStorage.getItem(MODAL_DISMISS_KEY)) {
      setTimeout(() => setShowModal(true), 1000);
    }
  }, [isInstalled, isStandalone, introActive, introChecked, tourCompleted]);

  // Show notification prompt on every load when permission is still 'default'
  useEffect(() => {
    if (!isSupported || permission !== "default") return;
    // Don't show during intro
    if (introActive) return;
    const timer = setTimeout(() => setShowNotifPrompt(true), 3000);
    return () => clearTimeout(timer);
  }, [isSupported, permission, introActive]);

  const handleInstallClick = useCallback(() => {
    if (isInstalled || isStandalone) return;
    if (isIOS) {
      setShowIOSModal(true);
    } else {
      setShowModal(true);
    }
  }, [isIOS, isInstalled, isStandalone]);

  const handleInstall = useCallback(async () => {
    if (isIOS) {
      setShowModal(false);
      setShowIOSModal(true);
      return;
    }
    const installed = await triggerInstall();
    if (installed) {
      setShowModal(false);
    }
  }, [isIOS, triggerInstall]);

  const handleModalClose = (open: boolean) => {
    if (!open) {
      setShowModal(false);
      localStorage.setItem(MODAL_DISMISS_KEY, "true");
    }
  };

  const handleNotifEnable = async () => {
    await requestPermission();
    setShowNotifPrompt(false);
  };

  const handleNotifClose = (open: boolean) => {
    if (!open) {
      setShowNotifPrompt(false);
      // Don't permanently dismiss — will re-show next load if still 'default'
    }
  };

  const handleIntroDone = () => {
    setIntroActive(false);
    if (user) {
      // Already signed in — start tour immediately
      navigate("/programs");
      setTimeout(() => startTour("intro"), 600);
    } else {
      // Not signed in — save pending flag and redirect to auth
      localStorage.setItem("onboarding_pending", "true");
      localStorage.setItem("onboarding_scenario", "intro");
      navigate("/auth", { state: { redirectTo: "/programs" } });
    }
  };

  const handleIntroSkip = () => {
    setIntroActive(false);
    if (user) {
      navigate("/");
      setTimeout(() => startTour("landing"), 600);
    } else {
      localStorage.setItem("onboarding_pending", "true");
      localStorage.setItem("onboarding_scenario", "landing");
      navigate("/");
    }
  };

  if (!introChecked) return null;

  return (
    <>
      {introActive && <FeatureIntroPopup onDone={handleIntroDone} onSkip={handleIntroSkip} forceOpen />}
      {!introActive && !isInstalled && !isStandalone && tourCompleted === true && (
        <InstallBanner onInstallClick={handleInstallClick} />
      )}
      <InstallModal open={showModal} onOpenChange={handleModalClose} onInstall={handleInstall} />
      <IOSInstallGuide open={showIOSModal} onOpenChange={setShowIOSModal} />
      <NotificationPrompt open={showNotifPrompt} onOpenChange={handleNotifClose} onEnable={handleNotifEnable} />
    </>
  );
}
