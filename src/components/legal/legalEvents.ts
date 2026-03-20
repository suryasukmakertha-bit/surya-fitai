// Simple global event emitter for legal popup
type LegalListener = (section: 'terms' | 'privacy') => void;

let listener: LegalListener | null = null;

export function onOpenLegalPopup(fn: LegalListener) {
  listener = fn;
  return () => { listener = null; };
}

export function openLegalPopup(section: 'terms' | 'privacy' = 'terms') {
  listener?.(section);
}
