import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type SubscriptionTrigger = 'save_plan' | 'saved_plans' | 'saved_plan_item';

const SPECIAL_EMAIL = 'surya.sukmakertha@gmail.com';
const MAX_PLANS = 3;
const FREE_MAX_PLANS = 1;
const TRIAL_DAYS = 14;

export function useSubscription() {
  const [subscription, setSubscription] = useState<any>(null);
  const [access, setAccess] = useState({
    canSavePlans: true,
    canAccessSavedPlans: true,
    maxPlans: MAX_PLANS,
    isUnlimited: false,
    isTrialActive: false,
    trialDaysLeft: 0,
    isSubscriptionActive: false,
    trialNotStarted: true,
    /** True for free tier (no sub) OR expired trial/subscription. */
    isFreeTier: false,
    /** True only when previously had a trial/sub that has now ended. */
    isExpired: false,
  });
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [showPopup, setShowPopup] = useState(false);
  const [popupTrigger, setPopupTrigger] = useState<SubscriptionTrigger>('save_plan');
  const [savedPlansCount, setSavedPlansCount] = useState(0);

  const computeAccess = useCallback((sub: any, email: string | null) => {
    if (email?.toLowerCase() === SPECIAL_EMAIL.toLowerCase()) {
      return { canSavePlans: true, canAccessSavedPlans: true, maxPlans: Infinity, isUnlimited: true, isTrialActive: false, trialDaysLeft: 0, isSubscriptionActive: true, trialNotStarted: false, isFreeTier: false, isExpired: false };
    }

    // No subscription record yet → FREE tier (1 plan slot, accessible)
    if (!sub) {
      return { canSavePlans: true, canAccessSavedPlans: true, maxPlans: FREE_MAX_PLANS, isUnlimited: false, isTrialActive: false, trialDaysLeft: 0, isSubscriptionActive: false, trialNotStarted: true, isFreeTier: true, isExpired: false };
    }

    const now = new Date();

    if (sub.status === 'trial') {
      const trialEnd = new Date(sub.trial_end);
      const active = now < trialEnd;
      const daysLeft = active ? Math.ceil((trialEnd.getTime() - now.getTime()) / 86400000) : 0;
      return {
        canSavePlans: true,
        canAccessSavedPlans: true,
        maxPlans: active ? MAX_PLANS : FREE_MAX_PLANS,
        isUnlimited: false,
        isTrialActive: active,
        trialDaysLeft: daysLeft,
        isSubscriptionActive: false,
        trialNotStarted: false,
        isFreeTier: !active,
        isExpired: !active,
      };
    }

    if (sub.status === 'active' && sub.subscription_end) {
      const active = now < new Date(sub.subscription_end);
      return {
        canSavePlans: true,
        canAccessSavedPlans: true,
        maxPlans: active ? MAX_PLANS : FREE_MAX_PLANS,
        isUnlimited: false,
        isTrialActive: false,
        trialDaysLeft: 0,
        isSubscriptionActive: active,
        trialNotStarted: false,
        isFreeTier: !active,
        isExpired: !active,
      };
    }

    // expired / cancelled / unknown → FREE fallback
    return { canSavePlans: true, canAccessSavedPlans: true, maxPlans: FREE_MAX_PLANS, isUnlimited: false, isTrialActive: false, trialDaysLeft: 0, isSubscriptionActive: false, trialNotStarted: false, isFreeTier: true, isExpired: true };
  }, []);

  const fetchSubscription = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      setUserId(user.id);
      setUserEmail(user.email ?? null);

      const { data: existing } = await supabase
        .from('subscriptions' as any).select('*').eq('user_id', user.id).maybeSingle();

      // Do NOT auto-create subscription. Leave as null if none exists.
      setSubscription(existing ?? null);
      setAccess(computeAccess(existing ?? null, user.email ?? null));

      const { count } = await supabase
        .from('saved_plans')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);
      setSavedPlansCount(count ?? 0);

    } catch (err) {
      console.error('[useSubscription]', err);
    } finally {
      setLoading(false);
    }
  }, [computeAccess]);

  useEffect(() => { fetchSubscription(); }, [fetchSubscription]);

  // Realtime listener for subscription changes (e.g. webhook activates subscription)
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel('subscription-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'subscriptions',
          filter: `user_id=eq.${userId}`,
        },
        (payload: any) => {
          const newSub = payload.new;
          setSubscription(newSub);
          setAccess(computeAccess(newSub, userEmail));
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userId, userEmail, computeAccess]);

  const openPopup = useCallback((trigger: SubscriptionTrigger) => {
    setPopupTrigger(trigger);
    setShowPopup(true);
  }, []);

  const closePopup = useCallback(() => setShowPopup(false), []);

  /** Create subscription record on first save. Returns true if created or already exists. */
  const ensureSubscription = useCallback(async (): Promise<boolean> => {
    if (!userId) return false;

    // Always check DB to prevent trial reset (Part B fix)
    const { data: existing } = await supabase
      .from('subscriptions' as any).select('*').eq('user_id', userId).maybeSingle();

    if (existing) {
      // Record exists — never overwrite trial_start
      setSubscription(existing);
      setAccess(computeAccess(existing, userEmail));
      return true;
    }

    // No existing subscription — create new trial
    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + TRIAL_DAYS);
    try {
      const { data: newSub, error } = await supabase
        .from('subscriptions' as any)
        .insert({ user_id: userId, status: 'trial', trial_start: new Date().toISOString(), trial_end: trialEnd.toISOString() } as any)
        .select().single();
      if (error) {
        // If already exists (race condition), fetch it
        if (error.code === '23505') {
          await fetchSubscription();
          return true;
        }
        throw error;
      }
      setSubscription(newSub);
      setAccess(computeAccess(newSub, userEmail));
      return true;
    } catch (err) {
      console.error('[ensureSubscription]', err);
      return false;
    }
  }, [userId, userEmail, computeAccess, fetchSubscription]);

  // Guard for save plan button — returns 'allow' | 'popup' | 'toast_limit'
  const checkSaveGuard = useCallback((): 'allow' | 'popup' | 'toast_limit' | 'free_limit' => {
    if (access.isUnlimited) return 'allow';

    // Free tier (never subscribed OR expired) — 1 plan slot only
    if (access.isFreeTier) {
      return savedPlansCount < FREE_MAX_PLANS ? 'allow' : 'free_limit';
    }

    // Active trial or subscription — check plan count
    if (access.canSavePlans) {
      return savedPlansCount < MAX_PLANS ? 'allow' : 'toast_limit';
    }

    return 'popup';
  }, [access, savedPlansCount]);

  // Guard for accessing saved plans page
  const checkMyPlansGuard = useCallback((): 'allow' | 'popup' => {
    // Free/expired users still see saved plans page (with 1 unlocked + others locked)
    return 'allow';
  }, [access]);

  // Legacy guards kept for backward compat
  const guardSavePlan = useCallback((): boolean => {
    const result = checkSaveGuard();
    if (result === 'popup') { openPopup('save_plan'); return false; }
    if (result === 'free_limit') { openPopup('save_plan'); return false; }
    if (result === 'toast_limit') return false;
    return true;
  }, [checkSaveGuard, openPopup]);

  const guardSavedPlans = useCallback((): boolean => {
    const result = checkMyPlansGuard();
    if (result === 'popup') { openPopup('saved_plans'); return false; }
    return true;
  }, [checkMyPlansGuard, openPopup]);

  const guardSavedPlanItem = useCallback((): boolean => {
    if (access.isUnlimited) return true;
    // Free-tier per-plan locking is enforced in SavedPlans (only most recent allowed).
    if (access.canAccessSavedPlans) return true;
    openPopup('saved_plan_item');
    return false;
  }, [access, openPopup]);

  const isAtPlanLimit = !access.isUnlimited && access.canSavePlans && savedPlansCount >= MAX_PLANS;

  return {
    subscription, access, loading, userId, userEmail,
    showPopup, popupTrigger, openPopup, closePopup,
    guardSavePlan, guardSavedPlans, guardSavedPlanItem,
    checkSaveGuard, checkMyPlansGuard, ensureSubscription,
    savedPlansCount, isAtPlanLimit,
    refetch: fetchSubscription,
  };
}
