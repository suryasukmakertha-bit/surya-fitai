import { useState, useEffect } from 'react';
import { UI, TERMS, PRIVACY, LangCode } from './legalContent';
import LegalRenderer from './LegalRenderer';
import { useLanguage } from '@/contexts/LanguageContext';

interface LegalViewPopupProps {
  isOpen: boolean;
  onClose: () => void;
  defaultSection?: 'terms' | 'privacy';
}

export default function LegalViewPopup({ isOpen, onClose, defaultSection = 'terms' }: LegalViewPopupProps) {
  const { lang: appLang } = useLanguage();
  const lang: LangCode = appLang;

  const ui = UI[lang];
  const terms = TERMS[lang];
  const privacy = PRIVACY[lang];

  const [activeTab, setActiveTab] = useState<'terms' | 'privacy'>(defaultSection);

  useEffect(() => {
    if (isOpen) setActiveTab(defaultSection);
  }, [isOpen, defaultSection]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div
        className="relative w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden"
        style={{ maxHeight: '92vh', backgroundColor: 'var(--color-card, #1a1f2e)' }}
      >
        {/* Header */}
        <div className="px-5 pt-5 pb-4 flex-shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="text-lg">📄</span>
              <span className="text-white font-bold text-base">
                {activeTab === 'terms' ? ui.tabTerms : ui.tabPrivacy}
              </span>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white text-xl w-8 h-8 flex items-center justify-center rounded-full transition-colors"
              style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}
            >
              ×
            </button>
          </div>

          <div className="flex gap-2">
            {(['terms', 'privacy'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-colors ${
                  activeTab === tab ? 'bg-primary text-primary-foreground' : 'text-gray-400'
                }`}
                style={activeTab !== tab ? { backgroundColor: 'rgba(255,255,255,0.07)' } : {}}
              >
                {tab === 'terms' ? ui.tabTerms : ui.tabPrivacy}
              </button>
            ))}
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <p className="text-gray-500 text-xs mb-4">
            {activeTab === 'terms' ? terms.lastUpdated : privacy.lastUpdated}
          </p>
          <LegalRenderer sections={activeTab === 'terms' ? terms.sections : privacy.sections} />
          <div className="h-6" />
        </div>

        {/* Footer */}
        <div className="px-5 py-4 flex-shrink-0" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <button
            onClick={onClose}
            className="w-full py-3 rounded-2xl text-gray-300 font-semibold text-sm"
            style={{ backgroundColor: 'rgba(255,255,255,0.07)' }}
          >
            {ui.closeBtn}
          </button>
        </div>
      </div>
    </div>
  );
}
