import { useState, useEffect, useCallback, useRef } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export type DeviceType = "android" | "ios" | "desktop";

function detectDevice(): DeviceType {
  const ua = navigator.userAgent.toLowerCase();
  if (/ipad|iphone|ipod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)) {
    return "ios";
  }
  if (/android/.test(ua)) {
    return "android";
  }
  return "desktop";
}

/** Device-level only check — no user/account dependency */
export function isPwaInstalled(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as any).standalone === true ||
    document.documentElement.classList.contains("standalone")
  );
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(isPwaInstalled);
  const [device] = useState<DeviceType>(detectDevice);
  const promptRef = useRef<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    // Reset backup flag if not actually installed (handles uninstall)
    if (!isPwaInstalled()) {
      localStorage.removeItem("pwaInstalled");
    }

    // Re-check standalone on display-mode change
    const mq = window.matchMedia("(display-mode: standalone)");
    const handler = () => {
      const installed = isPwaInstalled();
      setIsStandalone(installed);
      if (!installed) localStorage.removeItem("pwaInstalled");
    };
    mq.addEventListener?.("change", handler);

    // Listen for beforeinstallprompt (Android/Desktop Chrome)
    const promptHandler = (e: Event) => {
      e.preventDefault();
      const evt = e as BeforeInstallPromptEvent;
      promptRef.current = evt;
      setDeferredPrompt(evt);
    };
    window.addEventListener("beforeinstallprompt", promptHandler);

    // Listen for appinstalled — backup flag only
    const installedHandler = () => {
      localStorage.setItem("pwaInstalled", "true");
      setIsStandalone(true);
      setDeferredPrompt(null);
      promptRef.current = null;
    };
    window.addEventListener("appinstalled", installedHandler);

    return () => {
      mq.removeEventListener?.("change", handler);
      window.removeEventListener("beforeinstallprompt", promptHandler);
      window.removeEventListener("appinstalled", installedHandler);
    };
  }, []);

  const triggerInstall = useCallback(async () => {
    const prompt = promptRef.current;
    if (!prompt) return false;
    await prompt.prompt();
    const result = await prompt.userChoice;
    if (result.outcome === "accepted") {
      localStorage.setItem("pwaInstalled", "true");
      setIsStandalone(true);
      return true;
    }
    return false;
  }, []);

  const canPrompt = !!deferredPrompt && !isStandalone;
  const isIOS = device === "ios";

  return { canPrompt, isInstalled: isStandalone, isIOS, device, triggerInstall, isStandalone };
}
