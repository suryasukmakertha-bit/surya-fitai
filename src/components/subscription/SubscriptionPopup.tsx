import { useState } from "react";
import { Check, X as XIcon, CreditCard, Gift } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";

interface SubscriptionPopupProps {
  isOpen: boolean;
  onClose: () => void;
  trigger?: 'save_plan' | 'saved_plans' | 'saved_plan_item' | 'locked_tab' | 'generate_limit' | 'save_limit' | 'extend_plan';
  userEmail?: string | null;
  onPaymentDone?: () => void;
  trialNotStarted?: boolean;
  isTrialActive?: boolean;
}

const TEXT = {
  en: {
    title: 'Choose Your Plan',
    subtitle: 'Start free. Upgrade anytime.',
    contextLockedTab: 'This feature is only available for active Coach Surya subscribers.',
    contextGenerateLimit: "You've used your free monthly generate (1x).",
    contextSaveLimit: 'Free accounts can only save 1 plan.',
    contextExtendPlan: 'Subscribe to extend your plan and unlock full access.',
    contextSavePlan: 'Saving plans requires a Pro account.',
    contextSavedPlans: 'Accessing saved plans requires Pro.',
    freeLabel: 'Free',
    proLabel: 'Pro',
    free: 'Rp 0',
    normalPrice: 'Rp 39,900',
    promoPrice: 'Rp 19,900',
    perMonth: '/ month',
    popular: 'MOST POPULAR',
    discount: 'Save 50% — Limited!',
    trialBadge: '14-Day Free Trial',
    currentPlan: 'Current Plan',
    startTrial: 'Start Free Trial',
    payNow: 'Subscribe Now — Rp 19,900',
    laterBtn: 'Maybe later',
    loadingBtn: 'Opening payment...',
    errorMsg: 'Failed to open payment. Please try again.',
    footer: 'Cancel anytime. Questions? Contact fitaisurya@gmail.com',
    features: [
      { label: '1x / 3x generate per month', free: true, pro: true, freeText: '1x generate per month', proText: '3x generates per month' },
      { label: 'Saved plans', free: true, pro: true, freeText: '1 saved plan', proText: '3 saved plans' },
      { label: 'Workout Plan', free: true, pro: true },
      { label: 'GPS Tracker (Run & Cycle)', free: true, pro: true },
      { label: 'Daily Challenges & Medals', free: true, pro: true },
      { label: 'Meal Plan', free: false, pro: true },
      { label: 'Grocery List', free: false, pro: true },
      { label: 'Info & Safety', free: false, pro: true },
      { label: 'Progress Tracking', free: false, pro: true },
      { label: 'Extend program', free: false, pro: true, proText: 'Extend to next month' },
    ],
  },
  id: {
    title: 'Pilih Paket Kamu',
    subtitle: 'Mulai gratis. Upgrade kapan saja.',
    contextLockedTab: 'Fitur ini hanya tersedia untuk subscriber aktif Coach Surya.',
    contextGenerateLimit: 'Kamu sudah menggunakan jatah generate gratis bulan ini (1x).',
    contextSaveLimit: 'Akun gratis hanya bisa menyimpan 1 program.',
    contextExtendPlan: 'Berlangganan untuk memperpanjang plan dan akses penuh.',
    contextSavePlan: 'Menyimpan program membutuhkan akun Pro.',
    contextSavedPlans: 'Akses saved plans membutuhkan akun Pro.',
    freeLabel: 'Gratis',
    proLabel: 'Pro',
    free: 'Rp 0',
    normalPrice: 'Rp 39.900',
    promoPrice: 'Rp 19.900',
    perMonth: '/ bulan',
    popular: 'PALING POPULER',
    discount: 'Hemat 50% — Terbatas!',
    trialBadge: 'Uji Coba Gratis 14 Hari',
    currentPlan: 'Paket Saat Ini',
    startTrial: 'Mulai Uji Coba Gratis',
    payNow: 'Bayar Sekarang — Rp 19.900',
    laterBtn: 'Nanti saja',
    loadingBtn: 'Membuka pembayaran...',
    errorMsg: 'Gagal membuka pembayaran. Coba lagi.',
    footer: 'Batalkan kapan saja. Pertanyaan? Hubungi fitaisurya@gmail.com',
    features: [
      { label: 'Generate per bulan', free: true, pro: true, freeText: '1x generate per bulan', proText: '3x generate per bulan' },
      { label: 'Program tersimpan', free: true, pro: true, freeText: '1 program tersimpan', proText: '3 program tersimpan' },
      { label: 'Rencana Latihan', free: true, pro: true },
      { label: 'GPS Tracker (Lari & Sepeda)', free: true, pro: true },
      { label: 'Tantangan Harian & Medali', free: true, pro: true },
      { label: 'Rencana Makan', free: false, pro: true },
      { label: 'Daftar Belanja', free: false, pro: true },
      { label: 'Info & Keamanan', free: false, pro: true },
      { label: 'Progress Tracking', free: false, pro: true },
      { label: 'Extend program', free: false, pro: true, proText: 'Extend ke bulan berikutnya' },
    ],
  },
  zh: {
    title: '选择您的方案',
    subtitle: '免费开始，随时升级。',
    contextLockedTab: '此功能仅适用于Coach Surya的活跃订阅者。',
    contextGenerateLimit: '您已使用本月免费生成次数（1次）。',
    contextSaveLimit: '免费账户只能保存1个计划。',
    contextExtendPlan: '订阅以延长您的计划并解锁完整访问权限。',
    contextSavePlan: '保存计划需要Pro账户。',
    contextSavedPlans: '访问已保存的计划需要Pro。',
    freeLabel: '免费',
    proLabel: 'Pro',
    free: 'Rp 0',
    normalPrice: 'Rp 39,900',
    promoPrice: 'Rp 19,900',
    perMonth: '/ 月',
    popular: '最受欢迎',
    discount: '省50% — 限时优惠！',
    trialBadge: '14天免费试用',
    currentPlan: '当前方案',
    startTrial: '开始免费试用',
    payNow: '立即订阅 — Rp 19,900',
    laterBtn: '稍后再说',
    loadingBtn: '正在打开支付...',
    errorMsg: '打开支付失败，请重试。',
    footer: '随时取消。有问题？联系 fitaisurya@gmail.com',
    features: [
      { label: '每月生成次数', free: true, pro: true, freeText: '每月1次生成', proText: '每月3次生成' },
      { label: '保存计划', free: true, pro: true, freeText: '1个保存计划', proText: '3个保存计划' },
      { label: '训练计划', free: true, pro: true },
      { label: 'GPS追踪（跑步和骑行）', free: true, pro: true },
      { label: '每日挑战和奖牌', free: true, pro: true },
      { label: '饮食计划', free: false, pro: true },
      { label: '购物清单', free: false, pro: true },
      { label: '信息与安全', free: false, pro: true },
      { label: '进度追踪', free: false, pro: true },
      { label: '延长计划', free: false, pro: true, proText: '延长到下个月' },
    ],
  },
};

const loadSnapScript = (url: string, clientKey: string): Promise<void> =>
  new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${url}"]`)) { resolve(); return; }
    const script = document.createElement('script');
    script.src = url;
    script.setAttribute('data-client-key', clientKey);
    script.onload = () => resolve();
    script.onerror = () => reject();
    document.head.appendChild(script);
  });

export default function SubscriptionPopup({ isOpen, onClose, trigger = 'save_plan', onPaymentDone, trialNotStarted }: SubscriptionPopupProps) {
  const { lang } = useLanguage();
  const t = TEXT[lang as keyof typeof TEXT] ?? TEXT.en;
  const [payLoading, setPayLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const contextMessage =
    trigger === 'locked_tab' ? t.contextLockedTab
    : trigger === 'generate_limit' ? t.contextGenerateLimit
    : trigger === 'save_limit' ? t.contextSaveLimit
    : trigger === 'extend_plan' ? t.contextExtendPlan
    : trigger === 'saved_plans' ? t.contextSavedPlans
    : trigger === 'saved_plan_item' ? t.contextSavedPlans
    : trigger === 'save_plan' ? t.contextSavePlan
    : null;

  const handlePay = async () => {
    setPayLoading(true);
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('midtrans-create-transaction');
      if (fnError || !data?.token) throw new Error(data?.error || 'Failed');

      const snapUrl = 'https://app.midtrans.com/snap/snap.js';
      const clientKey = 'Mid-client-b1Akn_LySkSNXQsq';

      await loadSnapScript(snapUrl, clientKey);
      (window as any).snap.pay(data.token, {
        onSuccess: () => { onPaymentDone?.(); onClose(); },
        onPending: () => { onPaymentDone?.(); onClose(); },
        onError: () => { setError(t.errorMsg); setPayLoading(false); },
        onClose: () => setPayLoading(false),
      });
    } catch {
      setError(t.errorMsg);
      setPayLoading(false);
    }
  };

  const ORANGE = '#ff6b00';
  const ctaLabel = trialNotStarted ? t.startTrial : t.payNow;

  return (
    <div className="fixed inset-0 z-[95] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      <div className="relative w-full sm:max-w-2xl bg-card border border-border rounded-t-3xl sm:rounded-3xl shadow-2xl animate-in slide-in-from-bottom duration-300 max-h-[92vh] overflow-y-auto">
        <div className="h-1 w-full bg-gradient-to-r from-[#ff6b00] to-[#ff3d7f] rounded-t-3xl" />

        <div className="px-4 sm:px-6 py-5 space-y-4">
          {/* Header */}
          <div className="text-center space-y-1">
            <h2 className="text-xl sm:text-2xl font-display font-bold text-foreground">{t.title}</h2>
            <p className="text-xs sm:text-sm text-muted-foreground">{t.subtitle}</p>
          </div>

          {/* Context message */}
          {contextMessage && (
            <div
              className="rounded-xl px-3 py-2.5"
              style={{ background: 'rgba(255,107,0,0.10)', border: '1px solid rgba(255,107,0,0.30)' }}
            >
              <p className="text-xs text-foreground leading-relaxed text-center">{contextMessage}</p>
            </div>
          )}

          {/* Two-column comparison */}
          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            {/* FREE COLUMN */}
            <div className="rounded-2xl p-3 sm:p-4 flex flex-col"
              style={{ background: 'hsl(var(--surface))', border: '1px solid hsl(var(--border) / 0.4)' }}>
              <div className="text-center mb-3">
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-bold">{t.freeLabel}</p>
                <p className="font-extrabold text-foreground mt-1" style={{ fontSize: 22 }}>{t.free}</p>
                <p className="text-[10px] text-muted-foreground">&nbsp;</p>
              </div>

              <ul className="space-y-1.5 flex-1">
                {t.features.map((f, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-[11px] sm:text-xs">
                    {f.free ? (
                      <Check className="shrink-0 mt-0.5" style={{ color: ORANGE, width: 12, height: 12 }} />
                    ) : (
                      <XIcon className="shrink-0 mt-0.5 text-muted-foreground/60" style={{ width: 12, height: 12 }} />
                    )}
                    <span className={f.free ? 'text-foreground' : 'text-muted-foreground/60 line-through'}>
                      {(f as any).freeText || f.label}
                    </span>
                  </li>
                ))}
              </ul>

              <button
                disabled
                className="mt-3 w-full py-2.5 rounded-xl font-bold text-xs cursor-not-allowed"
                style={{ background: 'hsl(var(--muted))', color: 'hsl(var(--muted-foreground))' }}
              >
                {t.currentPlan}
              </button>
            </div>

            {/* PRO COLUMN */}
            <div className="relative rounded-2xl p-3 sm:p-4 flex flex-col"
              style={{ background: 'hsl(var(--card))', border: `1.5px solid ${ORANGE}`, boxShadow: '0 8px 24px rgba(255,107,0,0.18)' }}>
              {/* Popular badge */}
              <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
                <span className="text-[9px] font-extrabold px-2.5 py-0.5 rounded-full text-white whitespace-nowrap"
                  style={{ background: 'linear-gradient(90deg, #ff6b00, #ff3d7f)' }}>
                  {t.popular}
                </span>
              </div>

              <div className="text-center mb-3 mt-1">
                <p className="text-[11px] uppercase tracking-wider font-bold" style={{ color: ORANGE }}>{t.proLabel}</p>
                <p className="text-[11px] line-through text-muted-foreground mt-1">{t.normalPrice}</p>
                <p className="font-extrabold mt-0.5" style={{ color: ORANGE, fontSize: 22, lineHeight: 1.1 }}>{t.promoPrice}</p>
                <p className="text-[10px] text-muted-foreground">{t.perMonth}</p>
                <span className="inline-block mt-1.5 text-[9px] font-semibold px-2 py-0.5 rounded-full"
                  style={{ background: 'rgba(255,107,0,0.12)', color: ORANGE, border: '1px solid rgba(255,107,0,0.30)' }}>
                  {t.discount}
                </span>
              </div>

              <ul className="space-y-1.5 flex-1">
                {t.features.map((f, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-[11px] sm:text-xs text-foreground">
                    <Check className="shrink-0 mt-0.5" style={{ color: ORANGE, width: 12, height: 12 }} />
                    <span>{(f as any).proText || f.label}</span>
                  </li>
                ))}
              </ul>

              {trialNotStarted && (
                <div className="mt-3 flex justify-center">
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full"
                    style={{ color: ORANGE, background: 'rgba(255,107,0,0.10)', border: '1px solid rgba(255,107,0,0.30)' }}>
                    <Gift className="w-3 h-3" />
                    {t.trialBadge}
                  </span>
                </div>
              )}

              <button
                onClick={handlePay}
                disabled={payLoading}
                className="mt-3 w-full py-2.5 rounded-xl font-bold text-xs text-white hover:opacity-90 disabled:opacity-50 active:scale-[0.97] transition-all inline-flex items-center justify-center gap-1.5"
                style={{ background: 'linear-gradient(90deg, #ff6b00, #ff3d7f)' }}
              >
                {!payLoading && <CreditCard className="w-3.5 h-3.5" />}
                {payLoading ? t.loadingBtn : ctaLabel}
              </button>
            </div>
          </div>

          {error && (
            <p className="text-sm text-destructive text-center">{error}</p>
          )}

          {/* Footer */}
          <p className="text-[11px] text-muted-foreground text-center leading-relaxed">{t.footer}</p>

          <button
            onClick={onClose}
            className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors py-1"
          >
            {t.laterBtn}
          </button>
        </div>
      </div>
    </div>
  );
}
