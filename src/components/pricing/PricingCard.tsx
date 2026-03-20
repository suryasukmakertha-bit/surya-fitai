import { PRICING_TEXT, type PricingLang } from './pricingContent';
import { useLanguage } from '@/contexts/LanguageContext';

interface PricingCardProps {
  variant: 'landing' | 'inapp';
  onCtaClick?: () => void;
}

export default function PricingCard({ variant, onCtaClick }: PricingCardProps) {
  const { lang } = useLanguage();
  const t = PRICING_TEXT[lang as PricingLang] ?? PRICING_TEXT.en;

  return (
    <div className="relative w-full max-w-sm mx-auto rounded-3xl overflow-hidden bg-foreground/5 border border-primary/30">
      {/* Top accent */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary to-primary/70" />

      <div className="p-6 pt-7">
        {/* Discount badge */}
        <div className="flex justify-center mb-5">
          <span className="text-xs font-bold px-4 py-1.5 rounded-full bg-primary text-primary-foreground">
            {t.badge}
          </span>
        </div>

        {/* Plan name */}
        <h3 className="font-display font-bold text-xl text-center text-foreground mb-1">{t.planName}</h3>

        {/* Trial badge */}
        <div className="flex justify-center mb-5">
          <span className="text-xs font-semibold px-3 py-1 rounded-full text-primary bg-primary/10 border border-primary/25">
            🎁 {t.trialLabel}
          </span>
        </div>

        {/* Price */}
        <div className="text-center mb-6">
          <p className="text-muted-foreground text-sm line-through mb-1">
            {t.normalPrice} {t.perMonth}
          </p>
          <div className="flex items-end justify-center gap-1">
            <span className="text-primary font-black text-5xl leading-none">
              {t.promoPrice}
            </span>
          </div>
          <p className="text-muted-foreground text-sm mt-1">{t.perMonth}</p>
        </div>

        {/* Divider */}
        <div className="h-px bg-border/30 mb-5" />

        {/* Features */}
        <ul className="space-y-3 mb-6">
          {t.features.map((f, i) => (
            <li key={i} className="text-muted-foreground text-sm">{f}</li>
          ))}
        </ul>

        {/* CTA Button */}
        <button
          onClick={onCtaClick}
          className="w-full py-4 rounded-2xl font-bold text-base bg-primary text-primary-foreground hover:bg-primary/90 transition-all active:scale-95"
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
