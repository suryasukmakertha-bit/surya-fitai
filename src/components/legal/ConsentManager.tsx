import { useConsent } from '@/hooks/useConsent';
import ConsentPopup from './ConsentPopup';
import LegalViewPopup from './LegalViewPopup';
import { createContext, useContext } from 'react';

interface LegalContextType {
  openViewPopup: (section?: 'terms' | 'privacy') => void;
}

export const LegalContext = createContext<LegalContextType | undefined>(undefined);

export function useLegal() {
  const ctx = useContext(LegalContext);
  if (!ctx) throw new Error('useLegal must be used within ConsentManager');
  return ctx;
}

export default function ConsentManager() {
  const {
    showConsentPopup,
    showViewPopup,
    defaultViewSection,
    acceptConsent,
    openViewPopup,
    closeViewPopup,
  } = useConsent();

  return (
    <LegalContext.Provider value={{ openViewPopup }}>
      <ConsentPopup isOpen={showConsentPopup} onAccept={acceptConsent} />
      <LegalViewPopup isOpen={showViewPopup} onClose={closeViewPopup} defaultSection={defaultViewSection} />
    </LegalContext.Provider>
  );
}
