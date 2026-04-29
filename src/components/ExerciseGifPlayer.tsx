import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { Skeleton } from "@/components/ui/skeleton";
import { Dumbbell } from "lucide-react";

interface ExerciseGifPlayerProps {
  exerciseName: string;
}

// Only strip parenthetical qualifiers and trim. Preserve case and hyphens
// so curated keys like "T-Bar Row" still match STATIC_GIF_MAP exactly.
function stripParens(name: string): string {
  return name.replace(/\s*\([^)]*\)/g, "").trim();
}

export default function ExerciseGifPlayer({ exerciseName }: ExerciseGifPlayerProps) {
  const [gifUrl, setGifUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [error, setError] = useState(false);
  const { lang } = useLanguage();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    setGifUrl(null);
    setImgLoaded(false);

    async function tryLookup(term: string) {
      console.log("[ExerciseGifPlayer] trying lookup with term:", term);
      const { data, error: fnError } = await supabase.functions.invoke("exercise-gif-lookup", {
        body: { exerciseName: term },
      });
      console.log("[ExerciseGifPlayer] result for term", term, ":", { data, fnError });
      if (fnError) return null;
      return data?.gifUrl ?? null;
    }

    async function fetchGif() {
      try {
        const original = exerciseName;
        const stripped = stripParens(exerciseName);
        const lower = original.toLowerCase();
        console.log("[ExerciseGifPlayer] received exerciseName:", original, "| stripped:", stripped, "| lower:", lower);

        // 1. Original name as-is
        let url = await tryLookup(original);

        // 2. Parentheses stripped
        if (!url && stripped && stripped !== original) {
          url = await tryLookup(stripped);
        }

        // 3. Lowercase fallback (lets edge function hit normalized map / API)
        if (!url && lower !== original) {
          url = await tryLookup(lower);
        }

        if (cancelled) return;

        if (!url) {
          console.warn("[ExerciseGifPlayer] no gifUrl returned for", exerciseName);
          setGifUrl(null);
          setError(true);
        } else {
          console.log("[ExerciseGifPlayer] will fetch URL:", url);
          setGifUrl(url);
        }
      } catch (e) {
        console.error("[ExerciseGifPlayer] fetch error for", exerciseName, e);
        if (!cancelled) {
          setGifUrl(null);
          setError(true);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchGif();
    return () => { cancelled = true; };
  }, [exerciseName]);

  const handleImgError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    console.error("[ExerciseGifPlayer] <img> failed to load", {
      exerciseName,
      attemptedUrl: gifUrl,
      naturalWidth: (e.currentTarget as HTMLImageElement).naturalWidth,
    });
    setError(true);
    setGifUrl(null);
  };

  const loadingText = lang === "id" ? "Memuat demo..." : lang === "zh" ? "加载演示中..." : "Loading demo...";
  const errorText = lang === "id" ? "Demo segera hadir" : lang === "zh" ? "演示即将推出" : "Demo coming soon";
  const coachLabel = lang === "id" ? "Demo Coach Surya" : lang === "zh" ? "Surya教练演示" : "Coach Surya's Demo";
  const watchText = lang === "id" ? "Perhatikan form dan teknik yang benar" : lang === "zh" ? "观察正确的姿势和技巧" : "Watch the correct form and technique";

  if (loading) {
    return (
      <div className="w-full rounded-xl overflow-hidden border border-border/30">
        <div className="px-3 pt-3 mb-1">
          <Skeleton className="h-4 w-40" />
        </div>
        <div className="px-3 mb-2">
          <Skeleton className="h-3 w-56 mt-1" />
        </div>
        <div className="mx-3 rounded-lg overflow-hidden">
          <Skeleton className="aspect-square w-full" />
        </div>
        <div className="py-2 flex justify-center">
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
    );
  }

  if (error || !gifUrl) {
    return (
      <div className="w-full rounded-xl overflow-hidden border border-border/30">
        <div className="flex items-center gap-1.5 px-3 pt-3 mb-1">
          <span className="text-primary text-xs font-semibold">{coachLabel}</span>
        </div>
        <div className="relative aspect-square bg-black/80 mx-3 rounded-lg overflow-hidden flex flex-col items-center justify-center gap-3">
          <Dumbbell size={48} style={{ color: "#ff6b00" }} strokeWidth={2} />
          <p className="text-muted-foreground text-sm text-center px-6 leading-relaxed">{errorText}</p>
        </div>
        <div className="py-2" />
      </div>
    );
  }

  return (
    <div className="w-full rounded-xl overflow-hidden border border-border/30">
      <div className="flex items-center gap-1.5 px-3 pt-3 mb-1">
        <span className="text-primary text-xs font-semibold">{coachLabel}</span>
      </div>
      <p className="text-muted-foreground text-xs px-3 mb-2">{watchText}</p>
      <div className="relative aspect-square bg-black mx-3 rounded-lg overflow-hidden">
        {!imgLoaded && (
          <Skeleton className="absolute inset-0 w-full h-full rounded-none" />
        )}
        <img
          src={gifUrl}
          alt={`${exerciseName} demonstration`}
          className={`w-full h-full object-cover transition-opacity duration-200 ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
          loading="eager"
          fetchPriority="high"
          onLoad={() => setImgLoaded(true)}
          onError={handleImgError}
        />
      </div>
      <p className="text-muted-foreground/60 text-[10px] text-center py-2">Source: ExerciseDB</p>
    </div>
  );
}
