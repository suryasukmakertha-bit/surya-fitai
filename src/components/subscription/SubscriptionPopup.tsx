import { useState } from "react";
import { X, Lock } from "lucide-react";
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
    title: 'Upgrade to Pro',
    subtitleSavePlan: 'Save this plan requires a Pro account.',
    subtitleSavedPlans: 'Access your saved plans with Pro.',
    subtitleSavedPlanItem: 'Access this plan requires a Pro account.',
    contextLockedTab: 'This feature is only available for active Coach Surya subscribers.',
    contextGenerateLimit: "You've used your free monthly generate (1x). Subscribe to get 3x generates per month + full access to all Coach Surya features.",
    contextSaveLimit: 'Free accounts can only save 1 plan. Subscribe to save up to 3 plans.',
    contextExtendPlan: 'Extending to next month is an active subscriber feature.',
    trialExpired: 'Your free trial has ended.',
    benefits: [
      '✅ 3x AI program generates per month',
      '✅ Save up to 3 personalized plans',
      '✅ Meal plans & grocery lists',
      '✅ Progress tracking',
      '✅ All future features included',
    ],
    normalPrice: 'Rp 39,900',
    promoPrice: 'Rp 19,900',
    perMonth: '/ month',
    badge: 'Save 50% — Limited Offer!',
    payBtn: '💳 Pay Now — Rp 19,900',
    laterBtn: 'Maybe later',
    loadingBtn: 'Opening payment...',
    errorMsg: 'Failed to open payment. Please try again.',
  },
  id: {
    title: 'Upgrade ke Pro',
    subtitleSavePlan: 'Simpan plan ini membutuhkan akun Pro.',
    subtitleSavedPlans: 'Akses saved plans membutuhkan akun Pro.',
    subtitleSavedPlanItem: 'Akses plan ini membutuhkan akun Pro.',
    contextLockedTab: 'Fitur ini hanya tersedia untuk subscriber aktif Coach Surya.',
    contextGenerateLimit: 'Kamu sudah menggunakan jatah generate gratis bulan ini (1x). Subscribe untuk generate 3x per bulan + akses penuh semua fitur Coach Surya.',
    contextSaveLimit: 'Akun gratis hanya bisa menyimpan 1 program. Subscribe untuk simpan hingga 3 program sekaligus.',
    contextExtendPlan: 'Extend program ke bulan berikutnya adalah fitur subscriber aktif.',
    trialExpired: 'Masa uji coba gratis kamu telah berakhir.',
    benefits: [
      '✅ 3x generate program AI per bulan',
      '✅ Simpan hingga 3 program personal',
      '✅ Rencana makan & daftar belanja',
      '✅ Pelacakan progres latihan',
      '✅ Semua fitur baru termasuk',
    ],
    normalPrice: 'Rp 39.900',
    promoPrice: 'Rp 19.900',
    perMonth: '/ bulan',
    badge: 'Hemat 50% — Penawaran Terbatas!',
    payBtn: '💳 Bayar Sekarang — Rp 19.900',
    laterBtn: 'Nanti saja',
    loadingBtn: 'Membuka pembayaran...',
    errorMsg: 'Gagal membuka pembayaran. Coba lagi.',
  },
  zh: {
    title: '升级到Pro',
    subtitleSavePlan: '保存此计划需要Pro账户。',
    subtitleSavedPlans: '访问已保存的计划需要Pro账户。',
    subtitleSavedPlanItem: '访问此计划需要Pro账户。',
    contextLockedTab: '此功能仅适用于Coach Surya的活跃订阅者。',
    contextGenerateLimit: '您已使用本月免费生成次数（1次）。订阅以获得每月3次生成 + Coach Surya所有功能的完整访问权限。',
    contextSaveLimit: '免费账户只能保存1个计划。订阅以保存最多3个计划。',
    contextExtendPlan: '将计划延长到下个月是活跃订阅者的功能。',
    trialExpired: '您的免费试用期已结束。',
    benefits: [
      '✅ 每月3次AI训练计划生成',
      '✅ 保存最多3个个性化计划',
      '✅ 饮食计划和购物清单',
      '✅ 训练进度追踪',
      '✅ 包含所有未来功能',
    ],
    normalPrice: 'Rp 39,900',
    promoPrice: 'Rp 19,900',
    perMonth: '/ 月',
    badge: '节省50% — 限时优惠！',
    payBtn: '💳 立即支付 — Rp 19,900',
    laterBtn: '稍后再说',
    loadingBtn: '正在打开支付...',
    errorMsg: '打开支付失败，请重试。',
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

export default function SubscriptionPopup({ isOpen, onClose, trigger = 'save_plan', userEmail, onPaymentDone, trialNotStarted, isTrialActive }: SubscriptionPopupProps) {
  const { lang } = useLanguage();
  const t = TEXT[lang as keyof typeof TEXT] ?? TEXT.en;
  const [payLoading, setPayLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const subtitle = trigger === 'saved_plans' ? t.subtitleSavedPlans
    : trigger === 'saved_plan_item' ? t.subtitleSavedPlanItem
    : t.subtitleSavePlan;

  const contextMessage =
    trigger === 'locked_tab' ? t.contextLockedTab
    : trigger === 'generate_limit' ? t.contextGenerateLimit
    : trigger === 'save_limit' ? t.contextSaveLimit
    : trigger === 'extend_plan' ? t.contextExtendPlan
    : null;

  const handlePay = async () => {
    setPayLoading(true);
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('midtrans-create-transaction');
      if (fnError || !data?.token) throw new Error(data?.error || 'Failed');

      const isProduction = true;
      const snapUrl = isProduction
        ? 'https://app.midtrans.com/snap/snap.js'
        : 'https://app.sandbox.midtrans.com/snap/snap.js';
      const clientKey = isProduction
        ? 'Mid-client-b1Akn_LySkSNXQsq'
        : 'Mid-client-tj7pH-iKW9cGss7f';

      await loadSnapScript(snapUrl, clientKey);
      (window as any).snap.pay(data.token, {
        onSuccess: () => { onPaymentDone?.(); onClose(); },
        onPending: () => { onPaymentDone?.(); onClose(); },
        onError: () => { setError(t.errorMsg); setPayLoading(false); },
        onClose: () => setPayLoading(false),
      });
    } catch (err: any) {
      setError(t.errorMsg);
      setPayLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[95] flex items-end sm:items-center justify-center">
      {/* Overlay — clicking does NOT close */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      <div className="relative w-full sm:max-w-md bg-card border border-border rounded-t-3xl sm:rounded-3xl shadow-2xl animate-in slide-in-from-bottom duration-300 max-h-[90vh] overflow-y-auto">
        {/* Green accent bar */}
        <div className="h-1 w-full bg-gradient-to-r from-primary to-green-400 rounded-t-3xl" />

        <div className="px-6 py-6 space-y-5">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-display font-bold text-foreground">{t.title}</h2>
            </div>
          </div>

          <p className="text-sm text-muted-foreground">{subtitle}</p>

          {/* Context-specific message at top */}
          {contextMessage && (
            <div className="rounded-xl border border-primary/30 bg-primary/10 px-3 py-2.5">
              <p className="text-xs text-foreground leading-relaxed">{contextMessage}</p>
            </div>
          )}

          {/* Trial expired notice — only show if trial existed and is no longer active */}
          {!trialNotStarted && !isTrialActive && (
            <p className="text-sm text-amber-400 font-medium">{t.trialExpired}</p>
          )}

          {/* Benefits */}
          <ul className="space-y-2">
            {t.benefits.map((b, i) => (
              <li key={i} className="text-sm text-foreground">{b}</li>
            ))}
          </ul>

          {/* Pricing */}
          <div className="text-center space-y-1">
            <div className="flex items-center justify-center gap-3">
              <span className="text-muted-foreground line-through text-lg">{t.normalPrice}</span>
              <span className="text-3xl font-bold text-primary">{t.promoPrice}</span>
              <span className="text-sm text-muted-foreground">{t.perMonth}</span>
            </div>
            <span className="inline-block bg-primary/20 text-primary text-xs font-semibold px-3 py-1 rounded-full">{t.badge}</span>
          </div>

          {/* Pay button */}
          <button
            onClick={handlePay}
            disabled={payLoading}
            className="w-full py-3.5 rounded-2xl font-bold text-base bg-gradient-to-r from-primary to-green-400 text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50 active:scale-[0.97] transition-transform"
          >
            {payLoading ? t.loadingBtn : t.payBtn}
          </button>

          {/* Error */}
          {error && (
            <p className="text-sm text-destructive text-center">{error}</p>
          )}

          {/* Maybe later */}
          <button
            onClick={onClose}
            className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
          >
            {t.laterBtn}
          </button>
        </div>
      </div>
    </div>
  );
}
