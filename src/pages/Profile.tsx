import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Camera, Pencil, Crown, Bell, Globe, ScrollText, MessageSquare, LogOut, Loader2, Check, X, Flame, CalendarDays, Trophy, FolderOpen, AlertTriangle } from "lucide-react";
import AppHeader from "@/components/AppHeader";
import TierBadge, { type Tier } from "@/components/brand/TierBadge";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage, type Lang } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { useGenerateLimit } from "@/hooks/useGenerateLimit";
import { useSubscription } from "@/hooks/useSubscription";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { openLegalPopup } from "@/components/legal/legalEvents";
import FeedbackModal from "@/components/FeedbackModal";
import NotificationSettingsPopup from "@/components/pwa/NotificationSettingsPopup";
import SubscriptionPopup from "@/components/subscription/SubscriptionPopup";
import MedalsList from "@/components/medals/MedalsList";

export default function Profile() {
  const navigate = useNavigate();
  const { user, signOut, loading: authLoading } = useAuth();
  const { lang, setLang, t } = useLanguage();
  const { toast } = useToast();
  const { info: limit } = useGenerateLimit();
  const sub = useSubscription();
  const fileRef = useRef<HTMLInputElement>(null);

  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [memberSince, setMemberSince] = useState<string>("");
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [stats, setStats] = useState({ total: 0, longestStreak: 0, activeDays: 0, plans: 0 });
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [showLang, setShowLang] = useState(false);

  const ADMIN_EMAIL = "surya.sukmakertha@gmail.com";
  const isAdmin = (user?.email ?? "").toLowerCase() === ADMIN_EMAIL;
  const tier: Tier = isAdmin
    ? "ADMIN"
    : limit.status === "active" ? "PAID"
    : limit.status === "trial" ? "TRIAL"
    : limit.isExpiredFallback ? "EXPIRED"
    : "FREE";

  const tx = (id: string, en: string, zh: string) =>
    lang === "id" ? id : lang === "zh" ? zh : en;

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const [{ data: profile }, { data: completions }, { count: planCount }] = await Promise.all([
        supabase.from("profiles").select("display_name, avatar_url, created_at").eq("user_id", user.id).maybeSingle(),
        supabase.from("workout_completions").select("workout_date").eq("user_id", user.id).eq("completed", true).order("workout_date", { ascending: false }).limit(1000),
        supabase.from("saved_plans").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      ]);
      if (cancelled) return;
      const p = profile as any;
      setDisplayName(p?.display_name || "");
      setNameDraft(p?.display_name || "");
      setAvatarUrl(p?.avatar_url || null);
      setMemberSince(p?.created_at || user.created_at || "");

      // Stats
      const dates = (completions || []).map((r: any) => r.workout_date);
      const total = dates.length;
      const dateSet = new Set<string>(dates);
      const sorted = Array.from(dateSet).sort(); // asc
      // Longest consecutive
      let longest = 0; let cur = 0; let prev: Date | null = null;
      sorted.forEach((d) => {
        const cd = new Date(d);
        if (prev && (cd.getTime() - prev.getTime()) === 86400000) cur += 1;
        else cur = 1;
        if (cur > longest) longest = cur;
        prev = cd;
      });
      setStats({
        total,
        longestStreak: longest,
        activeDays: dateSet.size,
        plans: planCount ?? 0,
      });
    })();
    return () => { cancelled = true; };
  }, [user]);

  const initials = (displayName || user?.email || "U").slice(0, 1).toUpperCase();
  const showUpgrade = tier === "FREE" || tier === "TRIAL" || tier === "EXPIRED";

  // Compute expiry / status helpers from subscription data
  const subRow: any = sub.subscription;
  const now = new Date();
  const trialEnd: Date | null = subRow?.trial_end ? new Date(subRow.trial_end) : null;
  const subEnd: Date | null = subRow?.subscription_end ? new Date(subRow.subscription_end) : null;
  const dateFmt = (d: Date) => d.toLocaleDateString(lang === "id" ? "id-ID" : lang === "zh" ? "zh-CN" : "en-US", { day: "2-digit", month: "short", year: "numeric" });
  const daysUntil = (d: Date) => Math.ceil((d.getTime() - now.getTime()) / 86400000);

  let tierSubline: { text: string; color: string; warning?: boolean } | null = null;
  if (tier === "TRIAL" && trialEnd) {
    if (now < trialEnd) {
      const left = daysUntil(trialEnd);
      tierSubline = {
        text: tx(`Sisa trial: ${left} hari lagi`, `Trial left: ${left} days`, `试用剩余：${left} 天`),
        color: "#60a5fa",
      };
    } else {
      tierSubline = { text: tx("Trial berakhir","Trial ended","试用已结束"), color: "#f87171", warning: true };
    }
  } else if (tier === "PAID" && subEnd) {
    if (now < subEnd) {
      const left = daysUntil(subEnd);
      if (left <= 7) {
        tierSubline = {
          text: tx(`Berakhir dalam ${left} hari — Perpanjang →`, `Expires in ${left} days — Renew →`, `${left} 天后到期 — 续费 →`),
          color: "#ff6b00",
          warning: true,
        };
      } else {
        tierSubline = {
          text: tx(`Aktif hingga: ${dateFmt(subEnd)}`, `Active until: ${dateFmt(subEnd)}`, `有效至：${dateFmt(subEnd)}`),
          color: "#ff6b00",
        };
      }
    } else {
      tierSubline = { text: tx("Langganan berakhir — Perbarui →","Subscription ended — Renew →","订阅已结束 — 续费 →"), color: "#f87171", warning: true };
    }
  } else if (tier === "EXPIRED") {
    tierSubline = { text: tx("Langgananmu berakhir — Perbarui sekarang →","Your subscription ended — Renew now →","您的订阅已结束 — 立即续费 →"), color: "#f87171", warning: true };
  }

  const upgradeBannerText =
    tier === "FREE"    ? tx("Upgrade ke Pro — Rp 19.900/bulan →","Upgrade to Pro — Rp 19,900/month →","升级到 Pro — Rp 19,900/月 →") :
    tier === "TRIAL"   ? tx("Trial aktif — Upgrade sebelum berakhir →","Trial active — Upgrade before it ends →","试用中 — 在结束前升级 →") :
    tier === "EXPIRED" ? tx("Langgananmu berakhir — Perbarui sekarang →","Your subscription ended — Renew now →","您的订阅已结束 — 立即续费 →") :
    "";

  const handlePickFile = () => fileRef.current?.click();

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: tx("Ukuran maks 5MB","Max size 5MB","最大5MB"), variant: "destructive" });
      return;
    }
    setUploadingAvatar(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${user.id}/avatar-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
      const url = pub.publicUrl;
      const { error: updErr } = await supabase.from("profiles").update({ avatar_url: url }).eq("user_id", user.id);
      if (updErr) throw updErr;
      setAvatarUrl(url);
      toast({ title: tx("Foto profil diperbarui","Profile photo updated","头像已更新") });
    } catch (err) {
      console.error("avatar upload error", err);
      toast({ title: tx("Gagal mengunggah","Upload failed","上传失败"), variant: "destructive" });
    } finally {
      setUploadingAvatar(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const saveName = async () => {
    if (!user) return;
    const v = nameDraft.trim();
    if (!v) {
      toast({ title: tx("Nama tidak boleh kosong","Name cannot be empty","名字不能为空"), variant: "destructive" });
      return;
    }
    setSavingName(true);
    const { error } = await supabase.from("profiles").update({ display_name: v }).eq("user_id", user.id);
    setSavingName(false);
    if (error) {
      toast({ title: tx("Gagal menyimpan","Save failed","保存失败"), variant: "destructive" });
      return;
    }
    setDisplayName(v);
    setEditingName(false);
    toast({ title: tx("Nama diperbarui","Name updated","名字已更新") });
  };

  const memberSinceLabel = memberSince
    ? new Date(memberSince).toLocaleDateString(lang === "id" ? "id-ID" : lang === "zh" ? "zh-CN" : "en-US", { month: "long", year: "numeric" })
    : "—";

  const langOptions: { v: Lang; flag: string; label: string }[] = [
    { v: "en", flag: "🇬🇧", label: "English" },
    { v: "id", flag: "🇮🇩", label: "Bahasa Indonesia" },
    { v: "zh", flag: "🇨🇳", label: "简体中文" },
  ];

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <div className="max-w-2xl mx-auto px-4 pt-6 pb-24">
        {/* Header */}
        <div className="flex flex-col items-center text-center pt-2 pb-6">
          <div className="relative">
            <button
              onClick={handlePickFile}
              className="w-24 h-24 rounded-full overflow-hidden flex items-center justify-center font-display font-black text-3xl text-white shadow-lg"
              style={{ background: avatarUrl ? "transparent" : "linear-gradient(135deg,#ff6b00,#ff3d7f)" }}
              aria-label="Change photo"
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" />
              ) : (
                <span>{initials}</span>
              )}
            </button>
            <button
              onClick={handlePickFile}
              className="absolute bottom-0 right-0 w-8 h-8 rounded-full flex items-center justify-center shadow-md"
              style={{ background: "#ff6b00", color: "#fff", border: "2px solid #0f0f11" }}
              aria-label="Edit photo"
            >
              {uploadingAvatar ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
            </button>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={handleAvatarChange} />
          </div>

          {/* Name */}
          <div className="mt-4 w-full max-w-xs">
            {editingName ? (
              <div className="flex items-center gap-2">
                <Input
                  value={nameDraft}
                  onChange={(e) => setNameDraft(e.target.value)}
                  className="text-center font-bold"
                  maxLength={40}
                  autoFocus
                />
                <button
                  onClick={saveName}
                  disabled={savingName}
                  className="w-9 h-9 rounded-full flex items-center justify-center"
                  style={{ background: "#ff6b00", color: "#fff" }}
                >
                  {savingName ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => { setEditingName(false); setNameDraft(displayName); }}
                  className="w-9 h-9 rounded-full flex items-center justify-center"
                  style={{ background: "hsl(var(--surface))", color: "hsl(var(--foreground))" }}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2">
                <h1 className="text-xl font-display font-bold text-foreground">
                  {displayName || (user.email?.split("@")[0] ?? "Athlete")}
                </h1>
                <button
                  onClick={() => { setEditingName(true); setNameDraft(displayName); }}
                  className="w-7 h-7 rounded-full flex items-center justify-center"
                  style={{ background: "hsl(var(--surface))", color: "#ff6b00" }}
                  aria-label="Edit name"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-2">
              {tx(`Anggota sejak ${memberSinceLabel}`, `Member since ${memberSinceLabel}`, `成员自 ${memberSinceLabel}`)}
            </p>
            <div className="mt-2 flex flex-col items-center gap-1">
              <TierBadge tier={tier} />
              {tierSubline && (
                <button
                  type="button"
                  onClick={() => { if (tierSubline?.warning) sub.openPopup('save_plan'); }}
                  className="inline-flex items-center gap-1 text-[11px] font-medium"
                  style={{ color: tierSubline.color, cursor: tierSubline.warning ? "pointer" : "default" }}
                  disabled={!tierSubline.warning}
                >
                  {tierSubline.warning && <AlertTriangle className="w-3 h-3" />}
                  {tierSubline.text}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Upgrade banner */}
        {showUpgrade && (
          <button
            onClick={() => sub.openPopup('save_plan')}
            className="w-full rounded-card p-4 mb-5 flex items-center gap-3 text-left transition-transform active:scale-[0.99]"
            style={{ background: "linear-gradient(90deg,#ff6b00,#ff3d7f)", color: "#fff" }}
          >
            <Crown className="w-6 h-6 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-extrabold">{upgradeBannerText}</p>
              <p className="text-[11px] opacity-90 mt-0.5">{tx("Tanpa batas + semua fitur Pro","Unlimited + all Pro features","无限制 + 所有Pro功能")}</p>
            </div>
            <span className="text-xl">→</span>
          </button>
        )}

        {/* Stats grid 2x2 */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          {[
            { icon: Trophy,       label: tx("Total Workout","Total Workouts","总训练数"), value: String(stats.total) },
            { icon: Flame,        label: tx("Streak Terpanjang","Longest Streak","最长连续"), value: `${stats.longestStreak}${tx(" hari"," d"," 天")}` },
            { icon: CalendarDays, label: tx("Hari Aktif","Active Days","活跃天数"), value: String(stats.activeDays) },
            { icon: FolderOpen,   label: tx("Total Plan Dibuat","Plans Created","已创建计划"), value: String(stats.plans) },
          ].map((s) => {
            const I = s.icon;
            return (
              <div
                key={s.label}
                className="rounded-card p-4"
                style={{ background: "hsl(var(--surface))", border: "1px solid hsl(var(--border) / 0.12)" }}
              >
                <I className="w-4 h-4 mb-2" style={{ color: "#ff6b00" }} />
                <p className="text-[11px] text-muted-foreground">{s.label}</p>
                <p className="text-lg font-display font-bold text-foreground mt-0.5">{s.value}</p>
              </div>
            );
          })}
        </div>

        {/* My Medals */}
        <MedalsList />

        {/* Settings menu */}
        <div
          className="rounded-card overflow-hidden"
          style={{ background: "hsl(var(--surface))", border: "1px solid hsl(var(--border) / 0.12)" }}
        >
          {[
            { icon: Bell,          label: tx("Reminder Settings","Reminder Settings","提醒设置"),       onClick: () => setNotifOpen(true) },
            { icon: Globe,         label: tx("Bahasa","Language","语言"),                              onClick: () => setShowLang((v) => !v) },
            { icon: ScrollText,    label: tx("Syarat & Privasi","Terms & Privacy","条款与隐私"),        onClick: () => openLegalPopup('terms') },
            { icon: MessageSquare, label: tx("Masukan & Saran","Feedback","反馈与建议"),               onClick: () => setFeedbackOpen(true) },
          ].map((it, i, arr) => {
            const I = it.icon;
            return (
              <div key={it.label}>
                <button
                  onClick={it.onClick}
                  className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-white/5 transition-colors"
                  style={i < arr.length - 1 ? { borderBottom: "1px solid hsl(var(--border) / 0.08)" } : undefined}
                >
                  <I className="w-4 h-4" style={{ color: "#ff6b00" }} />
                  <span className="text-sm font-medium text-foreground flex-1">{it.label}</span>
                  <span className="text-muted-foreground">›</span>
                </button>
                {it.label === tx("Bahasa","Language","语言") && showLang && (
                  <div className="px-4 py-2 space-y-1" style={{ borderBottom: "1px solid hsl(var(--border) / 0.08)" }}>
                    {langOptions.map((opt) => (
                      <button
                        key={opt.v}
                        onClick={() => { setLang(opt.v); setShowLang(false); toast({ title: t.languageChanged }); }}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-left ${
                          lang === opt.v ? "bg-primary/10 text-foreground border border-primary/30" : "text-muted-foreground hover:bg-secondary/60"
                        }`}
                      >
                        <span className="text-lg">{opt.flag}</span>
                        <span className="flex-1">{opt.label}</span>
                        {lang === opt.v && <Check className="w-4 h-4 text-primary" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Sign out */}
        <Button
          onClick={() => signOut().then(() => navigate("/"))}
          variant="outline"
          className="w-full mt-5 h-12 font-bold"
          style={{ borderColor: "rgba(239,68,68,0.4)", color: "#f87171" }}
        >
          <LogOut className="w-4 h-4 mr-2" />
          {tx("Keluar","Sign Out","退出登录")}
        </Button>
      </div>

      <NotificationSettingsPopup open={notifOpen} onOpenChange={setNotifOpen} />
      <FeedbackModal open={feedbackOpen} onClose={() => setFeedbackOpen(false)} />
      <SubscriptionPopup
        isOpen={sub.showPopup}
        onClose={sub.closePopup}
        trigger={sub.popupTrigger}
        userEmail={sub.userEmail}
        onPaymentDone={sub.refetch}
        trialNotStarted={sub.access.trialNotStarted}
        isTrialActive={sub.access.isTrialActive}
      />
    </div>
  );
}