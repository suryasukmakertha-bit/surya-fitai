import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { useTour } from "@/contexts/OnboardingTourContext";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  INTRO_TOUR_STEPS,
  LANDING_TOUR_STEPS,
  TOUR_UI,
  type TourStepDef,
} from "./tourSteps";

function matchesPath(pathname: string, step: TourStepDef): boolean {
  if (step.pathExact) return pathname === step.pathPattern;
  return pathname.startsWith(step.pathPattern);
}

function findVisibleTarget(target: string): HTMLElement | null {
  const elements = document.querySelectorAll<HTMLElement>(
    `[data-tour="${target}"]`
  );
  for (const el of elements) {
    const rect = el.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) return el;
  }
  return null;
}

export default function TourOverlay() {
  const { tourState, nextStep, skipTour } = useTour();
  const { lang } = useLanguage();
  const location = useLocation();
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const targetRef = useRef<HTMLElement | null>(null);
  const [exploring, setExploring] = useState(false);
  const prevLangRef = useRef(lang);
  const advancedRef = useRef(false);

  const steps =
    tourState?.scenario === "intro" ? INTRO_TOUR_STEPS : LANDING_TOUR_STEPS;
  const currentStep = tourState?.active ? steps[tourState.stepIndex] : null;
  const isOnCorrectPage = currentStep
    ? matchesPath(location.pathname, currentStep)
    : false;
  const isLastStep = tourState
    ? tourState.stepIndex === steps.length - 1
    : false;

  // Reset exploring state when step changes
  useEffect(() => {
    setExploring(false);
    advancedRef.current = false;
  }, [tourState?.stepIndex]);

  // Find and scroll to target element
  useEffect(() => {
    setTargetRect(null);
    targetRef.current = null;

    if (!tourState?.active || !currentStep || !isOnCorrectPage) return;

    let attempts = 0;
    const maxAttempts = 25;
    let cancelled = false;
    let findTimer: ReturnType<typeof setTimeout>;

    const findAndPosition = () => {
      if (cancelled) return;
      const el = findVisibleTarget(currentStep.target);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        setTimeout(() => {
          if (cancelled) return;
          setTargetRect(el.getBoundingClientRect());
          targetRef.current = el;
        }, 400);
      } else if (attempts < maxAttempts) {
        attempts++;
        findTimer = setTimeout(findAndPosition, 200);
      } else if (currentStep.optional) {
        nextStep();
      }
    };

    findTimer = setTimeout(findAndPosition, 150);
    return () => {
      cancelled = true;
      clearTimeout(findTimer);
    };
  }, [currentStep?.id, isOnCorrectPage, location.pathname, tourState?.active, tourState?.stepIndex]);

  // Update rect on scroll/resize
  useEffect(() => {
    if (!targetRef.current || !targetRect) return;
    const update = () => {
      if (targetRef.current) setTargetRect(targetRef.current.getBoundingClientRect());
    };
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [!!targetRect]);

  // Auto-advance: language change
  useEffect(() => {
    if (!currentStep || currentStep.advanceOn !== "lang-change") return;
    if (prevLangRef.current !== lang && targetRect) {
      nextStep();
    }
    prevLangRef.current = lang;
  }, [lang, currentStep?.advanceOn, targetRect]);

  // Auto-advance: click on target element
  useEffect(() => {
    if (!currentStep || !targetRef.current || !targetRect) return;
    if (currentStep.advanceOn !== "click" && currentStep.advanceOn !== "click-explore" && currentStep.advanceOn !== "finish") return;

    const el = targetRef.current;
    const handler = () => {
      if (advancedRef.current) return;
      if (currentStep.advanceOn === "click-explore") {
        setExploring(true);
      } else if (currentStep.advanceOn === "click") {
        advancedRef.current = true;
        setTimeout(() => nextStep(), 300);
      }
      // "finish" type: click completes tour (handled by finish button or click)
      if (currentStep.advanceOn === "finish") {
        advancedRef.current = true;
        setTimeout(() => skipTour(), 300);
      }
    };

    el.addEventListener("click", handler, { capture: true });
    return () => el.removeEventListener("click", handler, { capture: true });
  }, [currentStep?.id, currentStep?.advanceOn, targetRect, nextStep, skipTour]);

  const handleContinue = useCallback(() => {
    nextStep();
  }, [nextStep]);

  const handleFinish = useCallback(() => {
    skipTour();
  }, [skipTour]);

  if (!tourState?.active || !currentStep || !isOnCorrectPage || !targetRect) return null;

  const padding = 8;
  const tooltipWidth = Math.min(320, window.innerWidth - 24);
  const spaceBelow = window.innerHeight - targetRect.bottom;
  const showBelow = spaceBelow > 220;

  const tooltipLeft = Math.max(
    12,
    Math.min(
      window.innerWidth - tooltipWidth - 12,
      targetRect.left + targetRect.width / 2 - tooltipWidth / 2
    )
  );

  const showContinueButton =
    (currentStep.advanceOn === "click-explore" && exploring) ||
    currentStep.advanceOn === "continue";

  const showFinishButton = currentStep.advanceOn === "finish" && !exploring;

  return (
    <>
      {/* Dark overlay with spotlight cutout — pointer-events: none so clicks pass through */}
      <div
        className="fixed z-[9997] rounded-lg pointer-events-none transition-all duration-300"
        style={{
          top: targetRect.top - padding,
          left: targetRect.left - padding,
          width: targetRect.width + padding * 2,
          height: targetRect.height + padding * 2,
          boxShadow:
            "0 0 0 9999px rgba(0,0,0,0.6), 0 0 24px 6px rgba(34,197,94,0.35)",
          border: "2px solid rgba(34,197,94,0.6)",
        }}
      />

      {/* Skip Tour — top right */}
      <button
        onClick={skipTour}
        className="fixed z-[10001] top-4 right-4 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
        style={{
          backgroundColor: "rgba(0,0,0,0.7)",
          color: "#9ca3af",
          border: "1px solid rgba(255,255,255,0.1)",
        }}
      >
        {TOUR_UI.skip[lang]}
      </button>

      {/* Tooltip */}
      <div
        className="fixed z-[10000] pointer-events-auto transition-all duration-300"
        style={{
          width: tooltipWidth,
          left: tooltipLeft,
          ...(showBelow
            ? { top: targetRect.bottom + padding + 16 }
            : { bottom: window.innerHeight - targetRect.top + padding + 16 }),
        }}
      >
        <div
          className="p-4 rounded-xl shadow-2xl"
          style={{
            backgroundColor: "#121216",
            border: "1px solid rgba(34,197,94,0.4)",
          }}
        >
          <div className="text-[10px] font-medium mb-1" style={{ color: "rgba(34,197,94,0.6)" }}>
            {tourState.stepIndex + 1} / {steps.length}
          </div>
          <h3 className="text-sm font-bold text-white mb-1">
            {currentStep.title[lang]}
          </h3>
          <p className="text-xs leading-relaxed mb-2" style={{ color: "#9ca3af" }}>
            {currentStep.explanation[lang]}
          </p>
          {currentStep.subHint && exploring && (
            <p className="text-[10px] italic mb-2" style={{ color: "rgba(34,197,94,0.7)" }}>
              💡 {currentStep.subHint[lang]}
            </p>
          )}

          {/* Progress dots */}
          <div className="flex justify-center gap-1 mt-2">
            {steps.map((_, i) => (
              <div
                key={i}
                className="w-1.5 h-1.5 rounded-full transition-colors"
                style={{
                  backgroundColor:
                    i === tourState.stepIndex
                      ? "hsl(135,70%,50%)"
                      : i < tourState.stepIndex
                      ? "hsl(135,40%,30%)"
                      : "#374151",
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Floating Continue Tour / Finish Tour button */}
      {showContinueButton && (
        <button
          onClick={handleContinue}
          className="fixed z-[10001] bottom-6 left-1/2 -translate-x-1/2 px-5 py-2 rounded-full text-sm font-semibold text-white shadow-lg transition-opacity hover:opacity-90 pointer-events-auto"
          style={{ backgroundColor: "hsl(135,70%,40%)" }}
        >
          {isLastStep ? TOUR_UI.finishTour[lang] : TOUR_UI.continueTour[lang]}
        </button>
      )}

      {showFinishButton && (
        <button
          onClick={handleFinish}
          className="fixed z-[10001] bottom-6 left-1/2 -translate-x-1/2 px-5 py-2 rounded-full text-sm font-semibold text-white shadow-lg transition-opacity hover:opacity-90 pointer-events-auto"
          style={{ backgroundColor: "hsl(135,70%,40%)" }}
        >
          {TOUR_UI.finishTour[lang]}
        </button>
      )}
    </>
  );
}
