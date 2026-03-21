import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";

interface ExerciseGifPlayerProps {
  exerciseName: string;
}

function normalizeExerciseName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\(.*?\)/g, "")
    .replace(/[-–—]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export default function ExerciseGifPlayer({ exerciseName }: ExerciseGifPlayerProps) {
  const [gifUrl, setGifUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [fallbackAttempted, setFallbackAttempted] = useState(false);
  const { lang } = useLanguage();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    setGifUrl(null);
    setFallbackAttempted(false);

    async function fetchGif() {
      try {
        const searchTerm = normalizeExerciseName(exerciseName);
        // Use the exercise-gif-lookup function which has a static map + free API fallback
        const { data, error: fnError } = await supabase.functions.invoke("exercise-gif-lookup", {
          body: { exerciseName: searchTerm },
        });

        if (cancelled) return;

        if (fnError || !data?.gifUrl) {
          // Try muscles.wiki fallback
          const musclesName = searchTerm.replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, '-');
          setGifUrl(`https://muscles.wiki/exercises/${musclesName}.gif`);
        } else {
          setGifUrl(data.gifUrl);
        }
      } catch {
        if (!cancelled) {
          const musclesName = normalizeExerciseName(exerciseName).replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, '-');
          setGifUrl(`https://muscles.wiki/exercises/${musclesName}.gif`);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchGif();
    return () => { cancelled = true; };
  }, [exerciseName]);

  const handleImgError = () => {
    if (!fallbackAttempted && exerciseName) {
      const musclesName = exerciseName.toLowerCase().trim().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, '-');
      setGifUrl(`https://muscles.wiki/exercises/${musclesName}.gif`);
      setFallbackAttempted(true);
    } else {
      setError(true);
      setGifUrl(null);
    }
  };

  const loadingText = lang === "id" ? "Memuat demo..." : lang === "zh" ? "加载演示中..." : "Loading demo...";
  const errorText = lang === "id" ? "Demo tidak tersedia" : lang === "zh" ? "演示不可用" : "Demo not available";
  const coachLabel = lang === "id" ? "🎯 Demo Coach Surya" : lang === "zh" ? "🎯 Surya教练演示" : "🎯 Coach Surya's Demo";
  const watchText = lang === "id" ? "Perhatikan form dan teknik yang benar" : lang === "zh" ? "观察正确的姿势和技巧" : "Watch the correct form and technique";

  if (loading) {
    return (
      <div className="w-full aspect-square rounded-xl bg-secondary/60 flex flex-col items-center justify-center gap-2">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
        <span className="text-muted-foreground text-xs">{loadingText}</span>
      </div>
    );
  }

  if (error || !gifUrl) {
    return (
      <div className="w-full aspect-square rounded-xl bg-secondary/60 flex flex-col items-center justify-center gap-2 border border-border/30">
        <span className="text-3xl">🏋️</span>
        <p className="text-xs text-muted-foreground">{errorText}</p>
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
        <img
          src={gifUrl}
          alt={`${exerciseName} demonstration`}
          className="w-full h-full object-cover"
          loading="eager"
          onError={handleImgError}
        />
      </div>
      <p className="text-muted-foreground/60 text-[10px] text-center py-2">Source: ExerciseDB</p>
    </div>
  );
}
