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
  useEffect(() => {
    if (authLoading) return;

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

  // Track page visits for install modal trigger — delay if intro is active
  useEffect(() => {
    if (introActive || !introChecked) return;
    const visits = parseInt(localStorage.getItem(PAGE_VISIT_KEY) || "0", 10) + 1;
    localStorage.setItem(PAGE_VISIT_KEY, visits.toString());

    if (visits >= 3 && !isInstalled && !isStandalone && !localStorage.getItem(MODAL_DISMISS_KEY)) {
      setTimeout(() => setShowModal(true), 1000);
    }
  }, [isInstalled, isStandalone, introActive, introChecked]);

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
    navigate("/programs");
  };

  const handleIntroSkip = () => {
    setIntroActive(false);
    navigate("/");
  };

  if (!introChecked) return null;

  return (
    <>
      {introActive && <FeatureIntroPopup onDone={handleIntroDone} onSkip={handleIntroSkip} forceOpen />}
      {!introActive && !isInstalled && !isStandalone && (
        <InstallBanner onInstallClick={handleInstallClick} />
      )}
      <InstallModal open={showModal} onOpenChange={handleModalClose} onInstall={handleInstall} />
      <IOSInstallGuide open={showIOSModal} onOpenChange={setShowIOSModal} />
      <NotificationPrompt open={showNotifPrompt} onOpenChange={handleNotifClose} onEnable={handleNotifEnable} />
    </>
  );
}
