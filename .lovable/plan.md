
# Investigation: Fitness Goal field — current state & blast radius

Read-only report only. No code changes proposed yet — final redesign plan will follow once you confirm direction from findings §5 and §7.

## 1. Current `goal` field in `src/pages/ProgramForm.tsx`

**Definition (line 123, inside `useState`):**
```ts
goal: (t as any)[`${type}Goal`] || program?.goal || "",
```
Seeded from the localized `${type}Goal` translation key (`beginnerGoal` / `bulkingGoal` / `cuttingGoal`) which resolves to a translated display sentence like `"Build muscle mass"` / `"Bangun massa otot"` / `"增加肌肉量"`.

**Language-sync effect (lines 140–147):** on `lang`/`type`/`t` change, overwrites `form.goal` with the freshly localized `${type}Goal` string. Any user edit is silently blown away on a language switch.

**Read/display in JSX (lines 374–377):**
```tsx
<Label>{t.fitnessGoal}</Label>
<Input value={form.goal} onChange={(e) => set("goal", e.target.value)}
       placeholder={(t as any).fitnessGoalPlaceholder} ... />
```
It's a free-text `<Input>`, editable, but pre-filled with the translated string. No canonical enum, no select.

**Payload construction (line 218–238 `supabase.functions.invoke("generate-plan", { body: { ...form, ... } })`):** since it's `...form`, `goal` is sent as-is — whatever translated/user-edited string is in state. `programType: type` is sent alongside (line 222).

**Not read anywhere else in the file.** No display of `form.goal` outside the input itself; no derived value.

## 2. `normalizeGoal` in `supabase/functions/generate-plan/index.ts` (lines 785–797)

```ts
function normalizeGoal(raw, programType): WGoal {
  const s = (raw || '').toLowerCase();
  if (s.includes('strength'))   return 'Strength';
  if (s.includes('hypertroph')) return 'Hypertrophy';
  if (s.includes('fat') || s.includes('cut') || s.includes('lean')) return 'Fat Loss';
  if (s.includes('recomp'))     return 'Body Recomposition';
  if (s.includes('general') || s.includes('fitness') || s.includes('health')) return 'General Fitness';
  // Fallback via programType
  const p = (programType || '').toLowerCase();
  if (p.includes('bulk')) return 'Hypertrophy';
  if (p.includes('cut'))  return 'Fat Loss';
  return 'General Fitness';
}
```

**Direct answer:** YES — it substring-matches the raw `goal` string first. It's not a pass-through canonical check; it's an English keyword parser identical in shape to the old `parseLimitations`. `programType` is only the fallback when no keyword hits.

**Consequences of the translated seed strings today:**
- EN `"Build muscle mass"` → no keyword hits → falls through to `programType = bulking` → `Hypertrophy` ✓ (accidentally correct)
- EN `"Lose fat and get lean"` → hits `fat` and `lean` → `Fat Loss` ✓
- EN `"Build fitness foundation"` → hits `fitness` → `General Fitness` ✓
- ID `"Bangun massa otot"` → no keyword hits → programType fallback `bulk` → `Hypertrophy` ✓
- ID `"Turunkan lemak dan jadi ramping"` → no keyword hits → programType fallback `cut` → `Fat Loss` ✓
- ZH `"增加肌肉量"` → no keyword hits → programType fallback → correct
- **User-edited free text** (e.g. `"get strong"`) → hits `strong`? No — but `strength` would hit. `"lose weight"` → no keyword, falls to programType. Silent misclassification is very possible; today it "usually works" only because programType is a strong fallback.

Call site (line 1432): `const engineGoal = normalizeGoal(goal, programType);` — the returned `WGoal` is the single source of truth for macros (line 1433) and workout engine (line 1495, 1523).

## 3. `programTypeToGoal(type)` — `src/pages/ProgramForm.tsx` lines 62–70

```ts
function programTypeToGoal(type: string | undefined): string {
  switch (type) {
    case "bulking": return "Hypertrophy";
    case "cutting": return "Fat Loss";
    case "beginner":
    case "senior":
    default:        return "General Fitness";
  }
}
```

**Sole caller:** line 161, inside the `metrics` useMemo, feeding `computeAll(..., programTypeToGoal(type))`. **Preview-only** — drives the live BMI/BMR/TDEE/macro widget on the form; does NOT influence the edge-function payload (the edge function re-derives via `normalizeGoal(goal, programType)`).

Mapping enumerated: `bulking → Hypertrophy`, `cutting → Fat Loss`, `beginner|senior|<anything else> → General Fitness`. No `Strength` or `Body Recomposition` reachable today from any code path.

## 4. Canonical 5-value tokens — cross-file identity check

All three consumers use the exact same casing/spacing:

| Consumer | Location | Tokens |
|---|---|---|
| Workout engine `WGoal` type | `generate-plan/index.ts:194` | `'Hypertrophy' \| 'Strength' \| 'Fat Loss' \| 'Body Recomposition' \| 'General Fitness'` |
| Workout engine `repRange` / `rirValue` / `setsForGoal` / `restForCategory` | `generate-plan/index.ts:504–541` | Same `WGoal` union, keyed lookups |
| Edge-function `calculateMacros` switch | `generate-plan/index.ts:127–133` | `"Hypertrophy"`, `"Strength"`, `"Fat Loss"`, `"Body Recomposition"`, `"General Fitness"` (default fallthrough) |
| Client `calculateMacros` switch | `src/lib/fitnessCalculations.ts:66–86` | Identical five strings, same casing |

**Verdict:** all three use identical strings — safe to standardize the form to emit one of these five verbatim.

## 5. Is `type` (route param) still needed after Fitness Goal becomes a real field?

Current uses of `type` in `ProgramForm.tsx` after removing the goal-seed:

| Line | Use | Replaceable by new Goal field? |
|---|---|---|
| 105 | `programs.find(p => p.id === type)` (looks up program metadata) | Only used for `program?.goal` fallback (line 123) — dies with the redesign |
| 114–115 | `titleKey = ${type}Title` — page header | ⚠️ Still needed for UI title unless we replace the header with a generic "New Program" |
| 123, 142–147 | Goal seed + language sync | Dies with the redesign |
| 161 | `programTypeToGoal(type)` for metrics preview | Replaced by `form.goal` directly |
| 213 | `effectiveExperience = type === 'beginner' ? 'Beginner' : form.experience` (locks experience for Beginner program) | ⚠️ Still functional today |
| 222 | `programType: type` in payload | ⚠️ Consumed downstream: `normalizeGoal` fallback (line 793–796), `buildMealPlan.goalProgramType` for weight projection (line 1201–1204: bulk→+1kg, cut→−2kg, else maintain), safety_notes injection, `admin-report` column `program_type`, saved_plans persistence |
| 309 | `navigate("/results", { state: { ..., programType: type }})` | Results.tsx displays it in subtitle (line 1209) and passes to PDF (line 1235) & save (line 1146) |
| 386–387 | Layout branch: hide Experience select on Beginner | Behavior lock — needs an explicit decision |
| 416 | `DAYS_BY_EXPERIENCE[type === 'beginner' ? 'Beginner' : form.experience]` — days dropdown cap | Same beginner-lock |

**Answer:** `type` is far from vestigial. It still drives (a) page title, (b) Beginner experience/days lock, (c) `programType` payload field which fuels **weight projection direction** (bulk/cut/maintain kg delta), **admin analytics grouping**, **Results subtitle/PDF filename**, and **`normalizeGoal` fallback**. Fitness Goal replaces only the goal-seed and the metrics-preview goal — it does NOT eliminate `type`.

**Design question this raises (needs your call before I plan the redesign):**
Once Fitness Goal is a first-class 5-value field, should `programType` still drive weight projection kg-delta and macro-goal fallback, or should those switch over to the new Fitness Goal too? Concretely:
- `bulking + Fat Loss` (contradictory today, impossible to express but reachable if we allow independent selection): whose intent wins in `buildMealPlan.weight_projection`?
- Do we want to keep the Programs page as a **preset picker** (each program preselects a Goal + Experience + Days but the user can override)? Or is Fitness Goal fully orthogonal and Programs page becomes purely cosmetic?

## 6. Downstream display of raw `form.goal` string

Grepped `\.goal\b` across `src/` and `supabase/functions/`:
- `src/pages/ProgramForm.tsx:123, 376` — the field itself
- `supabase/functions/generate-plan/index.ts:35` (validator length check), `1265` (sanitizes into local `goal` var), `1432` (feeds `normalizeGoal`)
- `supabase/functions/generate-plan/index.ts:1051, 1201, 1465` — these are `goalProgramType`, a different field
- **Results.tsx: zero references** — `grep -in "goal" src/pages/Results.tsx` returned 0 lines
- **exportPdf.ts: zero references**
- **DailyProgressDownload / share cards: zero references**
- `ProgramCard.tsx:22–24` — a hard-coded static `goal` string per program, only consumed by `programs.find(...)` fallback on line 123 of ProgramForm

**Verdict:** the raw `form.goal` translated string is **not displayed anywhere** after generation. It exists only to be parsed by `normalizeGoal` and then discarded. The redesign has zero visual regression surface in Results/PDF/share.

## 7. Historical persistence in `saved_plans`

`saved_plans.user_info` is a JSONB column that receives the full `userInfo` object on save (Results.tsx line 1162: `user_info: userInfo as any`). `userInfo` on the /results navigate is `{ ...form, ... }` (ProgramForm line 309) — so **`user_info.goal` DOES contain the historical translated string for every saved plan**.

Consumers of `user_info.goal`:
- `admin-report/index.ts:52,159` — selects `user_info`, iterates `p.user_info` but grep shows no `.goal` access in the file (only `program_type`, `food_allergies`, `injuries` are aggregated)
- `Extend Month` path (Results.tsx line 692–722): builds `ui: any = userInfo || {}` and forwards to the edge function → `normalizeGoal(ui.goal, programType)` runs again on extend

**Blast radius for historical rows:** since Results/PDF/share never display `user_info.goal`, and Extend Month re-parses via `normalizeGoal`, the only risk is **Extend Month for old plans**: their `goal` field is still the pre-redesign translated sentence, which today happens to normalize correctly via the substring + programType fallback. If we change `normalizeGoal` to strictly expect one of the 5 canonical tokens, old plans could silently mis-classify on extend. **Recommendation for the redesign:** keep `normalizeGoal` backward-compatible (i.e. still tolerate legacy strings) even after the form becomes canonical — analogous to how `parseLimitations` remained tolerant.

Zero DB migration required for existing rows.

## Summary of blast radius

| Area | Impact | Action needed in redesign |
|---|---|---|
| ProgramForm state + JSX | High | Replace free-text `<Input>` with 5-value `<Select>`; drop language-sync effect; drop `programTypeToGoal` |
| Edge-function `normalizeGoal` | Low | Keep for backward compat with historical rows; new payload will hit canonical branch on first line |
| Edge-function `calculateMacros` / workout engine | None | Canonical tokens already match |
| Client `calculateMacros` (metrics preview) | Low | Pass `form.goal` directly instead of `programTypeToGoal(type)` |
| `programType` / route param `type` | Retained | Still drives title, Beginner lock, weight_projection direction, analytics — cannot be removed in this prompt |
| Results / PDF / share cards | None | `form.goal` not displayed anywhere |
| Saved plans DB rows | None | Historical rows keep working via tolerant `normalizeGoal` fallback |
| i18n keys | Low | Need 5 new labels (`goalHypertrophy` / `goalStrength` / `goalFatLoss` / `goalRecomp` / `goalGeneralFitness`) in EN/ID/ZH; keep `${type}Goal` keys — still used by `ProgramCard` blurbs on the Programs page |

## Open question before drafting the redesign plan

**Q1 (§5):** After Fitness Goal becomes user-selectable, what should the Programs page (`type` param) still contribute?
- (a) **Preset only** — each program preselects Goal + Experience + Days but user can freely override; `programType` continues to drive weight_projection direction and analytics.
- (b) **Fully orthogonal** — Goal drives everything (including weight_projection), `programType` kept only for title/analytics/beginner-lock.
- (c) Something else.

Once you pick, I'll draft the actual field redesign plan.
