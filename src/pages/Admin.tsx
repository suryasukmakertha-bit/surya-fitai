import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import AppHeader from "@/components/AppHeader";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { Loader2, Users, Crown, Clock, AlertTriangle, DollarSign, Activity, Star } from "lucide-react";

const ADMIN_EMAIL = "surya.sukmakertha@gmail.com";
const COLORS = ["#ff6b00", "#ff3d7f", "#ffaa00"];

const I18N = {
  id: {
    title: "Laporan Admin",
    subtitle: "Ringkasan platform Surya-FitAi",
    overview: "Ringkasan",
    totalUsers: "Total Pengguna",
    activeSubs: "Pelanggan Aktif",
    trialUsers: "Pengguna Uji Coba",
    expiredUsers: "Pengguna Kedaluwarsa",
    revenue: "Pendapatan (periode ini)",
    totalPlans: "Total Program Dibuat",
    usageTrends: "Tren Penggunaan (30 Hari Terakhir)",
    signupsTitle: "Pendaftaran Baru / Hari",
    generatesTitle: "Generate / Hari",
    programDist: "Distribusi Program",
    feedbackTitle: "Masukan Pengguna",
    avgRating: "Rata-rata rating:",
    entries: "entri",
    colDate: "Tanggal",
    colUser: "Pengguna",
    colRating: "Rating",
    colGoal: "Tujuan",
    colMessage: "Pesan",
    noFeedback: "Belum ada masukan",
    formTitle: "Data Form Pengguna",
    formSub: "Bahan Template Program",
    topGoal: "Tujuan Terpopuler",
    topEquipment: "Peralatan Terpopuler",
    avgAge: "Rata-rata Usia",
    yrs: "thn",
    avgDays: "Rata-rata Hari Latihan/Minggu",
    avgSession: "Rata-rata Durasi Sesi",
    min: "menit",
    dietDist: "Distribusi Tipe Diet",
    topInjuries: "Cedera Terbanyak Dilaporkan",
    topAllergies: "Alergi Makanan Terbanyak",
    none: "Tidak ada laporan",
    dash: "—",
    error: "Galat",
  },
  en: {
    title: "Admin Report",
    subtitle: "Surya-FitAi platform overview",
    overview: "Overview",
    totalUsers: "Total Users",
    activeSubs: "Active Subscribers",
    trialUsers: "Trial Users",
    expiredUsers: "Expired Users",
    revenue: "Revenue (this period)",
    totalPlans: "Total Plans Generated",
    usageTrends: "Usage Trends (Last 30 Days)",
    signupsTitle: "New Signups / Day",
    generatesTitle: "Generates / Day",
    programDist: "Program Distribution",
    feedbackTitle: "User Feedback",
    avgRating: "Average rating:",
    entries: "entries",
    colDate: "Date",
    colUser: "User",
    colRating: "Rating",
    colGoal: "Goal",
    colMessage: "Message",
    noFeedback: "No feedback yet",
    formTitle: "User Form Data",
    formSub: "Program Template Source",
    topGoal: "Most Popular Goal",
    topEquipment: "Most Popular Equipment",
    avgAge: "Average Age",
    yrs: "yrs",
    avgDays: "Avg Training Days/Week",
    avgSession: "Avg Session Duration",
    min: "min",
    dietDist: "Diet Type Distribution",
    topInjuries: "Top Injuries Reported",
    topAllergies: "Top Food Allergies",
    none: "None reported",
    dash: "—",
    error: "Error",
  },
  zh: {
    title: "管理员报告",
    subtitle: "Surya-FitAi 平台概览",
    overview: "概览",
    totalUsers: "用户总数",
    activeSubs: "活跃订阅者",
    trialUsers: "试用用户",
    expiredUsers: "已过期用户",
    revenue: "本期收入",
    totalPlans: "已生成计划总数",
    usageTrends: "使用趋势（最近30天）",
    signupsTitle: "每日新注册",
    generatesTitle: "每日生成数",
    programDist: "项目分布",
    feedbackTitle: "用户反馈",
    avgRating: "平均评分：",
    entries: "条",
    colDate: "日期",
    colUser: "用户",
    colRating: "评分",
    colGoal: "目标",
    colMessage: "留言",
    noFeedback: "暂无反馈",
    formTitle: "用户表单数据",
    formSub: "计划模板来源",
    topGoal: "最受欢迎的目标",
    topEquipment: "最受欢迎的器械",
    avgAge: "平均年龄",
    yrs: "岁",
    avgDays: "每周平均训练天数",
    avgSession: "平均训练时长",
    min: "分钟",
    dietDist: "饮食类型分布",
    topInjuries: "最常报告的伤病",
    topAllergies: "最常见食物过敏",
    none: "未报告",
    dash: "—",
    error: "错误",
  },
} as const;

interface ReportData {
  stats: {
    totalUsers: number;
    activeSubs: number;
    trialUsers: number;
    expiredUsers: number;
    monthRevenue: number;
    totalPlans: number;
  };
  charts: {
    signups: { date: string; count: number }[];
    generates: { date: string; count: number }[];
    programDistribution: { name: string; value: number }[];
  };
  feedback: Array<{
    id: string;
    created_at: string;
    user_email: string | null;
    rating: number | null;
    message: string;
    plan_goal: string | null;
  }>;
  avgRating: number;
  formAnalytics: {
    topGoal: string | null;
    topEquipment: string | null;
    avgAge: number;
    topInjuries: [string, number][];
    topAllergies: [string, number][];
    avgDaysPerWeek: number;
    avgSessionDuration: number;
    dietDistribution: { name: string; value: number }[];
  };
}

function StatCard({ icon: Icon, label, value, suffix }: { icon: any; label: string; value: string | number; suffix?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wide mb-2">
        <Icon className="w-4 h-4 text-primary" />
        {label}
      </div>
      <div className="text-2xl font-bold text-foreground">
        {value}{suffix && <span className="text-base text-muted-foreground ml-1">{suffix}</span>}
      </div>
    </div>
  );
}

function StarsDisplay({ rating }: { rating: number | null }) {
  if (!rating) return <span className="text-muted-foreground">—</span>;
  return (
    <span className="inline-flex">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} className="w-3.5 h-3.5" fill={n <= rating ? "#ff6b00" : "transparent"} color={n <= rating ? "#ff6b00" : "rgba(255,255,255,0.25)"} />
      ))}
    </span>
  );
}

export default function Admin() {
  const { user, loading: authLoading } = useAuth();
  const { lang } = useLanguage();
  const t = I18N[lang as keyof typeof I18N] ?? I18N.en;
  const navigate = useNavigate();
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const isAdmin = (user?.email ?? "").toLowerCase() === ADMIN_EMAIL;

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate("/auth"); return; }
    if (!isAdmin) { navigate("/"); return; }

    (async () => {
      try {
        const { data: res, error } = await supabase.functions.invoke("admin-report", { body: {} });
        if (error) throw error;
        if ((res as any)?.error) throw new Error((res as any).error);
        setData(res as ReportData);
      } catch (e: any) {
        setErr(e.message ?? "Failed to load report");
      } finally {
        setLoading(false);
      }
    })();
  }, [user, authLoading, isAdmin, navigate]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (err || !data) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <div className="max-w-3xl mx-auto px-4 py-10 text-center text-muted-foreground">
          {t.error}: {err ?? t.dash}
        </div>
      </div>
    );
  }

  const { stats, charts, feedback, avgRating, formAnalytics } = data;
  const fmtIDR = (n: number) => "Rp " + n.toLocaleString("id-ID");
  const localeForDate = lang === "id" ? "id-ID" : lang === "zh" ? "zh-CN" : "en-US";

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-10">
        <header>
          <h1 className="text-3xl font-bold text-foreground">{t.title}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t.subtitle}</p>
        </header>

        {/* SECTION A: Stats */}
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-4">{t.overview}</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <StatCard icon={Users} label={t.totalUsers} value={stats.totalUsers} />
            <StatCard icon={Crown} label={t.activeSubs} value={stats.activeSubs} />
            <StatCard icon={Clock} label={t.trialUsers} value={stats.trialUsers} />
            <StatCard icon={AlertTriangle} label={t.expiredUsers} value={stats.expiredUsers} />
            <StatCard icon={DollarSign} label={t.revenue} value={fmtIDR(stats.monthRevenue)} />
            <StatCard icon={Activity} label={t.totalPlans} value={stats.totalPlans} />
          </div>
        </section>

        {/* SECTION B: Charts */}
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-4">{t.usageTrends}</h2>
          <div className="grid lg:grid-cols-2 gap-6">
            <div className="rounded-2xl border border-border bg-card p-5">
              <h3 className="text-sm font-semibold text-foreground mb-3">{t.signupsTitle}</h3>
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={charts.signups}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="rgba(255,255,255,0.4)" />
                  <YAxis tick={{ fontSize: 10 }} stroke="rgba(255,255,255,0.4)" allowDecimals={false} />
                  <Tooltip contentStyle={{ background: "#111", border: "1px solid rgba(255,107,0,0.3)" }} />
                  <Line type="monotone" dataKey="count" stroke="#ff6b00" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="rounded-2xl border border-border bg-card p-5">
              <h3 className="text-sm font-semibold text-foreground mb-3">{t.generatesTitle}</h3>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={charts.generates}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="rgba(255,255,255,0.4)" />
                  <YAxis tick={{ fontSize: 10 }} stroke="rgba(255,255,255,0.4)" allowDecimals={false} />
                  <Tooltip contentStyle={{ background: "#111", border: "1px solid rgba(255,107,0,0.3)" }} />
                  <Bar dataKey="count" fill="#ff6b00" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="rounded-2xl border border-border bg-card p-5 lg:col-span-2">
              <h3 className="text-sm font-semibold text-foreground mb-3">{t.programDist}</h3>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={charts.programDistribution} dataKey="value" nameKey="name" outerRadius={100} label>
                    {charts.programDistribution.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: "#111", border: "1px solid rgba(255,107,0,0.3)" }} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        {/* SECTION C: Feedback */}
        <section>
          <div className="flex items-baseline justify-between mb-4">
            <h2 className="text-xl font-semibold text-foreground">{t.feedbackTitle}</h2>
            <div className="text-sm text-muted-foreground">
              {t.avgRating} <span className="font-bold text-foreground">{avgRating || t.dash}</span>{" "}
              {avgRating > 0 && <Star className="inline w-4 h-4" fill="#ff6b00" color="#ff6b00" />}
              <span className="ml-3">({feedback.length} {t.entries})</span>
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-secondary/40 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 text-left">{t.colDate}</th>
                    <th className="px-4 py-3 text-left">{t.colUser}</th>
                    <th className="px-4 py-3 text-left">{t.colRating}</th>
                    <th className="px-4 py-3 text-left">{t.colGoal}</th>
                    <th className="px-4 py-3 text-left">{t.colMessage}</th>
                  </tr>
                </thead>
                <tbody>
                  {feedback.length === 0 ? (
                    <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">{t.noFeedback}</td></tr>
                  ) : feedback.map((f) => (
                    <tr key={f.id} className="border-t border-border/50">
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{new Date(f.created_at).toLocaleDateString(localeForDate)}</td>
                      <td className="px-4 py-3 text-foreground">{f.user_email ?? t.dash}</td>
                      <td className="px-4 py-3"><StarsDisplay rating={f.rating} /></td>
                      <td className="px-4 py-3 text-muted-foreground">{f.plan_goal ?? t.dash}</td>
                      <td className="px-4 py-3 text-foreground max-w-md">{f.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* SECTION D: Form analytics */}
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-1">{t.formTitle}</h2>
          <p className="text-sm text-muted-foreground mb-4">{t.formSub}</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <StatCard icon={Activity} label={t.topGoal} value={formAnalytics.topGoal ?? t.dash} />
            <StatCard icon={Activity} label={t.topEquipment} value={formAnalytics.topEquipment ?? t.dash} />
            <StatCard icon={Users} label={t.avgAge} value={formAnalytics.avgAge || t.dash} suffix={t.yrs} />
            <StatCard icon={Activity} label={t.avgDays} value={formAnalytics.avgDaysPerWeek || t.dash} />
            <StatCard icon={Clock} label={t.avgSession} value={formAnalytics.avgSessionDuration || t.dash} suffix={t.min} />
            <div className="rounded-2xl border border-border bg-card p-5">
              <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wide mb-2">
                <Activity className="w-4 h-4 text-primary" />
                {t.dietDist}
              </div>
              <div className="space-y-1 text-sm">
                {formAnalytics.dietDistribution.length === 0 && <div className="text-muted-foreground">{t.dash}</div>}
                {formAnalytics.dietDistribution.map((d) => (
                  <div key={d.name} className="flex justify-between text-foreground">
                    <span>{d.name}</span><span className="font-bold">{d.value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-5">
              <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wide mb-2">
                <AlertTriangle className="w-4 h-4 text-primary" />
                {t.topInjuries}
              </div>
              <div className="space-y-1 text-sm">
                {formAnalytics.topInjuries.length === 0 && <div className="text-muted-foreground">{t.none}</div>}
                {formAnalytics.topInjuries.map(([name, count]) => (
                  <div key={name} className="flex justify-between text-foreground">
                    <span className="truncate pr-2">{name}</span><span className="font-bold">{count}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-5">
              <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wide mb-2">
                <AlertTriangle className="w-4 h-4 text-primary" />
                {t.topAllergies}
              </div>
              <div className="space-y-1 text-sm">
                {formAnalytics.topAllergies.length === 0 && <div className="text-muted-foreground">{t.none}</div>}
                {formAnalytics.topAllergies.map(([name, count]) => (
                  <div key={name} className="flex justify-between text-foreground">
                    <span className="truncate pr-2">{name}</span><span className="font-bold">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}