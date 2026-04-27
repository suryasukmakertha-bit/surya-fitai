import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const ADMIN_EMAIL = "surya.sukmakertha@gmail.com";
const MAX_GENERATES = 3;
const FREE_MAX_GENERATES = 1;

export type GenerateStatus = "admin" | "trial" | "active" | "free" | "loading";

export interface GenerateLimitInfo {
  status: GenerateStatus;
  used: number;          // generates used in current period (or trial)
  remaining: number;     // MAX - used (clamped >= 0)
  max: number;           // MAX_GENERATES (Infinity for admin)
  canGenerate: boolean;
  periodStart: Date | null;  // current paid period start (active only)
  periodEnd: Date | null;    // next renewal (active only)
  /** True when the user has had a trial/sub but it ended. Drives wording. */
  isExpiredFallback: boolean;
}

/** Compute the most recent renewal date <= now, based on subscription_start. */
function currentPeriodStart(subStart: Date, now = new Date()): Date {
  const d = new Date(subStart);
  while (true) {
    const next = new Date(d);
    next.setMonth(next.getMonth() + 1);
    if (next > now) return d;
    d.setMonth(d.getMonth() + 1);
  }
}

function currentPeriodEnd(periodStart: Date): Date {
  const e = new Date(periodStart);
  e.setMonth(e.getMonth() + 1);
  return e;
}

export function useGenerateLimit() {
  const [info, setInfo] = useState<GenerateLimitInfo>({
    status: "loading",
    used: 0,
    remaining: MAX_GENERATES,
    max: MAX_GENERATES,
    canGenerate: false,
    periodStart: null,
    periodEnd: null,
    isExpiredFallback: false,
  });

  const fetchInfo = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setInfo({ status: "free", used: 0, remaining: 0, max: FREE_MAX_GENERATES, canGenerate: false, periodStart: null, periodEnd: null, isExpiredFallback: false });
      return;
    }

    // Admin: skip everything
    if ((user.email ?? "").toLowerCase() === ADMIN_EMAIL) {
      setInfo({ status: "admin", used: 0, remaining: Infinity, max: Infinity, canGenerate: true, periodStart: null, periodEnd: null, isExpiredFallback: false });
      return;
    }

    const [{ data: sub }, { data: profile }] = await Promise.all([
      supabase.from("subscriptions" as any).select("*").eq("user_id", user.id).maybeSingle(),
      supabase.from("profiles").select("period_generate_count, trial_generate_count, last_generate_reset, free_generate_count, free_generate_month" as any).eq("user_id", user.id).maybeSingle(),
    ]);

    const now = new Date();
    const currentMonthKey = `${now.getUFullYearSafe?.() ?? now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    // Helper: build a "free" status info (1x per calendar month).
    const buildFreeInfo = (isExpiredFallback: boolean): GenerateLimitInfo => {
      const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      const storedMonth = (profile as any)?.free_generate_month ?? "";
      const rawUsed = (profile as any)?.free_generate_count ?? 0;
      const used = storedMonth === month ? rawUsed : 0;
      return {
        status: "free",
        used,
        remaining: Math.max(0, FREE_MAX_GENERATES - used),
        max: FREE_MAX_GENERATES,
        canGenerate: used < FREE_MAX_GENERATES,
        periodStart: null,
        periodEnd: null,
        isExpiredFallback,
      };
    };

    // No subscription row yet → FREE tier (1x per calendar month).
    if (!sub) {
      setInfo(buildFreeInfo(false));
      return;
    }

    // Trial active
    if ((sub as any).status === "trial") {
      const trialEnd = new Date((sub as any).trial_end);
      if (now >= trialEnd) {
        // trial expired → fall back to FREE tier
        setInfo(buildFreeInfo(true));
        return;
      }
      const used = profile?.trial_generate_count ?? 0;
      setInfo({
        status: "trial",
        used,
        remaining: Math.max(0, MAX_GENERATES - used),
        max: MAX_GENERATES,
        canGenerate: used < MAX_GENERATES,
        periodStart: null,
        periodEnd: null,
        isExpiredFallback: false,
      });
      return;
    }

    // Active paid subscription
    if ((sub as any).status === "active" && (sub as any).subscription_end && (sub as any).subscription_start) {
      const subEnd = new Date((sub as any).subscription_end);
      if (now >= subEnd) {
        setInfo(buildFreeInfo(true));
        return;
      }
      const subStart = new Date((sub as any).subscription_start);
      const pStart = currentPeriodStart(subStart, now);
      const pEnd = currentPeriodEnd(pStart);
      const lastReset = profile?.last_generate_reset ? new Date(profile.last_generate_reset) : null;
      let used = profile?.period_generate_count ?? 0;
      // Auto-reset if last_generate_reset is before current period start
      if (!lastReset || lastReset < new Date(pStart.toDateString())) {
        await supabase.from("profiles").update({
          period_generate_count: 0,
          last_generate_reset: pStart.toISOString().slice(0, 10),
        }).eq("user_id", user.id);
        used = 0;
      }
      setInfo({
        status: "active",
        used,
        remaining: Math.max(0, MAX_GENERATES - used),
        max: MAX_GENERATES,
        canGenerate: used < MAX_GENERATES,
        periodStart: pStart,
        periodEnd: pEnd,
        isExpiredFallback: false,
      });
      return;
    }

    // expired / cancelled / unknown → FREE fallback
    setInfo(buildFreeInfo(true));
  }, []);

  useEffect(() => { fetchInfo(); }, [fetchInfo]);

  return { info, refetch: fetchInfo };
}