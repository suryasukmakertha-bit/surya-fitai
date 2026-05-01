import { PRICING_TEXT, type PricingLang } from './pricingContent';
import { useLanguage } from '@/contexts/LanguageContext';
import { Check, Gift } from 'lucide-react';

interface PricingCardProps {
  variant: 'landing' | 'inapp';
  onCtaClick?: () => void;
}

export default function PricingCard({ variant, onCtaClick }: PricingCardProps) {
  const { lang } = useLanguage();
  const t = PRICING_TEXT[lang as PricingLang] ?? PRICING_TEXT.en;

  return (
    <div
      className="relative w-full max-w-sm mx-auto rounded-3xl overflow-hidden"
      style={{
        background: 'hsl(var(--card))',
        border: '1.5px solid #ff6b00',
      }}
    >
      {/* Top accent */}
      <div
        className="absolute top-0 left-0 right-0 h-1"
        style={{ background: 'linear-gradient(90deg, #ff6b00, #ff3d7f)' }}
      />

      <div className="p-6 pt-7">
        {/* Discount badge */}
        <div className="flex justify-center mb-5">
          <span
            className="text-xs font-bold px-4 py-1.5 rounded-full text-white"
            style={{ background: 'linear-gradient(90deg, #ff6b00, #ff3d7f)' }}
          >
            {t.badge}
          </span>
        </div>

        {/* Plan name */}
        <h3 className="font-display font-bold text-xl text-center text-foreground mb-1">{t.planName}</h3>

        {/* Trial badge */}
        <div className="flex justify-center mb-5">
          <span
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full"
            style={{
              color: '#ff6b00',
              background: 'rgba(255,107,0,0.10)',
              border: '1px solid rgba(255,107,0,0.30)',
            }}
          >
            <Gift className="w-3.5 h-3.5" style={{ color: '#ff6b00' }} />
            {t.trialLabel}
          </span>
        </div>

        {/* Price */}
        <div className="text-center mb-6">
          <p className="text-sm line-through mb-1" style={{ color: '#888' }}>
            {t.normalPrice} {t.perMonth}
          </p>
          <div className="flex items-end justify-center gap-1">
            <span
              className="font-extrabold leading-none"
              style={{ color: '#ff6b00', fontSize: 36, fontWeight: 800 }}
            >
              {t.promoPrice}
            </span>
          </div>
          <p className="text-muted-foreground text-sm mt-1">{t.perMonth}</p>
        </div>

        {/* Divider */}
        <div className="h-px bg-border/30 mb-5" />

        {/* Features */}
        <ul className="space-y-2.5 mb-6">
          {t.features.map((f, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-foreground">
              <Check className="shrink-0 mt-0.5" style={{ color: '#ff6b00', width: 16, height: 16 }} />
              <span>{f}</span>
            </li>
          ))}
        </ul>

        {/* CTA Button */}
        <button
          onClick={onCtaClick}
          className="w-full py-4 rounded-2xl font-bold text-base text-white transition-all active:scale-95"
          style={{ background: 'linear-gradient(90deg, #ff6b00, #ff3d7f)' }}
        >
          {variant === 'landing' ? t.ctaButton : t.ctaLoggedIn}
        </button>

        {/* Trial note (inapp only) */}
        {variant === 'inapp' && (
          <p className="text-muted-foreground/60 text-xs text-center mt-3 leading-relaxed">
            {t.trialNote}
          </p>
        )}

        {/* Disclaimer (landing only) */}
        {variant === 'landing' && (
          <p className="text-muted-foreground/60 text-xs text-center mt-3 leading-relaxed">
            {t.disclaimer}
          </p>
        )}
      </div>
    </div>
  );
}
