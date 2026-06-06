import { supabase } from "@/integrations/supabase/client";

export type ActivityType = "running" | "cycling";

export interface ActivitySession {
  id?: string;
  user_id?: string;
  activity_type: ActivityType;
  date: string;
  distance_km: number;
  duration_seconds: number;
  avg_pace_seconds_per_km: number;
  calories: number;
  avg_speed_kmh: number;
  max_speed_kmh: number;
  elevation_gain_m: number;
  splits_json?: Array<{ km: number; pace_seconds: number; duration_seconds: number }>;
  route_json?: Array<{ lat: number; lng: number; t: number; alt?: number | null }>;
  created_at?: string;
}

export const MET = { running: 9.8, cycling: 7.5 };

export function formatDuration(totalSec: number): string {
  const s = Math.max(0, Math.floor(totalSec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(sec)}`;
}

export function formatPace(secPerKm: number): string {
  if (!Number.isFinite(secPerKm) || secPerKm <= 0) return "--:--";
  const m = Math.floor(secPerKm / 60);
  const s = Math.floor(secPerKm % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const la1 = (a.lat * Math.PI) / 180;
  const la2 = (b.lat * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

export function calcCalories(activity: ActivityType, weightKg: number, hours: number): number {
  return Math.round(MET[activity] * weightKg * hours);
}

export async function getUserWeightKg(userId: string): Promise<number> {
  const sb = supabase as any;
  const { data } = await sb
    .from("saved_plans")
    .select("user_info, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const w = Number(data?.user_info?.weight);
  return Number.isFinite(w) && w > 0 ? w : 70;
}

export async function loadSessions(userId: string, type: ActivityType, limit = 5): Promise<ActivitySession[]> {
  const sb = supabase as any;
  const { data } = await sb
    .from("activity_sessions")
    .select("*")
    .eq("user_id", userId)
    .eq("activity_type", type)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data || []) as ActivitySession[];
}

export async function getWeeklyTotalKm(userId: string, type: ActivityType): Promise<number> {
  const sb = supabase as any;
  const now = new Date();
  const dayIdx = (now.getDay() + 6) % 7;
  const monday = new Date(now); monday.setDate(now.getDate() - dayIdx); monday.setHours(0,0,0,0);
  const fmt = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };
  const { data } = await sb
    .from("activity_sessions")
    .select("distance_km, date")
    .eq("user_id", userId)
    .eq("activity_type", type)
    .gte("date", fmt(monday));
  return (data || []).reduce((acc: number, r: any) => acc + Number(r.distance_km || 0), 0);
}

export async function getPersonalBest(userId: string, type: ActivityType): Promise<ActivitySession | null> {
  const sb = supabase as any;
  const { data } = await sb
    .from("activity_sessions")
    .select("*")
    .eq("user_id", userId)
    .eq("activity_type", type)
    .gte("distance_km", 1.0)
    .gt("avg_pace_seconds_per_km", 0)
    .order("avg_pace_seconds_per_km", { ascending: true })
    .limit(1)
    .maybeSingle();
  return data || null;
}

export async function countSessions(userId: string, type: ActivityType): Promise<number> {
  const sb = supabase as any;
  const { count } = await sb
    .from("activity_sessions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("activity_type", type);
  return count || 0;
}

export async function saveSession(s: ActivitySession): Promise<{ ok: boolean; id?: string; error?: string }> {
  const sb = supabase as any;
  const { data, error } = await sb.from("activity_sessions").insert(s).select("id").single();
  if (error) return { ok: false, error: error.message };
  return { ok: true, id: (data as any)?.id };
}

export function monthKey(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** Returns current count for the month and increments by 1. */
export async function incrementPngDownload(userId: string): Promise<{ count: number }> {
  const sb = supabase as any;
  const mk = monthKey();
  const { data } = await sb
    .from("activity_png_downloads")
    .select("*")
    .eq("user_id", userId)
    .eq("month_year", mk)
    .maybeSingle();
  if (data) {
    const next = (data.download_count || 0) + 1;
    await sb
      .from("activity_png_downloads")
      .update({ download_count: next, updated_at: new Date().toISOString() })
      .eq("id", data.id);
    return { count: next };
  }
  await sb.from("activity_png_downloads").insert({ user_id: userId, month_year: mk, download_count: 1 });
  return { count: 1 };
}

export async function getPngDownloadCount(userId: string): Promise<number> {
  const sb = supabase as any;
  const { data } = await sb
    .from("activity_png_downloads")
    .select("download_count")
    .eq("user_id", userId)
    .eq("month_year", monthKey())
    .maybeSingle();
  return data?.download_count || 0;
}