import { useState, useEffect } from "react";
import { Play, RotateCcw, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface ExerciseGifPlayerProps {
  exerciseName: string;
}

// Normalize exercise name for better API matching
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
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    setGifUrl(null);
    setPaused(false);

    async function fetchGif() {
      try {
        const searchTerm = normalizeExerciseName(exerciseName);
        const { data, error: fnError } = await supabase.functions.invoke("exercise-gif-lookup", {
          body: { exerciseName: searchTerm },
        });

        if (cancelled) return;

        if (fnError || !data?.gifUrl) {
          setError(true);
        } else {
          setGifUrl(data.gifUrl);
        }
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchGif();
    return () => { cancelled = true; };
  }, [exerciseName]);

  if (loading) {
    return (
      <div className="w-full aspect-video bg-secondary/60 rounded-xl flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
      </div>
    );
  }

  if (error || !gifUrl) {
    return (
      <div className="w-full aspect-video bg-secondary/60 rounded-xl flex flex-col items-center justify-center gap-2 border border-border/30">
        <Play className="h-10 w-10 text-muted-foreground/40" />
        <p className="text-xs text-muted-foreground">Demo not available for this exercise</p>
      </div>
    );
  }

  return (
    <div className="w-full rounded-xl overflow-hidden border border-border/30 relative group">
      {/* GIF image */}
      <div className="relative aspect-video bg-black">
        <img
          src={gifUrl}
          alt={`${exerciseName} demonstration`}
          className={`w-full h-full object-contain ${paused ? "opacity-50" : ""}`}
          loading="eager"
        />

        {/* Play/Pause overlay */}
        <button
          onClick={() => setPaused(!paused)}
          className="absolute inset-0 flex items-center justify-center bg-black/0 hover:bg-black/20 transition-colors"
        >
          {paused && (
            <div className="bg-black/60 rounded-full p-3">
              <Play className="h-8 w-8 text-white fill-white" />
            </div>
          )}
        </button>

        {/* GIF label */}
        <span className="absolute bottom-3 right-3 bg-black/60 text-white text-[10px] font-bold px-2 py-0.5 rounded">
          GIF
        </span>

        {/* Fake progress bar for aesthetics */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
          <div className="h-full bg-white w-full animate-pulse" />
        </div>
      </div>

      {/* Caption */}
      <div className="px-3 py-2 bg-secondary/40">
        <p className="text-xs text-muted-foreground text-center">
          Demo: Correct <span className="text-foreground font-medium">{exerciseName}</span> Technique
        </p>
      </div>
    </div>
  );
}
