import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const ADMIN_EMAIL = "surya.sukmakertha@gmail.com";
const MAX_GENERATES = 3;

export type GenerateStatus = "admin" | "trial" | "active" | "expired" | "loading";

export interface GenerateLimitInfo {
  status: GenerateStatus;
  used: number;          // generates used in current period (or trial)
  remaining: number;     // MAX - used (clamped >= 0)
  max: number;           // MAX_GENERATES (Infinity for admin)
  canGenerate: boolean;
  periodStart: Date | null;  // current paid period start (active only)
  periodEnd: Date | null;    // next renewal (active only)
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
  });

  const fetchInfo = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setInfo({ status: "expired", used: 0, remaining: 0, max: MAX_GENERATES, canGenerate: false, periodStart: null, periodEnd: null });
      return;
    }

    // Admin: skip everything
    if ((user.email ?? "").toLowerCase() === ADMIN_EMAIL) {
      setInfo({ status: "admin", used: 0, remaining: Infinity, max: Infinity, canGenerate: true, periodStart: null, periodEnd: null });
      return;
    }

    const [{ data: sub }, { data: profile }] = await Promise.all([
      supabase.from("subscriptions" as any).select("*").eq("user_id", user.id).maybeSingle(),
      supabase.from("profiles").select("period_generate_count, trial_generate_count, last_generate_reset").eq("user_id", user.id).maybeSingle(),
    ]);

    const now = new Date();

    // No subscription row yet → treat as trial-not-started; allow first generate.
    if (!sub) {
      const used = profile?.trial_generate_count ?? 0;
      setInfo({
        status: "trial",
        used,
        remaining: Math.max(0, MAX_GENERATES - used),
        max: MAX_GENERATES,
        canGenerate: used < MAX_GENERATES,
        periodStart: null,
        periodEnd: null,
      });
      return;
    }

    // Trial active
    if ((sub as any).status === "trial") {
      const trialEnd = new Date((sub as any).trial_end);
      if (now >= trialEnd) {
        // trial expired, no active sub
        setInfo({ status: "expired", used: 0, remaining: 0, max: MAX_GENERATES, canGenerate: false, periodStart: null, periodEnd: null });
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
      });
      return;
    }

    // Active paid subscription
    if ((sub as any).status === "active" && (sub as any).subscription_end && (sub as any).subscription_start) {
      const subEnd = new Date((sub as any).subscription_end);
      if (now >= subEnd) {
        setInfo({ status: "expired", used: 0, remaining: 0, max: MAX_GENERATES, canGenerate: false, periodStart: null, periodEnd: null });
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
      });
      return;
    }

    // expired / cancelled / unknown
    setInfo({ status: "expired", used: 0, remaining: 0, max: MAX_GENERATES, canGenerate: false, periodStart: null, periodEnd: null });
  }, []);

  useEffect(() => { fetchInfo(); }, [fetchInfo]);

  return { info, refetch: fetchInfo };
}