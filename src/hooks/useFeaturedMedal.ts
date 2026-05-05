import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

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

  return { featured, refresh, setFeatured };
}
