import { useEffect, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";

const STORAGE_KEY = "suryaFitLastActivity";
const INACTIVITY_THRESHOLD = 3600000; // 1 hour
const DEBOUNCE_MS = 30000; // 30 seconds

export default function InactivityRedirect({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Check on mount if user was inactive > 1 hour
  useEffect(() => {
    const last = localStorage.getItem(STORAGE_KEY);
    if (last && Date.now() - Number(last) > INACTIVITY_THRESHOLD && location.pathname !== "/") {
      navigate("/", { replace: true });
    }
    // Always update on mount
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
