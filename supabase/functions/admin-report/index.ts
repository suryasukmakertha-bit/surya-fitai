import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const ADMIN_EMAIL = "surya.sukmakertha@gmail.com";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) return json({ error: "missing_token" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) return json({ error: "invalid_token" }, 401);
    const callerEmail = (userData.user.email ?? "").toLowerCase();
    if (callerEmail !== ADMIN_EMAIL) return json({ error: "forbidden" }, 403);

    const admin = createClient(supabaseUrl, serviceKey);

    // ---- Stats ----
    const [
      { count: totalUsers },
      { data: subs },
      { count: totalPlans },
      { data: feedback },
      { data: plans },
    ] = await Promise.all([
      admin.from("profiles").select("*", { count: "exact", head: true }),
      admin.from("subscriptions").select("status, subscription_end, trial_end, created_at"),
      admin.from("saved_plans").select("*", { count: "exact", head: true }),
      admin.from("user_feedback").select("*").order("created_at", { ascending: false }),
      admin.from("saved_plans").select("program_type, user_info, food_allergies, injuries, created_at"),
    ]);

    const now = Date.now();
    let activeSubs = 0, trialUsers = 0, expiredUsers = 0;
    (subs ?? []).forEach((s: any) => {
      const end = s.subscription_end ? new Date(s.subscription_end).getTime() : 0;
      const trialEnd = s.trial_end ? new Date(s.trial_end).getTime() : 0;
      if (s.status === "active" && end > now) activeSubs++;
      else if (s.status === "trial" && trialEnd > now) trialUsers++;
      else expiredUsers++;
    });

    const monthRevenue = activeSubs * 19900;

    // ---- Charts: signups (profiles.created_at) per day last 30d ----
    const { data: profileDates } = await admin
      .from("profiles")
      .select("created_at")
      .gte("created_at", new Date(now - 30 * 86400000).toISOString());
    const signupsByDay: Record<string, number> = {};
    const generatesByDay: Record<string, number> = {};
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now - i * 86400000);
      const key = d.toISOString().slice(0, 10);
      signupsByDay[key] = 0;
      generatesByDay[key] = 0;
    }
    (profileDates ?? []).forEach((p: any) => {
      const k = p.created_at.slice(0, 10);
      if (k in signupsByDay) signupsByDay[k]++;
    });

    const { data: planDates } = await admin
      .from("saved_plans")
      .select("created_at")
      .gte("created_at", new Date(now - 30 * 86400000).toISOString());
    (planDates ?? []).forEach((p: any) => {
      const k = p.created_at.slice(0, 10);
      if (k in generatesByDay) generatesByDay[k]++;
    });

    // ---- Program distribution ----
    const programDist: Record<string, number> = {};
    (plans ?? []).forEach((p: any) => {
      const t = p.program_type ?? "unknown";
      programDist[t] = (programDist[t] ?? 0) + 1;
    });

    // ---- Form analytics ----
    const equipmentCount: Record<string, number> = {};
    const dietCount: Record<string, number> = {};
    const ages: number[] = [];
    const daysPerWeek: number[] = [];
    const sessionDur: number[] = [];
    const injuriesCount: Record<string, number> = {};
    const allergyCount: Record<string, number> = {};

    (plans ?? []).forEach((p: any) => {
      const ui = p.user_info ?? {};
      const eq = ui.equipment;
      if (typeof eq === "string") equipmentCount[eq] = (equipmentCount[eq] ?? 0) + 1;
      else if (Array.isArray(eq)) eq.forEach((e: string) => { equipmentCount[e] = (equipmentCount[e] ?? 0) + 1; });
      const diet = ui.dietType ?? ui.diet_type ?? ui.diet;
      if (diet) dietCount[diet] = (dietCount[diet] ?? 0) + 1;
      const age = Number(ui.age);
      if (!isNaN(age) && age > 0) ages.push(age);
      const dpw = Number(ui.trainingDaysPerWeek ?? ui.daysPerWeek ?? ui.days_per_week);
      if (!isNaN(dpw) && dpw > 0) daysPerWeek.push(dpw);
      const sd = Number(ui.sessionDuration ?? ui.session_duration);
      if (!isNaN(sd) && sd > 0) sessionDur.push(sd);
      (p.injuries ?? []).forEach((inj: string) => {
        const k = (inj || "").trim();
        if (k) injuriesCount[k] = (injuriesCount[k] ?? 0) + 1;
      });
      (p.food_allergies ?? []).forEach((a: string) => {
        const k = (a || "").trim();
        if (k) allergyCount[k] = (allergyCount[k] ?? 0) + 1;
      });
    });

    const avg = (arr: number[]) => arr.length ? Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10 : 0;
    const topKey = (obj: Record<string, number>) => {
      const entries = Object.entries(obj);
      if (!entries.length) return null;
      entries.sort((a, b) => b[1] - a[1]);
      return entries[0][0];
    };

    const ratings = (feedback ?? []).filter((f: any) => f.rating).map((f: any) => f.rating);
    const avgRating = ratings.length ? Math.round((ratings.reduce((a: number, b: number) => a + b, 0) / ratings.length) * 10) / 10 : 0;

    return json({
      stats: {
        totalUsers: totalUsers ?? 0,
        activeSubs,
        trialUsers,
        expiredUsers,
        monthRevenue,
        totalPlans: totalPlans ?? 0,
      },
      charts: {
        signups: Object.entries(signupsByDay).map(([date, count]) => ({ date, count })),
        generates: Object.entries(generatesByDay).map(([date, count]) => ({ date, count })),
        programDistribution: Object.entries(programDist).map(([name, value]) => ({ name, value })),
      },
      feedback: feedback ?? [],
      avgRating,
      formAnalytics: {
        topGoal: topKey(programDist),
        topEquipment: topKey(equipmentCount),
        avgAge: avg(ages),
        topInjuries: Object.entries(injuriesCount).sort((a, b) => b[1] - a[1]).slice(0, 5),
        topAllergies: Object.entries(allergyCount).sort((a, b) => b[1] - a[1]).slice(0, 5),
        avgDaysPerWeek: avg(daysPerWeek),
        avgSessionDuration: avg(sessionDur),
        dietDistribution: Object.entries(dietCount).map(([name, value]) => ({ name, value })),
      },
    });
  } catch (e) {
    console.error("admin-report error", e);
    return json({ error: "server_error" }, 500);
  }
});