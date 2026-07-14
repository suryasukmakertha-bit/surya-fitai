# Fix: ProgramForm preview passes programType instead of Goal to computeAll

## Problem
`src/pages/ProgramForm.tsx:129` passes `type || "beginner"` (Programs-page route param: `beginner`/`bulking`/`cutting`/`senior`) as `computeAll`'s third argument. After the recent rename, `computeAll` expects one of the 5 canonical Goal strings (`Hypertrophy` / `Strength` / `Fat Loss` / `Body Recomposition` / `General Fitness`). None match, so `calculateMacros` falls through to `default` (General Fitness) every render — the live preview silently shows General Fitness macros for every user, diverging from what `generate-plan/index.ts` will actually store.

## Fix (single, minimal change)
In `src/pages/ProgramForm.tsx` only, add a small local `programTypeToGoal(type)` helper and pass its result into `computeAll`'s third argument.

### Mapping (mirrors edge function `normalizeGoal` programType fallback)
- `bulking` → `Hypertrophy`
- `cutting` → `Fat Loss`
- `beginner` → `General Fitness`
- `senior` → `General Fitness`
- anything else → `General Fitness`

This mapping is the **only** source. The existing `form.goal` field is a translated display string derived from `type` via i18n and will **not** be read or used as a fallback.

### Code change
Replace line 129:

```ts
return computeAll(w, h, a, form.gender, parseInt(form.trainingDaysPerWeek) || 4, form.dailySteps, type || "beginner");
```

with a call using `programTypeToGoal(type)` in the third argument position. `useMemo` deps unchanged (`type` already listed).

## Out of scope
- No changes to `computeAll` / `calculateMacros` internals.
- No changes to `generate-plan/index.ts` or `normalizeGoal`.
- No changes to `form.goal` or any translation strings.
- No UI/copy changes.

## Verification
Manual preview check for each program route against the test table (TDEE=2500, w=70kg):
- `bulking` → Hypertrophy (2813 / 140P / 268C / 131F)
- `cutting` → Fat Loss (2063 / 154 / 136 / 100)
- `beginner` and `senior` → General Fitness (2500 / 126 / 237 / 116)
