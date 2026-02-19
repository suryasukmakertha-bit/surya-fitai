import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { ChevronRight, ChevronLeft, X, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

const TOUR_STORAGE_KEY = "surya-fitai-tour-completed";

export interface TourStep {
  /** CSS selector for the element to highlight. If null, show centered modal */
  selector: string | null;
  titleKey: string;
  textKey: string;
  /** Which page this step lives on */
  page: string;
}

const TOUR_STEPS: TourStep[] = [
  { selector: null, titleKey: "tourWelcomeTitle", textKey: "tourWelcomeText", page: "/" },
  { selector: "[data-tour='program-cards']", titleKey: "tourProgramTitle", textKey: "tourProgramText", page: "/programs" },
  { selector: "[data-tour='program-form']", titleKey: "tourFormTitle", textKey: "tourFormText", page: "/program" },
  { selector: "[data-tour='workout-plan']", titleKey: "tourWorkoutTitle", textKey: "tourWorkoutText", page: "/results" },
  { selector: "[data-tour='workout-checklist']", titleKey: "tourChecklistTitle", textKey: "tourChecklistText", page: "/results" },
  { selector: "[data-tour='progress-tracker']", titleKey: "tourProgressTitle", textKey: "tourProgressText", page: "/results" },
  { selector: "[data-tour='download-progress']", titleKey: "tourDownloadTitle", textKey: "tourDownloadText", page: "/results" },
];

interface TooltipPos {
  top: number;
  left: number;
  highlightRect: DOMRect | null;
}

function getPosition(selector: string | null): TooltipPos {
  if (!selector) return { top: 0, left: 0, highlightRect: null };
  const el = document.querySelector(selector);
  if (!el) return { top: 0, left: 0, highlightRect: null };
  const rect = el.getBoundingClientRect();
  return { top: rect.bottom + 12, left: Math.max(12, Math.min(rect.left, window.innerWidth - 320)), highlightRect: rect };
}

export function useTourState() {
  const [active, setActive] = useState(false);
  const [step, setStep] = useState(0);

  const startTour = useCallback(() => {
    setStep(0);
    setActive(true);
  }, []);

  const endTour = useCallback(() => {
    setActive(false);
    setStep(0);
    localStorage.setItem(TOUR_STORAGE_KEY, "true");
  }, []);

  // Auto-trigger on first visit
  useEffect(() => {
    const done = localStorage.getItem(TOUR_STORAGE_KEY);
    if (!done) {
      const timer = setTimeout(() => startTour(), 800);
      return () => clearTimeout(timer);
    }
  }, [startTour]);

  return { active, step, setStep, startTour, endTour, totalSteps: TOUR_STEPS.length };
}

/** Floating help button to restart tour */
export function TourHelpButton({ onClick }: { onClick: () => void }) {
  const { t } = useLanguage();
  return (
    <button
      onClick={onClick}
      className="fixed bottom-6 right-6 z-40 flex items-center gap-2 bg-primary text-primary-foreground rounded-full px-4 py-2.5 shadow-lg hover:scale-105 transition-transform text-sm font-medium"
      aria-label={t.tourHelp as string}
    >
      <HelpCircle className="w-4 h-4" />
      <span className="hidden sm:inline">{t.tourHelp}</span>
    </button>
  );
}

/** The overlay + tooltip portal */
export function TourOverlay({
  step,
  setStep,
  onEnd,
}: {
  step: number;
  setStep: (s: number) => void;
  onEnd: () => void;
}) {
  const { t } = useLanguage();
  const currentStep = TOUR_STEPS[step];
  const [pos, setPos] = useState<TooltipPos>({ top: 0, left: 0, highlightRect: null });
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Only show steps that match the current page
  const currentPath = window.location.pathname;
  const isStepVisible =
    currentStep.page === "/" ? currentPath === "/" :
    currentPath.startsWith(currentStep.page);

  useEffect(() => {
    if (!isStepVisible) return;
    const update = () => setPos(getPosition(currentStep.selector));
    update();
    // Wait a frame for DOM to settle
    const raf = requestAnimationFrame(update);
    window.addEventListener("resize", update);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", update);
    };
  }, [step, currentStep.selector, isStepVisible]);

  // Scroll highlighted element into view
  useEffect(() => {
    if (!isStepVisible || !currentStep.selector) return;
    const el = document.querySelector(currentStep.selector);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [step, isStepVisible, currentStep.selector]);

  if (!isStepVisible) return null;

  const isFirst = step === 0;
  const isLast = step === TOUR_STEPS.length - 1;
  const isCentered = !currentStep.selector || !pos.highlightRect;

  const title = (t as any)[currentStep.titleKey] || currentStep.titleKey;
  const text = (t as any)[currentStep.textKey] || currentStep.textKey;

  return createPortal(
    <div className="fixed inset-0 z-[9999]" role="dialog" aria-modal="true">
      {/* Dimmed overlay with cutout */}
      <div className="absolute inset-0 bg-black/60 transition-opacity duration-300" onClick={onEnd} />

      {/* Highlight glow */}
      {pos.highlightRect && (
        <div
          className="absolute rounded-lg border-2 border-primary/60 pointer-events-none transition-all duration-300"
          style={{
            top: pos.highlightRect.top - 6 + window.scrollY,
            left: pos.highlightRect.left - 6,
            width: pos.highlightRect.width + 12,
            height: pos.highlightRect.height + 12,
            boxShadow: "0 0 0 9999px rgba(0,0,0,0.6), 0 0 30px hsl(135 100% 60% / 0.3)",
            zIndex: 10000,
          }}
        />
      )}

      {/* Tooltip bubble */}
      <div
        ref={tooltipRef}
        className="absolute z-[10001] w-[min(320px,calc(100vw-32px))] animate-fade-in"
        style={
          isCentered
            ? { top: "50%", left: "50%", transform: "translate(-50%, -50%)" }
            : { top: pos.top + window.scrollY, left: pos.left }
        }
      >
        <div className="bg-card border border-border rounded-xl p-5 shadow-2xl">
          {/* Step indicator */}
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-muted-foreground font-medium">
              {step + 1} / {TOUR_STEPS.length}
            </span>
            <button onClick={onEnd} className="text-muted-foreground hover:text-foreground transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          <h3 className="font-display font-bold text-foreground text-lg mb-2">{title}</h3>
          <p className="text-sm text-muted-foreground leading-relaxed mb-5">{text}</p>

          <div className="flex items-center justify-between">
            <button
              onClick={onEnd}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {t.tourSkip}
            </button>
            <div className="flex items-center gap-2">
              {!isFirst && (
                <Button variant="ghost" size="sm" onClick={() => setStep(step - 1)}>
                  <ChevronLeft className="w-4 h-4 mr-1" /> {t.tourBack}
                </Button>
              )}
              {isFirst ? (
                <Button size="sm" onClick={() => setStep(step + 1)}>
                  {t.tourStartBtn} <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              ) : isLast ? (
                <Button size="sm" onClick={onEnd}>
                  {t.tourFinishBtn} <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              ) : (
                <Button size="sm" onClick={() => setStep(step + 1)}>
                  {t.tourNext} <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
