Read-only investigation. No code changes.

## 1. ALL CALL SITES TO generate-plan

Two callers total (grep of `src/`):

**A. `src/pages/ProgramForm.tsx:214`** — form submit
```ts
214:  const res = await supabase.functions.invoke("generate-plan", {
215:    body: {
216:      ...form,
217:      experience: effectiveExperience,
218:      programType: type,
219:      language: lang,
220:      startDate: startDateStr,
221:      startDay: startDayName,
222:      restDays: String(restDays),
223:      trainingDaysPerWeek,
224:      foodStyle: form.foodStyle,
225:      sessionDuration: form.sessionDuration,
226:      equipment: EQUIPMENT_ENGINE_MAP[form.equipment] ?? (form.equipment ? [form.equipment] : []),
227:      dailySteps: form.dailySteps,
228:      mealFrequency: form.mealFrequency,
229:      intermittentFasting: form.intermittentFasting,
230:      calculatedMetrics: metrics,
       …
```
`goal` arrives via `...form`. `form.goal` is initialized from `programTypeToGoal(type)` and is the value of the required Goal Select field (per prior redesign). Submission requires the form to validate (`ProgramForm.tsx:162-165`); Goal has no explicit `required` guard in the submit check but the Select is initialized non-empty (one of the 5 canonical tokens or a legacy seed) and never cleared by any code path.

**B. `src/pages/Results.tsx:698`** — Extend Month (see #2).

No other invocations (`supabase.functions.invoke("generate-plan"…)` appears nowhere else).

## 2. EXTEND MONTH PATH SPECIFICALLY

`src/pages/Results.tsx:684-707`:
```ts
684:  const handleContinueToNextMonth = async () => {
685:    if (!user || !planId) return;
      …
694:    const ui: any = userInfo || {};
695:    const trainingDaysPerWeekVal = parseInt(ui.trainingDaysPerWeek) || 4;
696:    const restDaysVal = 7 - trainingDaysPerWeekVal;
697:
698:    const res = await supabase.functions.invoke("generate-plan", {
699:      body: {
700:        ...ui,
701:        programType: programType || "custom",
702:        language: lang,
703:        trainingDaysPerWeek: trainingDaysPerWeekVal,
704:        restDays: String(restDaysVal),
705:        extensionContext: { previousMonthNumber: planMonthNumber },
706:      },
707:    });
```

`goal` is not set explicitly. It arrives via `...ui`, where `ui = userInfo || {}`. `userInfo` for extends is loaded from `saved_plans.user_info` (the persisted snapshot of the form at original generation time).

Legacy scenario: any saved plan created BEFORE the 5-value Goal Select existed will still have a `user_info.goal` value — but as a free-text translated string, not a canonical token. See #4 for the actual DB evidence.

## 3. NORMALIZEGOAL FUNCTION BODY

`supabase/functions/generate-plan/index.ts:785-798`:
```ts
785:  export function normalizeGoal(raw: string | undefined | null, programType: string | undefined | null): WGoal {
786:    const s = (raw || '').toLowerCase();
787:    if (s.includes('strength')) return 'Strength';
788:    if (s.includes('hypertroph')) return 'Hypertrophy';
789:    if (s.includes('fat') || s.includes('cut') || s.includes('lean')) return 'Fat Loss';
790:    if (s.includes('recomp')) return 'Body Recomposition';
791:    if (s.includes('general') || s.includes('fitness') || s.includes('health')) return 'General Fitness';
792:    // Fall back via programType
793:    const p = (programType || '').toLowerCase();
794:    if (p.includes('bulk')) return 'Hypertrophy';
795:    if (p.includes('cut')) return 'Fat Loss';
796:    return 'General Fitness';
797:  }
```

Behavior: `programType` is ONLY consulted when the `raw` goal string does not contain any of the keywords `strength`, `hypertroph`, `fat`, `cut`, `lean`, `recomp`, `general`, `fitness`, `health`. If `raw` matches any of those substrings (case-insensitive), it wins and `programType` is ignored. `programType` never overrides a matched `raw` value; it is purely a downstream fallback. If both `raw` and `programType` miss, returns `'General Fitness'`.

## 4. HISTORICAL DATA CHECK

Aggregate over `saved_plans` (11 rows total):
- `total = 11`
- Rows with `user_info` containing a `goal` key: `11`
- Rows where `user_info->>'goal'` is null or empty: `0`

Distinct `user_info->>'goal'` values (all rows are legacy free-text, none are the 5 canonical tokens):
| goal | count |
|---|---|
| `Build muscle mass` | 5 |
| `Bangun fondasi kebugaran` | 2 |
| `Turunkan lemak dan jadi ramping` | 2 |
| `Build fitness foundation` | 1 |
| `Lose fat and get lean` | 1 |

Distinct `saved_plans.program_type` values (11 rows):
| program_type | count |
|---|---|
| `bulking` | 5 |
| `cutting` | 3 |
| `beginner` | 3 |

Applying `normalizeGoal(raw, programType)` (from #3) to each stored pair, per legacy row:
- `raw="Build muscle mass"` — no keyword match → falls to programType branch. All 5 of these rows have `program_type="bulking"` → returns `'Hypertrophy'`.
- `raw="Bangun fondasi kebugaran"` — no keyword match → programType branch. Paired with `beginner` (2 rows) → neither `bulk` nor `cut` → `'General Fitness'`.
- `raw="Turunkan lemak dan jadi ramping"` — no keyword match (Indonesian) → programType branch. Paired with `cutting` (2 rows) → `'Fat Loss'`.
- `raw="Build fitness foundation"` — contains `fitness` → matches raw branch, returns `'General Fitness'`. programType not consulted.
- `raw="Lose fat and get lean"` — contains `fat` and `lean` → matches raw branch, returns `'Fat Loss'`. programType not consulted.

Rows where the `programType` fallback would actually fire on Extend Month against legacy data: **9 of 11** (5 bulking "Build muscle mass" + 2 beginner ID + 2 cutting ID). Rows unaffected by the fallback: 2 (English strings containing keywords).

---

No code changes. No removal proposal — raw evidence only.
