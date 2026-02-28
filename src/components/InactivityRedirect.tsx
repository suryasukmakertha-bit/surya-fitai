import { useEffect, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";

const STORAGE_KEY = "suryaFitLastActivity";
const SESSION_KEY = "suryaFitSessionActive";
const INACTIVITY_THRESHOLD = 3600000; // 1 hour
const DEBOUNCE_MS = 30000; // 30 seconds

export default function InactivityRedirect({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // On every fresh page load (new tab / refresh), redirect to homepage
  useEffect(() => {
    const isExistingSession = sessionStorage.getItem(SESSION_KEY);
    if (!isExistingSession && location.pathname !== "/") {
      sessionStorage.setItem(SESSION_KEY, "1");
      navigate("/", { replace: true });
      return;
    }
    sessionStorage.setItem(SESSION_KEY, "1");

    // Also check inactivity
    const last = localStorage.getItem(STORAGE_KEY);
    if (last && Date.now() - Number(last) > INACTIVITY_THRESHOLD && location.pathname !== "/") {
      navigate("/", { replace: true });
    }
    localStorage.setItem(STORAGE_KEY, String(Date.now()));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const updateActivity = useCallback(() => {
    if (timerRef.current) return;
    localStorage.setItem(STORAGE_KEY, String(Date.now()));
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
    }, DEBOUNCE_MS);
  }, []);

  useEffect(() => {
    const events = ["mousemove", "click", "keydown", "scroll", "touchstart"] as const;
    events.forEach((e) => window.addEventListener(e, updateActivity, { passive: true }));
    return () => {
      events.forEach((e) => window.removeEventListener(e, updateActivity));
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [updateActivity]);

  return <>{children}</>;
}
