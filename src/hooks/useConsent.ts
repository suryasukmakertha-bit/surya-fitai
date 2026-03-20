import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useConsent() {
  const [hasAccepted, setHasAccepted] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [showConsentPopup, setShowConsentPopup] = useState(false);
  const [showViewPopup, setShowViewPopup] = useState(false);
  const [defaultViewSection, setDefaultViewSection] = useState<'terms' | 'privacy'>('terms');

  const checkConsent = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data } = await supabase
        .from('user_consents')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      const accepted = !!data;
      setHasAccepted(accepted);
      if (!accepted) setShowConsentPopup(true);
    } catch (err) {
      console.error('[useConsent]', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkConsent();
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        setLoading(true);
        checkConsent();
      }
      if (event === 'SIGNED_OUT') {
        setHasAccepted(null);
        setShowConsentPopup(false);
      }
    });
    return () => listener.subscription.unsubscribe();
  }, [checkConsent]);

  const acceptConsent = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.from('user_consents').insert({
        user_id: user.id,
        terms_version: '1.0',
      });
      setHasAccepted(true);
      setShowConsentPopup(false);
    } catch (err) {
      console.error('[useConsent] acceptConsent error:', err);
    }
  }, []);

  const openViewPopup = useCallback((section: 'terms' | 'privacy' = 'terms') => {
    setDefaultViewSection(section);
    setShowViewPopup(true);
  }, []);

  const closeViewPopup = useCallback(() => setShowViewPopup(false), []);

  return {
    hasAccepted,
    loading,
    showConsentPopup,
    showViewPopup,
    defaultViewSection,
    acceptConsent,
    openViewPopup,
    closeViewPopup,
  };
}
