import { useState, useEffect, useCallback } from "react";
import { usePWAInstall } from "@/hooks/usePWAInstall";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import InstallBanner from "./InstallBanner";
import InstallModal from "./InstallModal";
import IOSInstallGuide from "./IOSInstallGuide";
import NotificationPrompt from "./NotificationPrompt";

const MODAL_DISMISS_KEY = "fitai-install-modal-dismissed";
const NOTIF_PROMPT_KEY = "fitai-notif-prompt-dismissed";
const PAGE_VISIT_KEY = "fitai-page-visits";

export default function PWAManager() {
  const { canPrompt, isInstalled, isIOS, showIOSGuide, triggerInstall, isStandalone } = usePWAInstall();
  const { permission, isSupported, requestPermission } = usePushNotifications();

  const [showModal, setShowModal] = useState(false);
  const [showIOSModal, setShowIOSModal] = useState(false);
  const [showNotifPrompt, setShowNotifPrompt] = useState(false);

  // Track page visits for trigger C (3 pages)
  useEffect(() => {
    const visits = parseInt(localStorage.getItem(PAGE_VISIT_KEY) || "0", 10) + 1;
    localStorage.setItem(PAGE_VISIT_KEY, visits.toString());

    if (visits >= 3 && !isInstalled && !isStandalone && !localStorage.getItem(MODAL_DISMISS_KEY)) {
      setTimeout(() => setShowModal(true), 1000);
    }
  }, [isInstalled, isStandalone]);

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
    } else if (canPrompt) {
      setShowModal(true);
    } else {
      // Fallback: show modal with instructions
      setShowModal(true);
    }
  }, [isIOS, canPrompt, isInstalled, isStandalone]);

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

  if (isInstalled && isStandalone && permission !== "default") return null;

  return (
    <>
      {!isInstalled && !isStandalone && (
        <InstallBanner onInstallClick={handleInstallClick} />
      )}
      <InstallModal open={showModal} onOpenChange={handleModalClose} onInstall={handleInstall} />
      <IOSInstallGuide open={showIOSModal} onOpenChange={setShowIOSModal} />
      <NotificationPrompt open={showNotifPrompt} onOpenChange={handleNotifClose} onEnable={handleNotifEnable} />
    </>
  );
}
