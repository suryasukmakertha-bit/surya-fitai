import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { INTRO_TOUR_STEPS, LANDING_TOUR_STEPS, type TourScenario } from "@/components/tour/tourSteps";

const TOUR_STATE_KEY = "fitai-tour-state";
const SPECIAL_EMAIL = "surya.sukmakertha@gmail.com";

interface TourState {
  active: boolean;
  scenario: TourScenario;
  stepIndex: number;
}

interface TourContextType {
  tourState: TourState | null;
  tourCompleted: boolean | null;
  startTour: (scenario: TourScenario) => void;
  nextStep: () => void;
  skipTour: () => void;
}

const TourContext = createContext<TourContextType | undefined>(undefined);

export function OnboardingTourProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [tourState, setTourState] = useState<TourState | null>(null);
  const [tourCompleted, setTourCompleted] = useState<boolean | null>(null);

  // Check DB for completion status
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setTourCompleted(false);
      return;
    }
    if (user.email?.toLowerCase() === SPECIAL_EMAIL.toLowerCase()) {
      setTourCompleted(true);
      return;
    }

    supabase
      .from("onboarding_progress" as any)
      .select("completed")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }: any) => {
        setTourCompleted(data?.completed ?? false);
      });
  }, [user, authLoading]);

  // Restore from sessionStorage
  useEffect(() => {
    const stored = sessionStorage.getItem(TOUR_STATE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed?.active) setTourState(parsed);
      } catch {}
    }
  }, []);

  // Persist to sessionStorage
  useEffect(() => {
    if (tourState?.active) {
      sessionStorage.setItem(TOUR_STATE_KEY, JSON.stringify(tourState));
    } else {
      sessionStorage.removeItem(TOUR_STATE_KEY);
    }
  }, [tourState]);

  const completeTour = useCallback(async () => {
    setTourState(null);
    setTourCompleted(true);
    sessionStorage.removeItem(TOUR_STATE_KEY);
    if (user) {
      await supabase
        .from("onboarding_progress" as any)
        .upsert(
          {
            user_id: user.id,
            completed: true,
            completed_at: new Date().toISOString(),
          } as any,
          { onConflict: "user_id" }
        );
    }
  }, [user]);

  const startTour = useCallback(
    (scenario: TourScenario) => {
      if (tourCompleted) return;
      setTourState({ active: true, scenario, stepIndex: 0 });
    },
    [tourCompleted]
  );

  const nextStep = useCallback(() => {
    if (!tourState) return;
    const steps =
      tourState.scenario === "intro" ? INTRO_TOUR_STEPS : LANDING_TOUR_STEPS;
    if (tourState.stepIndex + 1 >= steps.length) {
      completeTour();
    } else {
      setTourState({ ...tourState, stepIndex: tourState.stepIndex + 1 });
    }
  }, [tourState, completeTour]);

  const skipTour = useCallback(() => {
    completeTour();
  }, [completeTour]);

  return (
    <TourContext.Provider
      value={{ tourState, tourCompleted, startTour, nextStep, skipTour }}
    >
      {children}
    </TourContext.Provider>
  );
}

export function useTour() {
  const ctx = useContext(TourContext);
  if (!ctx)
    throw new Error("useTour must be used within OnboardingTourProvider");
  return ctx;
}
