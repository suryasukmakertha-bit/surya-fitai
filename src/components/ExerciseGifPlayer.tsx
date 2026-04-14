import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { Skeleton } from "@/components/ui/skeleton";

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
  const [imgLoaded, setImgLoaded] = useState(false);
  const [error, setError] = useState(false);
  const { lang } = useLanguage();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    setGifUrl(null);
    setImgLoaded(false);

    async function fetchGif() {
      try {
        const searchTerm = normalizeExerciseName(exerciseName);
        const { data, error: fnError } = await supabase.functions.invoke("exercise-gif-lookup", {
          body: { exerciseName: searchTerm },
        });

        if (cancelled) return;

        if (fnError || !data?.gifUrl) {
          setGifUrl(null);
          setError(true);
        } else {
          setGifUrl(data.gifUrl);
        }
      } catch {
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

  const handleImgError = () => {
    setError(true);
    setGifUrl(null);
  };

  const loadingText = lang === "id" ? "Memuat demo..." : lang === "zh" ? "加载演示中..." : "Loading demo...";
  const errorText = lang === "id" ? "Demo belum tersedia. Perhatikan tips di bawah." : lang === "zh" ? "演示暂不可用。请参考下方提示。" : "Demo not available. Focus on the tips below.";
  const coachLabel = lang === "id" ? "🎯 Demo Coach Surya" : lang === "zh" ? "🎯 Surya教练演示" : "🎯 Coach Surya's Demo";
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
          <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
              <path d="M6.5 6.5h11v11h-11z" opacity="0" />
              <path d="M17.5 4.5c-.7 0-1.3.3-1.7.8L12 10l-3.8-4.7c-.4-.5-1-.8-1.7-.8C5.1 4.5 4 5.6 4 7v10c0 1.4 1.1 2.5 2.5 2.5.7 0 1.3-.3 1.7-.8L12 14l3.8 4.7c.4.5 1 .8 1.7.8 1.4 0 2.5-1.1 2.5-2.5V7c0-1.4-1.1-2.5-2.5-2.5z" />
            </svg>
          </div>
          <p className="text-muted-foreground text-xs text-center px-6 leading-relaxed">{errorText}</p>
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
