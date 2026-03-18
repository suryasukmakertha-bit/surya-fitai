import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { usePWAInstall } from "@/hooks/usePWAInstall";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useAuth } from "@/contexts/AuthContext";
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

  const [showModal, setShowModal] = useState(false);
  const [showIOSModal, setShowIOSModal] = useState(false);
  const [showNotifPrompt, setShowNotifPrompt] = useState(false);
  const [introActive, setIntroActive] = useState(false);
  const [introChecked, setIntroChecked] = useState(false);

  // Check if intro should show — based on backend saved plans count
  useEffect(() => {
    if (authLoading) return;

    const seen = localStorage.getItem(INTRO_SEEN_KEY) === "true";
    if (seen) {
      setIntroActive(false);
      setIntroChecked(true);
      return;
    }

    if (!user) {
      // Not logged in — show intro for new visitors
      const hasPlan = localStorage.getItem("fitai-has-created-plan") === "true";
      setIntroActive(!hasPlan);
      setIntroChecked(true);
      return;
    }

    // Logged in — check backend for saved plans
    supabase
      .from("saved_plans")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .then(({ count }) => {
        if (count === 0 || count === null) {
          // Zero plans — show intro
          setIntroActive(true);
        } else {
          // Has plans — mark as seen so we don't check again
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

  // Show notification prompt after install
  useEffect(() => {
    if (isInstalled && isSupported && permission === "default" && !localStorage.getItem(NOTIF_PROMPT_KEY)) {
      const timer = setTimeout(() => setShowNotifPrompt(true), 3000);
      return () => clearTimeout(timer);
    }
  }, [isInstalled, isSupported, permission]);

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
    localStorage.setItem(NOTIF_PROMPT_KEY, "true");
  };

  const handleNotifClose = (open: boolean) => {
    if (!open) {
      setShowNotifPrompt(false);
      localStorage.setItem(NOTIF_PROMPT_KEY, "true");
    }
  };

  const handleIntroDone = () => {
    setIntroActive(false);
    navigate("/programs");
  };

  if (!introChecked) return null;
  if (isInstalled && isStandalone && permission !== "default" && !introActive) return null;

  return (
    <>
      {introActive && <FeatureIntroPopup onDone={handleIntroDone} />}
      {!introActive && !isInstalled && !isStandalone && (
        <InstallBanner onInstallClick={handleInstallClick} />
      )}
      <InstallModal open={showModal} onOpenChange={handleModalClose} onInstall={handleInstall} />
      <IOSInstallGuide open={showIOSModal} onOpenChange={setShowIOSModal} />
      <NotificationPrompt open={showNotifPrompt} onOpenChange={handleNotifClose} onEnable={handleNotifEnable} />
    </>
  );
}
