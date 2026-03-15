import { useState, useEffect, useCallback, useRef } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const promptRef = useRef<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    // Check if already installed
    const standalone = window.matchMedia("(display-mode: standalone)").matches
      || (navigator as any).standalone === true;
    setIsStandalone(standalone);
    setIsInstalled(standalone || localStorage.getItem("fitai-pwa-installed") === "true");

    // Detect iOS
    const ua = navigator.userAgent;
    const ios = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    setIsIOS(ios);

    // Listen for beforeinstallprompt (Android/Desktop Chrome)
    const handler = (e: Event) => {
      e.preventDefault();
      const evt = e as BeforeInstallPromptEvent;
      promptRef.current = evt;
      setDeferredPrompt(evt);
    };
    window.addEventListener("beforeinstallprompt", handler);

    // Listen for appinstalled
    const installedHandler = () => {
      setIsInstalled(true);
      localStorage.setItem("fitai-pwa-installed", "true");
      setDeferredPrompt(null);
      promptRef.current = null;
    };
    window.addEventListener("appinstalled", installedHandler);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", installedHandler);
    };
  }, []);

  const triggerInstall = useCallback(async () => {
    const prompt = promptRef.current;
    if (!prompt) return false;
    await prompt.prompt();
    const result = await prompt.userChoice;
    if (result.outcome === "accepted") {
      setIsInstalled(true);
      localStorage.setItem("fitai-pwa-installed", "true");
      return true;
    }
    return false;
  }, []);

  const canPrompt = !!deferredPrompt && !isInstalled;
  const showIOSGuide = isIOS && !isInstalled && !isStandalone;

  return { canPrompt, isInstalled, isIOS, showIOSGuide, triggerInstall, isStandalone };
}
