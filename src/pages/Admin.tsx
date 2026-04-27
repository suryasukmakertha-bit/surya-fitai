import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import AppHeader from "@/components/AppHeader";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { Loader2, Users, Crown, Clock, AlertTriangle, DollarSign, Activity, Star } from "lucide-react";

const ADMIN_EMAIL = "surya.sukmakertha@gmail.com";
const COLORS = ["#00ff78", "#00b894", "#7bed9f", "#2ed573", "#26de81"];

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
        <Star key={n} className="w-3.5 h-3.5" fill={n <= rating ? "#00ff78" : "transparent"} color={n <= rating ? "#00ff78" : "rgba(255,255,255,0.25)"} />
      ))}
    </span>
  );
}

export default function Admin() {
  const { user, loading: authLoading } = useAuth();
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
          Error: {err ?? "no data"}
        </div>
      </div>
    );
  }

  const { stats, charts, feedback, avgRating, formAnalytics } = data;
  const fmtIDR = (n: number) => "Rp " + n.toLocaleString("id-ID");

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-10">
        <header>
          <h1 className="text-3xl font-bold text-foreground">Admin Report</h1>
          <p className="text-sm text-muted-foreground mt-1">Surya-FitAi platform overview</p>
        </header>

        {/* SECTION A: Stats */}
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-4">Overview</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <StatCard icon={Users} label="Total Users" value={stats.totalUsers} />
            <StatCard icon={Crown} label="Active Subscribers" value={stats.activeSubs} />
            <StatCard icon={Clock} label="Trial Users" value={stats.trialUsers} />
            <StatCard icon={AlertTriangle} label="Expired Users" value={stats.expiredUsers} />
            <StatCard icon={DollarSign} label="Revenue (this period)" value={fmtIDR(stats.monthRevenue)} />
            <StatCard icon={Activity} label="Total Plans Generated" value={stats.totalPlans} />
          </div>
        </section>

        {/* SECTION B: Charts */}
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-4">Usage Trends (Last 30 Days)</h2>
          <div className="grid lg:grid-cols-2 gap-6">
            <div className="rounded-2xl border border-border bg-card p-5">
              <h3 className="text-sm font-semibold text-foreground mb-3">New Signups / Day</h3>
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={charts.signups}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="rgba(255,255,255,0.4)" />
                  <YAxis tick={{ fontSize: 10 }} stroke="rgba(255,255,255,0.4)" allowDecimals={false} />
                  <Tooltip contentStyle={{ background: "#111", border: "1px solid rgba(0,255,120,0.3)" }} />
                  <Line type="monotone" dataKey="count" stroke="#00ff78" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="rounded-2xl border border-border bg-card p-5">
              <h3 className="text-sm font-semibold text-foreground mb-3">Generates / Day</h3>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={charts.generates}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="rgba(255,255,255,0.4)" />
                  <YAxis tick={{ fontSize: 10 }} stroke="rgba(255,255,255,0.4)" allowDecimals={false} />
                  <Tooltip contentStyle={{ background: "#111", border: "1px solid rgba(0,255,120,0.3)" }} />
                  <Bar dataKey="count" fill="#00ff78" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="rounded-2xl border border-border bg-card p-5 lg:col-span-2">
              <h3 className="text-sm font-semibold text-foreground mb-3">Program Distribution</h3>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={charts.programDistribution} dataKey="value" nameKey="name" outerRadius={100} label>
                    {charts.programDistribution.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: "#111", border: "1px solid rgba(0,255,120,0.3)" }} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        {/* SECTION C: Feedback */}
        <section>
          <div className="flex items-baseline justify-between mb-4">
            <h2 className="text-xl font-semibold text-foreground">User Feedback</h2>
            <div className="text-sm text-muted-foreground">
              Average rating: <span className="font-bold text-foreground">{avgRating || "—"}</span>{" "}
              {avgRating > 0 && <Star className="inline w-4 h-4" fill="#00ff78" color="#00ff78" />}
              <span className="ml-3">({feedback.length} entries)</span>
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-secondary/40 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 text-left">Date</th>
                    <th className="px-4 py-3 text-left">User</th>
                    <th className="px-4 py-3 text-left">Rating</th>
                    <th className="px-4 py-3 text-left">Goal</th>
                    <th className="px-4 py-3 text-left">Message</th>
                  </tr>
                </thead>
                <tbody>
                  {feedback.length === 0 ? (
                    <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No feedback yet</td></tr>
                  ) : feedback.map((f) => (
                    <tr key={f.id} className="border-t border-border/50">
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{new Date(f.created_at).toLocaleDateString()}</td>
                      <td className="px-4 py-3 text-foreground">{f.user_email ?? "—"}</td>
                      <td className="px-4 py-3"><StarsDisplay rating={f.rating} /></td>
                      <td className="px-4 py-3 text-muted-foreground">{f.plan_goal ?? "—"}</td>
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
          <h2 className="text-xl font-semibold text-foreground mb-1">Data Form User</h2>
          <p className="text-sm text-muted-foreground mb-4">Bahan Template Program</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <StatCard icon={Activity} label="Most Popular Goal" value={formAnalytics.topGoal ?? "—"} />
            <StatCard icon={Activity} label="Most Popular Equipment" value={formAnalytics.topEquipment ?? "—"} />
            <StatCard icon={Users} label="Average Age" value={formAnalytics.avgAge || "—"} suffix="yrs" />
            <StatCard icon={Activity} label="Avg Training Days/Week" value={formAnalytics.avgDaysPerWeek || "—"} />
            <StatCard icon={Clock} label="Avg Session Duration" value={formAnalytics.avgSessionDuration || "—"} suffix="min" />
            <div className="rounded-2xl border border-border bg-card p-5">
              <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wide mb-2">
                <Activity className="w-4 h-4 text-primary" />
                Diet Type Distribution
              </div>
              <div className="space-y-1 text-sm">
                {formAnalytics.dietDistribution.length === 0 && <div className="text-muted-foreground">—</div>}
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
                Top Injuries Reported
              </div>
              <div className="space-y-1 text-sm">
                {formAnalytics.topInjuries.length === 0 && <div className="text-muted-foreground">None reported</div>}
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
                Top Food Allergies
              </div>
              <div className="space-y-1 text-sm">
                {formAnalytics.topAllergies.length === 0 && <div className="text-muted-foreground">None reported</div>}
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