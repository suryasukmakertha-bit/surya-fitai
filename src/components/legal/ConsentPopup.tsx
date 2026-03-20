import { useState, useRef, useEffect } from 'react';
import { UI, TERMS, PRIVACY, LangCode } from './legalContent';
import LegalRenderer from './LegalRenderer';
import { useLanguage } from '@/contexts/LanguageContext';

interface ConsentPopupProps {
  isOpen: boolean;
  onAccept: () => void;
}

export default function ConsentPopup({ isOpen, onAccept }: ConsentPopupProps) {
  const { lang: appLang } = useLanguage();
  const lang: LangCode = appLang;

  const ui = UI[lang];
  const terms = TERMS[lang];
  const privacy = PRIVACY[lang];

  const [activeTab, setActiveTab] = useState<'terms' | 'privacy'>('terms');
  const [scrolledTerms, setScrolledTerms] = useState(false);
  const [scrolledPrivacy, setScrolledPrivacy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setActiveTab('terms');
      setScrolledTerms(false);
      setScrolledPrivacy(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [activeTab]);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const nearBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 60;
    if (!nearBottom) return;
    if (activeTab === 'terms') setScrolledTerms(true);
    if (activeTab === 'privacy') setScrolledPrivacy(true);
  };

  const canAccept = scrolledTerms || scrolledPrivacy;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      <div
        className="relative w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden"
        style={{ maxHeight: '92vh', backgroundColor: 'var(--color-card, #1a1f2e)' }}
      >
        {/* Header */}
        <div className="px-5 pt-6 pb-4 flex-shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl">📋</span>
            <h2 className="text-white font-bold text-lg">{ui.popupTitle}</h2>
          </div>
          <p className="text-gray-400 text-sm">{ui.popupSubtitle}</p>

          <div className="flex gap-2 mt-4">
            {(['terms', 'privacy'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-colors ${
                  activeTab === tab ? 'bg-green-500 text-black' : 'text-gray-400'
                }`}
                style={activeTab !== tab ? { backgroundColor: 'rgba(255,255,255,0.07)' } : {}}
              >
                {tab === 'terms' ? ui.tabTerms : ui.tabPrivacy}
                {tab === 'terms' && scrolledTerms && ' ✓'}
                {tab === 'privacy' && scrolledPrivacy && ' ✓'}
              </button>
            ))}
          </div>
        </div>

        {/* Scrollable content */}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto px-5 py-4"
        >
          <p className="text-gray-500 text-xs mb-4">
            {activeTab === 'terms' ? terms.lastUpdated : privacy.lastUpdated}
          </p>
          <LegalRenderer sections={activeTab === 'terms' ? terms.sections : privacy.sections} />
          <div className="h-6" />
        </div>

        {/* Footer */}
        <div className="px-5 py-4 flex-shrink-0" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          {!canAccept && (
            <p className="text-gray-500 text-xs text-center mb-3">{ui.scrollHint}</p>
          )}
          <button
            onClick={onAccept}
            disabled={!canAccept}
            className={`w-full py-3.5 rounded-2xl font-bold text-base transition-all ${
              canAccept
                ? 'bg-green-500 text-black active:scale-95'
                : 'text-gray-600 cursor-not-allowed'
            }`}
            style={!canAccept ? { backgroundColor: 'rgba(255,255,255,0.06)' } : {}}
          >
            {ui.acceptBtn}
          </button>
          <p className="text-gray-600 text-xs text-center mt-2 leading-tight">
            {ui.agreementNote}
          </p>
        </div>
      </div>
    </div>
  );
}
