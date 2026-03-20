import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type SubscriptionTrigger = 'save_plan' | 'saved_plans' | 'saved_plan_item';

const SPECIAL_EMAIL = 'surya.sukmakertha@gmail.com';
const TRIAL_DAYS = 14;
const MAX_PLANS = 3;

export function useSubscription() {
  const [subscription, setSubscription] = useState<any>(null);
  const [access, setAccess] = useState({
    canSavePlans: false,
    canAccessSavedPlans: false,
    maxPlans: 0,
    isUnlimited: false,
    isTrialActive: false,
    trialDaysLeft: 0,
    isSubscriptionActive: false,
  });
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [showPopup, setShowPopup] = useState(false);
  const [popupTrigger, setPopupTrigger] = useState<SubscriptionTrigger>('save_plan');
  const [savedPlansCount, setSavedPlansCount] = useState(0);

  const computeAccess = useCallback((sub: any, email: string | null) => {
    if (email?.toLowerCase() === SPECIAL_EMAIL.toLowerCase()) {
      return { canSavePlans: true, canAccessSavedPlans: true, maxPlans: Infinity, isUnlimited: true, isTrialActive: false, trialDaysLeft: 0, isSubscriptionActive: true };
    }
    if (!sub) return { canSavePlans: false, canAccessSavedPlans: false, maxPlans: 0, isUnlimited: false, isTrialActive: false, trialDaysLeft: 0, isSubscriptionActive: false };

    const now = new Date();

    if (sub.status === 'trial') {
      const trialEnd = new Date(sub.trial_end);
      const active = now < trialEnd;
      const daysLeft = active ? Math.ceil((trialEnd.getTime() - now.getTime()) / 86400000) : 0;
      return { canSavePlans: active, canAccessSavedPlans: active, maxPlans: active ? MAX_PLANS : 0, isUnlimited: false, isTrialActive: active, trialDaysLeft: daysLeft, isSubscriptionActive: false };
    }

    if (sub.status === 'active' && sub.subscription_end) {
      const active = now < new Date(sub.subscription_end);
      return { canSavePlans: active, canAccessSavedPlans: active, maxPlans: active ? MAX_PLANS : 0, isUnlimited: false, isTrialActive: false, trialDaysLeft: 0, isSubscriptionActive: active };
    }

    return { canSavePlans: false, canAccessSavedPlans: false, maxPlans: 0, isUnlimited: false, isTrialActive: false, trialDaysLeft: 0, isSubscriptionActive: false };
  }, []);

  const fetchSubscription = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      setUserEmail(user.email ?? null);

      const { data: existing } = await supabase
        .from('subscriptions' as any).select('*').eq('user_id', user.id).maybeSingle();

      let sub = existing;
      if (!sub) {
        const trialEnd = new Date();
        trialEnd.setDate(trialEnd.getDate() + TRIAL_DAYS);
        const { data: newSub } = await supabase
          .from('subscriptions' as any)
          .insert({ user_id: user.id, status: 'trial', trial_start: new Date().toISOString(), trial_end: trialEnd.toISOString() } as any)
          .select().single();
        sub = newSub;
      }

      setSubscription(sub);
      setAccess(computeAccess(sub, user.email ?? null));

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

  const openPopup = useCallback((trigger: SubscriptionTrigger) => {
    setPopupTrigger(trigger);
    setShowPopup(true);
  }, []);

  const closePopup = useCallback(() => setShowPopup(false), []);

  const guardSavePlan = useCallback((): boolean => {
    if (!access.canSavePlans) { openPopup('save_plan'); return false; }
    if (!access.isUnlimited && savedPlansCount >= MAX_PLANS) return false;
    return true;
  }, [access, savedPlansCount, openPopup]);

  const guardSavedPlans = useCallback((): boolean => {
    if (!access.canAccessSavedPlans) { openPopup('saved_plans'); return false; }
    return true;
  }, [access.canAccessSavedPlans, openPopup]);

  const guardSavedPlanItem = useCallback((): boolean => {
    if (!access.canAccessSavedPlans) { openPopup('saved_plan_item'); return false; }
    return true;
  }, [access.canAccessSavedPlans, openPopup]);

  const isAtPlanLimit = !access.isUnlimited && access.canSavePlans && savedPlansCount >= MAX_PLANS;

  return {
    subscription, access, loading, userEmail,
    showPopup, popupTrigger, openPopup, closePopup,
    guardSavePlan, guardSavedPlans, guardSavedPlanItem,
    savedPlansCount, isAtPlanLimit,
    refetch: fetchSubscription,
  };
}
