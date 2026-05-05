import { Award } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { TIER_COLOR, tierGradient } from "@/lib/medalCatalog";

interface UserMedal {
  id: string;
  medal_id: string;
  medal_name: string;
  medal_tier: string;
  medal_description: string | null;
  earned_at: string;
}

export default function MedalsList() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [medals, setMedals] = useState<UserMedal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const sb = supabase as any;
      const { data } = await sb
        .from("user_medals")
        .select("id, medal_id, medal_name, medal_tier, medal_description, earned_at")
        .eq("user_id", user.id)
        .order("earned_at", { ascending: false });
      if (!cancelled) {
        setMedals(data || []);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user]);

  if (loading) return null;

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Award size={16} color="#ff6b00" />
          <span style={{ fontSize: 14, fontWeight: 700 }} className="text-foreground">Medal Saya</span>
          {medals.length > 0 && (
            <span style={{
              background: "rgba(255,107,0,0.15)", color: "#ff6b00",
              fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 999
            }}>{medals.length}</span>
          )}
        </div>
        <button
          onClick={() => navigate("/medals")}
          style={{ fontSize: 12, color: "#ff6b00", fontWeight: 600 }}
        >
          Lihat Semua ›
        </button>
      </div>

      {medals.length === 0 ? (
        <div
          className="rounded-card p-5 text-center"
          style={{ background: "hsl(var(--surface))", border: "1px solid hsl(var(--border) / 0.12)" }}
        >
          <Award size={32} color="#333" className="mx-auto mb-2" />
          <p style={{ fontSize: 12, color: "#555" }}>Belum ada medal</p>
          <p style={{ fontSize: 11, color: "#444" }}>Selesaikan tantangan harian!</p>
        </div>
      ) : (
        <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
          {medals.map((m) => {
            const color = TIER_COLOR[m.medal_tier] || "#ff6b00";
            return (
              <button
                key={m.id}
                onClick={() => navigate("/medals")}
                style={{
                  flex: "0 0 80px", height: 110, borderRadius: 12,
                  background: tierGradient(m.medal_tier),
                  border: `1px solid ${color}`,
                  padding: 8, display: "flex", flexDirection: "column",
                  alignItems: "center", justifyContent: "center", gap: 4,
                }}
              >
                <Award size={24} color={color} />
                <p style={{ fontSize: 9, fontWeight: 700, color: "#fff", textAlign: "center", lineHeight: 1.2, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                  {m.medal_name}
                </p>
                <p style={{ fontSize: 8, color: "#888" }}>
                  {new Date(m.earned_at).toLocaleDateString("id-ID", { day: "2-digit", month: "short" })}
                </p>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
