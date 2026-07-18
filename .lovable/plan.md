
# Goal-branching sweep — final read-only report

No code changes. This plan is the report; if you approve it, the next prompt can go straight into the Fitness Goal field redesign.

## 1. `programType` / `goalProgramType` in `supabase/functions/generate-plan/index.ts`

Complete grep (case-insensitive) — 8 total matches, no others:

| Line | Snippet | What it does | Branches plan content? |
|---|---|---|---|
| 122 | comment | doc only | no |
| 127 | `function calculateMacros(tdee, weight, goal: WGoal, _programType?: string)` | 4th arg is `_programType`, never read inside the body (branches on `goal`) | no — vestigial signature |
| 785 | `function normalizeGoal(raw, programType): WGoal` | already-reviewed goal normalizer | (already reviewed) |
| 792 | comment | doc | no |
| 793 | `const p = (programType || '').toLowerCase()` | fallback path when `raw` goal has no keyword hit | drives `engineGoal`, i.e. content — but that IS the reviewed normalizeGoal fallback |
| 1266 | `programType, language, allergies: rawAllergies …` | destructure from body | no on its own |
| 1443 | `const engineGoal = normalizeGoal(goal, programType)` | reviewed — legacy fallback into engineGoal | reviewed |
| 1444 | `calculateMacros(tdee, w, engineGoal, programType)` | 4th arg unused (`_programType`) | no |

`goalProgramType`: **0 remaining matches** in the file. Fully removed by the weight_projection prompt. Verified:

```
$ rg -n 'goalProgramType' supabase/functions/generate-plan/index.ts
(no output)
```

## 2. Goal-keyword substring matching in the file (excluding `normalizeGoal`)

```
$ rg -n -i "includes\('bulk|includes\('cut|includes\('strength|includes\('hypertroph|includes\('recomp|includes\('fat|includes\('lean|includes\('general|includes\('fitness|includes\('health|includes\('maint" supabase/functions/generate-plan/index.ts
787:  if (s.includes('strength')) return 'Strength';
788:  if (s.includes('hypertroph')) return 'Hypertrophy';
789:  if (s.includes('fat') || s.includes('cut') || s.includes('lean')) return 'Fat Loss';
790:  if (s.includes('recomp')) return 'Body Recomposition';
791:  if (s.includes('general') || s.includes('fitness') || s.includes('health')) return 'General Fitness';
794:  if (p.includes('bulk')) return 'Hypertrophy';
795:  if (p.includes('cut')) return 'Fat Loss';
```

All 7 hits are inside `normalizeGoal` (lines 785–797). **No other function does goal-string keyword matching.** No hidden third instance.

## 3. `engineGoal` consumers (full list)

```
1051  interface BuildMealPlanInput { … engineGoal: WGoal … }
1200  weight_projection comment
1210  switch (input.engineGoal) { … }              ← weight_projection (already migrated)
1440  comment
1443  const engineGoal = normalizeGoal(goal, programType)
1444  calculateMacros(tdee, w, engineGoal, programType)   ← macros (already migrated)
1476  buildMealPlan input: { …, engineGoal, … }           ← passes into meal plan builder
1498  comment
1506  generateWorkout({ goal: engineGoal, … })            ← workout engine (already migrated)
1534  extension path: generateWorkout({ goal: engineGoal, … })
```

Three logical consumers: **calculateMacros, weight_projection (via buildMealPlan), workout engine (generateWorkout, both fresh + extension paths)**. Matches the known list. No 4th consumer.

## 4. Repo-wide `\.goal\b` and `WGoal` sweep (src/ + supabase/functions/)

```
src/pages/ProgramForm.tsx:123      form state seed
src/pages/ProgramForm.tsx:376      <Input value={form.goal} …>       (the field itself)
src/lib/fitnessCalculations.ts:56  comment
supabase/functions/generate-plan/index.ts  — 20 hits, all inside the reviewed WGoal type, repRange/rirValue/setsForGoal/restForCategory tables (all keyed on the canonical 5-value union, no substring matching), normalizeGoal, calculateMacros, buildMealPlan input.
supabase/functions/admin-report/index.ts:212   topGoal: topKey(programDist)   ← note: labeled "goal" but populated from programType/program_type aggregation, NOT from user_info.goal. Cosmetic naming only.
```

Explicitly checked and **zero `goal` references** in:
- `src/pages/Results.tsx`
- `src/lib/exportPdf.ts`
- `src/lib/dailyProgressDownload.ts`
- `supabase/functions/admin-report/index.ts` (except line 212 above, which reads `program_type` not `goal`)
- `supabase/functions/send-daily-reminders/index.ts`

No motivational-copy, notification, medal/streak/XP, share-card, or admin-analytics code branches on the raw `goal` string.

## 5. Does anything still read raw `programType` to influence plan CONTENT?

**No.** After the weight_projection fix, every content-shaping code path in `generate-plan/index.ts` reads `engineGoal`. `programType` now feeds only:
- `normalizeGoal`'s legacy fallback (line 793) — kept intentionally so historical saved_plans and Extend Month keep normalizing correctly for pre-redesign rows.
- The unused `_programType` param in `calculateMacros` (line 127) — dead weight, safe to drop later.
- The response/save payload metadata (page title, admin analytics grouping, Results subtitle) — non-content per your Prompt 6 decision.

## Conclusion

Sweep clean. No third instance exists. Ready to proceed to the Fitness Goal field redesign whenever you send that prompt. The vestigial `_programType` param on `calculateMacros` can be dropped in that same pass or a later cleanup — flagging but not proposing here.
