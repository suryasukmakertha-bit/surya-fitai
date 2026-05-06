import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { onFeaturedMedalChanged, emitFeaturedMedalChanged } from "@/lib/medalEvents";

export interface FeaturedMedal {
  medal_id: string;
  medal_name: string;
  medal_tier: string;
}

export function useFeaturedMedal() {
  const { user } = useAuth();
  const [featured, setFeatured] = useState<FeaturedMedal | null>(null);

  const refresh = useCallback(async () => {
    if (!user) { setFeatured(null); return; }
    const sb = supabase as any;
    const { data } = await sb.from("user_featured_medal").select("medal_id, medal_name, medal_tier").eq("user_id", user.id).maybeSingle();
    setFeatured(data || null);
  }, [user]);

  useEffect(() => { refresh(); }, [refresh]);
  useEffect(() => onFeaturedMedalChanged(refresh), [refresh]);

  const setFeaturedMedal = useCallback(async (m: FeaturedMedal) => {
    if (!user) return;
    try {
      const sb = supabase as any;
      const { error } = await sb.from("user_featured_medal").upsert({
        user_id: user.id,
        medal_id: m.medal_id,
        medal_name: m.medal_name,
        medal_tier: m.medal_tier,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" });
      if (error) throw error;
      setFeatured(m);
      emitFeaturedMedalChanged();
      return true;
    } catch (error) {
      console.error("Error setting featured medal:", error);
      return false;
    }
  }, [user]);

  const removeFeaturedMedal = useCallback(async () => {
    if (!user) return false;
    try {
      const { error } = await supabase
        .from("user_featured_medal" as any)
        .delete()
        .eq("user_id", user.id);
      if (error) throw error;
      setFeatured(null);
      emitFeaturedMedalChanged();
      return true;
    } catch (error) {
      console.error("Error removing featured medal:", error);
      return false;
    }
  }, [user]);

  return { featured, refresh, setFeatured, setFeaturedMedal, removeFeaturedMedal };
}
