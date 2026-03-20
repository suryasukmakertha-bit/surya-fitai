import { useConsent } from '@/hooks/useConsent';
import ConsentPopup from './ConsentPopup';
import LegalViewPopup from './LegalViewPopup';

export default function ConsentManager() {
  const {
    showConsentPopup,
    showViewPopup,
    defaultViewSection,
    acceptConsent,
    closeViewPopup,
  } = useConsent();

  return (
    <>
      <ConsentPopup isOpen={showConsentPopup} onAccept={acceptConsent} />
      <LegalViewPopup isOpen={showViewPopup} onClose={closeViewPopup} defaultSection={defaultViewSection} />
    </>
  );
}

// Re-export useConsent for AppHeader usage
export { useConsent };
