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
  const cleanupRef = useRef<(() => void) | null>(null);

  const steps =
    tourState?.scenario === "intro" ? INTRO_TOUR_STEPS : LANDING_TOUR_STEPS;
  const currentStep = tourState?.active ? steps[tourState.stepIndex] : null;
  const isOnCorrectPage = currentStep
    ? matchesPath(location.pathname, currentStep)
    : false;
  const isLastStep = tourState
    ? tourState.stepIndex === steps.length - 1
    : false;

  // Cleanup previous target styling
  const cleanupTarget = useCallback(() => {
    if (cleanupRef.current) {
      cleanupRef.current();
      cleanupRef.current = null;
    }
  }, []);

  // Find and highlight target element
  useEffect(() => {
    cleanupTarget();
    setTargetRect(null);

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
          const rect = el.getBoundingClientRect();
          setTargetRect(rect);
          targetRef.current = el;

          // Elevate target above overlay
          const origPosition = el.style.position;
          const origZIndex = el.style.zIndex;
          const origPointerEvents = el.style.pointerEvents;
          el.style.position = "relative";
          el.style.zIndex = "9999";
          el.style.pointerEvents = "auto";

          cleanupRef.current = () => {
            el.style.position = origPosition;
            el.style.zIndex = origZIndex;
            el.style.pointerEvents = origPointerEvents;
          };
        }, 400);
      } else if (attempts < maxAttempts) {
        attempts++;
        findTimer = setTimeout(findAndPosition, 200);
      } else if (currentStep.optional) {
        // Skip optional steps whose target doesn't exist
        nextStep();
      }
    };

    findTimer = setTimeout(findAndPosition, 150);

    return () => {
      cancelled = true;
      clearTimeout(findTimer);
      cleanupTarget();
    };
  }, [
    currentStep?.id,
    isOnCorrectPage,
    location.pathname,
    tourState?.active,
    tourState?.stepIndex,
  ]);

  // Update rect on scroll/resize
  useEffect(() => {
    if (!targetRef.current || !targetRect) return;

    const update = () => {
      if (targetRef.current) {
        setTargetRect(targetRef.current.getBoundingClientRect());
      }
    };

    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [!!targetRect]);

  if (!tourState?.active || !currentStep || !isOnCorrectPage || !targetRect)
    return null;

  const padding = 8;
  const tooltipWidth = Math.min(320, window.innerWidth - 24);

  // Determine if tooltip should go above or below
  const spaceBelow = window.innerHeight - targetRect.bottom;
  const showBelow = spaceBelow > 220;

  const tooltipLeft = Math.max(
    12,
    Math.min(
      window.innerWidth - tooltipWidth - 12,
      targetRect.left + targetRect.width / 2 - tooltipWidth / 2
    )
  );

  return (
    <>
      {/* Click blocker */}
      <div
        className="fixed inset-0 z-[9996]"
        onClick={(e) => e.stopPropagation()}
      />

      {/* Spotlight + dark overlay via box-shadow */}
      <div
        className="fixed z-[9997] rounded-lg pointer-events-none transition-all duration-300"
        style={{
          top: targetRect.top - padding,
          left: targetRect.left - padding,
          width: targetRect.width + padding * 2,
          height: targetRect.height + padding * 2,
          boxShadow:
            "0 0 0 9999px rgba(0,0,0,0.75), 0 0 24px 6px rgba(34,197,94,0.35)",
          border: "2px solid rgba(34,197,94,0.6)",
        }}
      />

      {/* Tooltip */}
      <div
        className="fixed z-[10000] transition-all duration-300"
        style={{
          width: tooltipWidth,
          left: tooltipLeft,
          ...(showBelow
            ? { top: targetRect.bottom + padding + 16 }
            : {
                bottom:
                  window.innerHeight - targetRect.top + padding + 16,
              }),
        }}
      >
        <div
          className="p-4 rounded-xl shadow-2xl"
          style={{
            backgroundColor: "#121216",
            border: "1px solid rgba(34,197,94,0.4)",
          }}
        >
          {/* Step counter */}
          <div className="text-[10px] font-medium mb-1" style={{ color: "rgba(34,197,94,0.6)" }}>
            {tourState.stepIndex + 1} / {steps.length}
          </div>

          <h3 className="text-sm font-bold text-white mb-1">
            {currentStep.title[lang]}
          </h3>
          <p className="text-xs leading-relaxed mb-4" style={{ color: "#9ca3af" }}>
            {currentStep.explanation[lang]}
          </p>

          {/* Buttons */}
          <div className="flex items-center justify-between">
            <button
              onClick={skipTour}
              className="text-xs transition-colors"
              style={{ color: "#6b7280" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#d1d5db")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#6b7280")}
            >
              {TOUR_UI.skip[lang]}
            </button>
            <button
              onClick={nextStep}
              className="px-4 py-1.5 rounded-lg text-xs font-semibold text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: "hsl(135,70%,40%)" }}
            >
              {isLastStep ? TOUR_UI.done[lang] : TOUR_UI.next[lang]}
            </button>
          </div>

          {/* Progress dots */}
          <div className="flex justify-center gap-1 mt-3">
            {steps.map((_, i) => (
              <div
                key={i}
                className="w-1.5 h-1.5 rounded-full transition-colors"
                style={{
                  backgroundColor:
                    i === tourState.stepIndex
                      ? "hsl(135,70%,50%)"
                      : "#374151",
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
