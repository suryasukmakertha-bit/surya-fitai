import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

function normalizeExerciseName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\(.*?\)/g, "")
    .replace(/[-–—]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const preloadedUrls = new Set<string>();

function preloadMedia(url: string | null | undefined) {
  if (!url || preloadedUrls.has(url)) return;
  preloadedUrls.add(url);
  const img = new Image();
  img.src = url;
}

export function usePreloadExerciseMedia(exerciseNames: string[]) {
  const hasRun = useRef(false);

  useEffect(() => {
    if (!exerciseNames.length || hasRun.current) return;
    hasRun.current = true;

    // Preload all exercise demo images in background
    const preloadAll = async () => {
      for (const name of exerciseNames) {
        try {
          const searchTerm = normalizeExerciseName(name);
          const { data } = await supabase.functions.invoke("exercise-gif-lookup", {
            body: { exerciseName: searchTerm },
          });
          if (data?.gifUrl) {
            preloadMedia(data.gifUrl);
          }
        } catch {
          // Silent fail — preloading is best-effort
        }
      }
    };

    // Delay slightly so it doesn't compete with initial render
    const timer = setTimeout(preloadAll, 1000);
    return () => clearTimeout(timer);
  }, [exerciseNames]);
}
