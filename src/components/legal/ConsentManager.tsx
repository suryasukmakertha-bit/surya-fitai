import { useEffect } from 'react';
import { useConsent } from '@/hooks/useConsent';
import ConsentPopup from './ConsentPopup';
import LegalViewPopup from './LegalViewPopup';
import { onOpenLegalPopup } from './legalEvents';

export default function ConsentManager() {
  const {
    showConsentPopup,
    showViewPopup,
    defaultViewSection,
    acceptConsent,
    openViewPopup,
    closeViewPopup,
  } = useConsent();

  useEffect(() => {
    return onOpenLegalPopup((section) => openViewPopup(section));
  }, [openViewPopup]);

  return (
    <>
      <ConsentPopup isOpen={showConsentPopup} onAccept={acceptConsent} />
      <LegalViewPopup isOpen={showViewPopup} onClose={closeViewPopup} defaultSection={defaultViewSection} />
    </>
  );
}
