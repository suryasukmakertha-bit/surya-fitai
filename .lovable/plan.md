# Pre-Publish Readiness Report

Plan mode restricts stateful commands. Part 1 is complete (pure reads); Part 2 requires running Playwright, which submits the form and triggers a real `generate-plan` invocation + DB write — that's stateful, so I'm listing exactly what I'll run once you approve.

---

## PART 1 — Test-Only Export Block Audit (complete, evidence below)

### 1. Where the "exports" live now

Two locations:

**A. `supabase/functions/generate-plan/index.ts`** — `export` keyword prefixed on top-level declarations (13 sites):

```
127: export function calculateMacros(tdee, weight, goal, _programType?)
207: export const EXERCISE_POOL: ExerciseDef[]
282: export function pickSessionOrder(days, exp)
697: export function generateWorkout(input)
785: export function normalizeGoal(raw, programType)
849: export const MEAL_FOOD_DB
988: export const MEAL_DIST
994: export const MEAL_TIMES_NORMAL
1000: export const MEAL_TIMES_IF
1007: export const MEAL_NAME_KEYS
1016: export const MEAL_NAME_KEYS_IF
1028: export function pickQty(...)
1042: export function pickRotated(...)
1055: export function buildMealPlan(...)
```

These are inline `export` prefixes on declarations, not a trailing test-only block. The trailing block referenced in earlier prompts was moved into a sibling file per an earlier turn.

**B. `supabase/functions/generate-plan/_exports.ts`** — full file (20 lines), pure re-exports:

```ts
// Test-harness re-exports. Not imported by index.ts and therefore has zero
// effect on the deployed edge function runtime (serve() in index.ts is the
// only entrypoint invoked by Supabase). Kept as a sibling so the production
// entry file has no test-scaffolding residue.
export { generateWorkout, buildMealPlan, EXERCISE_POOL, pickSessionOrder,
  MEAL_FOOD_DB, MEAL_DIST, MEAL_TIMES_NORMAL, MEAL_TIMES_IF,
  MEAL_NAME_KEYS, MEAL_NAME_KEYS_IF, pickQty, pickRotated,
  normalizeGoal, calculateMacros } from "./index.ts";
```

### 2. Reachability — grep evidence

Repo-wide search for consumers of either the exports or the sibling file (`rg -n "from.*generate-plan|_exports" -g '!node_modules' .`):

- **No import statements found in any client (`src/**`) or other edge function (`supabase/functions/**`) referencing `generate-plan/index.ts`, `generate-plan/_exports.ts`, or any of the exported symbols.**
- Only hits are documentation prose in `KNOWLEDGE.md` and a comment in `src/lib/fitnessCalculations.ts`.
- The client calls the function via `supabase.functions.invoke("generate-plan", ...)` (HTTP), not via ESM import.

### 3. Request-path impact — trace of `serve()`

- `serve(async (req) => { ... })` at the bottom of `index.ts` is the sole Supabase entrypoint. Its body handles CORS, JWT parse, quota reservation, then `generateWorkout(...)` / `buildMealPlan(...)` (called by name — those functions would run whether or not they had the `export` keyword).
- `_exports.ts` is **not** referenced from `index.ts`. Supabase's edge runtime loads only the deployed function's entry module (`index.ts`); sibling files not imported by it are never loaded on a request.
- The `export` keyword in Deno/TS is a compile-time module-graph marker with **zero runtime side effect**. It doesn't add code, doesn't run at load, and doesn't alter `serve()` behavior.

### 4. Classification

**(a) Fully inert dead code — from the deployed function's runtime perspective.**

- `_exports.ts`: not imported by `index.ts` → not loaded at request time → cannot affect real traffic.
- Inline `export` keywords in `index.ts`: metadata only → zero effect on the executed code path.

The block is safe to leave for the Deno test harness. No removal needed for correctness or safety; only a cosmetic concern if you want the production file with zero test scaffolding (already addressed by the earlier move to `_exports.ts`).

---

## PART 2 — End-to-End Smoke Test (proposed execution)

I have not run this yet because it triggers a live `generate-plan` call and a `saved_plans` DB write (stateful, disallowed in plan mode). On approval, I will execute the following in one Playwright script and paste raw output:

### Steps

1. Restore injected Supabase session, navigate to `/program/custom`.
2. Fill: name=SmokeTest, age=30, male, 70kg, 175cm, Hypertrophy, Intermediate, 4 days, 8k steps, Omnivore, Asian, 3 meals/day, start=today, equipment=full-gym.
3. Submit, capture:
   - Any console errors during generation
   - The `generate-plan` response — **top-level keys only** (e.g. `workout_plan`, `meal_plan`, `grocery_list`, `calorie_target`, `protein`, `carbs`, `fat`, `weekly_schedule`, `safety_notes`, `warnings`, `progressionRules`, `deloadWeek`, `recoveryTips`, `motivational_message`, `weight_projection`, `estimated_calories_burned`, `water_liters`)
4. On `/results`, click each of the 5 tabs (Workout / Meals / Grocery / Info / Progress) and screenshot + inspect DOM text for:
   - **Workout tab**: any string starting with `exercise.` (raw key leakage), presence of sets/reps/RIR text, "Deload Week" / "Progress Projection" sections.
   - **Meals tab**: any string starting with `food.` or `meal.` (raw key leakage), macro numbers.
   - **Grocery tab**: item count, sample items, any raw `food.` keys.
   - **Info tab**: enumerate what section headings actually render (Warnings, Recovery Tips, Progression Rules, Deload Week, Safety Notes — report actual DOM, don't assume).
   - **Progress tab**: load without error, screenshot.
5. Switch language → Indonesian; reload `/results`; re-check Workout + Meals tabs for translated exercise/food names vs. English fallback vs. raw keys.
6. Repeat step 5 for Chinese (`zh`).
7. Aggregate console error array across the whole run.

### Output format

Raw values only:
- `errors: []` arrays per language
- top-level JSON keys as a list
- per-tab: sample text extracted from DOM (first 3-5 items)
- screenshots viewed with `code--view` and referenced by path

### Notes / caveats

- Test will create 1 real `saved_plans` row (identifiable by name `SmokeTest`), consuming 1 quota unit for the test user.
- If language-switching requires a full page reload for i18n keys to re-render exercise/food strings (currently these are resolved via `tKey` in `Results.tsx` / `exportPdf.ts`), the test will reload after each switch.

Approve to proceed.
