
# Programs-page blast-radius: current-state trace (read-only)

Purely a fact-collection pass. No recommendations, no design.

---

## 1. Route & page

`src/App.tsx` L51–52 — two related routes:

```tsx
<Route path="/programs" element={<Programs />} />
<Route path="/program/:type" element={<ProgramForm />} />
```

`src/pages/Programs.tsx` (full, 74 lines) is a thin wrapper: auth-gate → toast if an uncompleted plan exists → hero copy + `<ProgramCard />`.
- L14 `import ProgramCard from "@/components/ProgramCard";`
- L20–37 active-plan check → toast `t.activePlanWarning`
- L47 `redirectTo: "/programs"` on auth redirect
- L63 hero copy: `{(t as any).programsDescCoach}` ("Each program is personally designed by Coach Surya…", i18n keys at LanguageContext.tsx L358 / 1013 / 1659)
- L65 renders `<ProgramCard />` — no props, no `onSelect`

`src/components/ProgramCard.tsx` (full, 70 lines):
- L14–18 `programDefs`: 3 hard-coded entries (`beginner`, `bulking`, `cutting`) with i18n keys `{title,desc,benefits,goal}Key` and lucide icons `Heart / Dumbbell / Scissors`
- L21–25 `const programs = [...]` — static array with `{id, title, goal}` strings, exported at L70. Only reader today: `ProgramForm.tsx` L16 + L105 `programs.find((p) => p.id === type)` — used solely to derive `program?.title` as a fallback title (L115).
- L33 default action: `navigate(\`/program/${id}\`)`
- Rendered card contents per program:
  - Icon in orange badge
  - `t[titleKey]` — e.g. "Beginner Program"
  - `t[descKey]` — one-line blurb
  - Chips: `t[benefitsKey]` as `string[]`
  - `goalKey` is defined in the type but **not rendered anywhere**
- Data source is 100% i18n (`LanguageContext.tsx`), no DB, no props.

---

## 2. Bottom-nav item

`src/components/nav/BottomNav.tsx` L28 (inside the `items` array, L27–32):

```tsx
{ key: "prog",   path: "/programs",    icon: Dumbbell,   label: t("Program", "Program", "计划") },
```

- Icon: `Dumbbell` (imported L2 from lucide-react)
- Label: inline `t(id, en, zh)` helper (L23–24) — **no i18n key**, hard-coded trio `"Program" / "Program" / "计划"`.

Also relevant — `src/components/AppHeader.tsx` L141 (desktop hamburger drawer):

```tsx
{ key: "program", path: "/programs", label: lang === "id" ? "Program" : lang === "zh" ? "计划" : "Program" },
```

Same pattern, no i18n key.

---

## 3. `ProgramForm.tsx` remaining uses of the `type` route param

`useParams` binding at L101:
```ts
const { type } = useParams<{ type: string }>();
```

Every read (7 sites):

| # | Line | Snippet | Purpose |
|---|------|---------|---------|
| a | L105 | `const program = programs.find((p) => p.id === type);` | Fallback for title lookup only. |
| b | L114–115 | `` const titleKey = `${type}Title` as keyof typeof t; `` → `programTitle = (t[titleKey] as string) || program?.title || "Program"` | Page `<h1>` (rendered L321). |
| c | L128 | `goal: programTypeToGoal(type),` inside `useState` initializer | Default seed for the Fitness Goal Select. Comment at L124–127 explicitly notes it's just an initial default, user can freely change. |
| d | L209 | `const effectiveExperience = type === 'beginner' ? 'Beginner' : form.experience;` | Beginner route locks experience to `Beginner`. |
| e | L218 | `programType: type,` inside `supabase.functions.invoke("generate-plan", { body: ... })` | Payload sent to edge fn — see §4. |
| f | L305 | `navigate("/results", { state: { ..., programType: type, ... } });` | Hands `type` to Results page as `programType`. |
| g | L391 | `` cn("grid gap-4", type === 'beginner' ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2') `` | Grid layout for Experience+Frequency row. |
| h | L392 | `{type !== 'beginner' && (` | Hides the Experience `<Select>` on beginner route. |
| i | L421 | `(DAYS_BY_EXPERIENCE[type === 'beginner' ? 'Beginner' : form.experience] ?? [2,3,4,5,6,7]).map(...)` | Training-frequency options list. |

`programTypeToGoal(type)` (defined L62–70) is used at exactly ONE call site (L128, item c). Confirmed via grep — no other reader.

So the effective classifications:
- Goal-related use of `type`: **only item (c)**, as a default seed. All downstream goal logic (`computeAll`, macros, engine) now reads `form.goal`.
- Non-goal use of `type`: items (a), (b), (d), (g), (h), (i) — all title/UI/experience-lock branches.
- Item (e) forwards `type` to the edge function; item (f) forwards it to Results.

---

## 4. Payload → edge function consumers

Frontend send site: `ProgramForm.tsx` L218 (already listed above):
```ts
programType: type,
```

Additional payload send site: `Results.tsx` L701 (in the Extend Month flow):
```ts
programType: programType || "custom",
```

`supabase/functions/generate-plan/index.ts` — every reference to `programType`:

- L122–124 (comment block only) — documents that `programType` is a legacy unused param kept in `calculateMacros` signature until Programs removal.
- L127 signature: `export function calculateMacros(tdee: number, weight: number, goal: WGoal, _programType?: string)` — underscored, unused inside the body.
- L785 signature: `export function normalizeGoal(raw: string | undefined | null, programType: string | undefined | null): WGoal`
- L792–795 body: legacy fallback branch —
  ```ts
  // Fall back via programType
  const p = (programType || '').toLowerCase();
  if (p.includes('bulk')) return 'Hypertrophy';
  if (p.includes('cut')) return 'Fat Loss';
  return 'General Fitness';
  ```
  Only fires when `goal` doesn't match any of the 5 canonical tokens.
- L1266 request-body destructure: `programType, language, allergies: rawAllergies, ...`
- L1443–1444 the sole two call sites:
  ```ts
  const engineGoal = normalizeGoal(goal, programType);
  const macros = calculateMacros(tdee, w, engineGoal, programType);
  ```

Cross-check vs previous sweep: matches — the only live consumer is `normalizeGoal`'s legacy fallback (L792–795); `calculateMacros`'s parameter is inert (underscore-prefixed). **No new consumer has appeared.** No AI-prompt string references `programType`.

---

## 5. `Results.tsx` — every `programType` usage

State plumbing:
- L361 `const stateProgramType = location.state?.programType;`
- L368 `const [programType, setProgramType] = useState(stateProgramType);`
- L405 draft restore: `setProgramType(parsed.programType);`
- L417 draft persist: `` const draft = JSON.stringify({ plan, userInfo, programType, clientGeneratedId }); ``
- L420 effect dep array includes `programType`

Extend Month flow:
- L701 sends `programType: programType || "custom"` into `generate-plan` payload
- L723 new plan name:
  ```ts
  const newPlanName = `${ui?.name || "User"} - ${(programType || "custom").charAt(0).toUpperCase() + (programType || "custom").slice(1)} (Month ${nextMonth})`;
  ```
- L788 `navigate("/results", { state: { plan: newPlan, userInfo: ui, programType, planId } });`

Save flow:
- L1146 initial save plan name:
  ```ts
  const planName = `${userInfo?.name || "User"} - ${(programType || "custom").charAt(0).toUpperCase() + (programType || "custom").slice(1)}`;
  ```
- L1161 DB insert: `program_type: programType || "custom",`
- L1188 post-save nav: `navigate("/results", { state: { plan, userInfo, programType, planId: data.id }, replace: true });`

**Subtitle display** — L1208–1210:
```ts
const subtitle = userInfo?.name
  ? t.heyUser.replace("{name}", userInfo.name).replace("{type}", programType || "")
  : t.hereCustom.replace("{type}", programType || "");
```
`t.heyUser` templates in LanguageContext contain `{name}` and `{type}` placeholders — `{type}` is substituted with the raw lowercase route token ("beginner"/"bulking"/"cutting") or empty string.

**PDF export** — L1235:
```tsx
<Button onClick={() => exportPlanToPDF(plan, programType, userInfo?.name, tKey)} variant="secondary" size="sm">
```

**ProgressDownloadCard** — L1697:
```tsx
programName={programType || "Fitness"}
```
(passed as `programName` prop; rendered inside PNG generation.)

---

## 6. `src/lib/exportPdf.ts` — `programType` usage

Signature — L95–100:
```ts
export function exportPlanToPDF(
  plan: PlanData,
  programType?: string,
  userName?: string,
  tKey?: (key: string, params?: Record<string, string | number>) => string,
) {
```

Cover-title derivation — L155:
```ts
const pType = (programType || "Custom").charAt(0).toUpperCase() + (programType || "custom").slice(1);
```
(`pType` is then rendered onto the PDF cover page.)

Filename — L453:
```ts
doc.save(`Surya-FitAi-${(programType || "plan").replace(/\s/g, "-")}-plan.pdf`);
```

No other reference; the header/section titles do not use it.

---

## 7. `admin-report/index.ts` — `program_type`

Selected column — L52:
```ts
admin.from("saved_plans").select("program_type, user_info, food_allergies, injuries, created_at"),
```

Aggregation — L143–147 (single use):
```ts
// ---- Program distribution ----
const programDist: Record<string, number> = {};
(plans ?? []).forEach((p: any) => {
  const t = p.program_type ?? "unknown";
  programDist[t] = (programDist[t] ?? 0) + 1;
});
```

`programDist` is subsequently returned in the JSON response. Downstream consumer: `src/pages/Admin.tsx` — quick grep would confirm exactly which chart consumes it; that check is not included in this pass. No other admin-report path branches on `program_type`.

---

## 8. `saved_plans.program_type` DB column

Live schema (queried live):

| column | type | nullable | default |
|---|---|---|---|
| id | uuid | NO | `gen_random_uuid()` |
| user_id | uuid | NO | — |
| **program_type** | **text** | **NO** | **none** |
| user_info | jsonb | NO | `'{}'` |
| plan_data | jsonb | NO | `'{}'` |
| created_at | timestamptz | NO | `now()` |
| plan_name | text | YES | — |
| client_generated_id | text | YES | — |
| plan_month_number | integer | NO | `1` |
| plan_started_at | timestamptz | NO | `now()` |
| plan_completed_at | timestamptz | YES | — |
| injuries | text[] | NO | `'{}'` |
| food_allergies | text[] | NO | `'{}'` |
| generate_count | integer | NO | `0` |
| streak_carry_over | integer | NO | `0` |

`program_type` is `NOT NULL` with no default → any INSERT must supply it.

Writers (INSERT/UPDATE):
- `Results.tsx` L1161 — INSERT at initial save (see §5).
- `admin-report/index.ts` — SELECT only.
- No UPDATE writer exists.

Readers (SELECT + subsequent display/branching):

| File | Line | Snippet | What it does with the value |
|---|---|---|---|
| `Results.tsx` | L361 (indirect, via `location.state`) | see §5 | subtitle, PDF, extend, ProgressDownloadCard, re-save |
| `SavedPlans.tsx` | L18 | `program_type: string;` interface | typing |
| `SavedPlans.tsx` | L125 | `` setEditName(plan.plan_name || `${plan.program_type} ${t.program}`); `` | Fallback rename value |
| `SavedPlans.tsx` | L146 | `navigate("/results", { state: { ..., programType: plan.program_type, planId: plan.id } });` | Hydrate Results from saved row |
| `SavedPlans.tsx` | L264 | `` {p.plan_name || `${p.program_type} ${t.program}`} `` | Fallback list-item label |
| `SavedPlans.tsx` | L329 | `` planName={lockedModalPlan?.plan_name || `${lockedModalPlan?.program_type || ''} ${t.program}`.trim()} `` | Locked-plan modal fallback label |
| `Index.tsx` | L90, L124 | `.select("id, plan_name, program_type, plan_month_number, plan_data, user_info, created_at, plan_started_at", ...)` | Loads dashboard plan list |
| `Index.tsx` | L348 | `programType: activePlan.program_type,` in navigate state | Hydrate Results (Extend banner) |
| `Index.tsx` | L409 | `{activePlan.plan_name || activePlan.program_type}` | Active-plan card title fallback |
| `Index.tsx` | L411 | `<p ...>{activePlan.program_type}</p>` | Active-plan card subtitle (always shown) |
| `Index.tsx` | L585 | `{p.plan_name || p.program_type}` | "All plans" list fallback title |
| `Index.tsx` | L588 | `{p.program_type} · {monthLabel(p.plan_month_number)}` | "All plans" secondary line (always shown) |
| `Index.tsx` | L667 | `programType: plan.program_type,` in navigate state | Hydrate Results |
| `FeedbackModal.tsx` | L58 | `.select("program_type")` | see §9 |
| `admin-report/index.ts` | L52 + L145 | see §7 | Distribution chart |

Confirmed: displayed to users in Dashboard (Index.tsx L411, L588) and SavedPlans / Results title fallbacks. Always rendered raw ("beginner"/"bulking"/"cutting"/"custom"), never localized.

**Extend Month**: uses the persisted `program_type` at Index.tsx L348 → passed as `programType` state to Results → forwarded into `generate-plan` payload at Results L701 (§5).

---

## 9. `FeedbackModal.tsx` — `program_type` as `planGoal`

L54–66:
```ts
let planGoal: string | null = null;
try {
  const { data: plan } = await supabase
    .from("saved_plans")
    .select("program_type")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  planGoal = plan?.program_type ?? null;
} catch {}

const { error } = await supabase.from("user_feedback").insert({
  ...
  plan_goal: planGoal,
});
```

Inserted into `user_feedback.plan_goal`. Real Fitness Goal is available inside `saved_plans.user_info.goal` (JSONB), but this file reads only `program_type`. No other reader of `plan_goal` was traced in this pass.

---

## Summary of blast radius (unweighted)

- **1 route** to remove (`/programs`) + **1 page component** (`Programs.tsx`) + **1 component** (`ProgramCard.tsx` — but `programs` export at L70 is imported by ProgramForm L16/L105 for the title fallback).
- **2 nav entries** hard-coded (BottomNav L28, AppHeader L141).
- **8 navigate-to-`/programs` call sites**: SavedPlans L157/L228, Results L801/L1113, Index L623/L625/L659/L661, Programs.tsx L47 (self).
- **1 `/program/:type` param** with 7 read sites in ProgramForm (goal seed is the only goal-related one; the other 6 are title/UI/beginner-experience-lock).
- **1 payload key** `programType` still flowing edge → engine, consumed only by `normalizeGoal` legacy fallback (L792–795) and inert `calculateMacros` param (L127).
- **1 DB column** `saved_plans.program_type` NOT NULL with 14+ reader sites across Index, SavedPlans, Results, FeedbackModal, admin-report; renders raw text in the dashboard and title fallbacks; also drives admin distribution chart and Extend Month payload.
- **PDF** cover title (L155) and filename (L453).
- **PNG** `ProgressDownloadCard` `programName` prop (Results L1697).
- **Feedback** stores `program_type` as `plan_goal` (FeedbackModal L58/L63).

Ready for the removal-design pass.
