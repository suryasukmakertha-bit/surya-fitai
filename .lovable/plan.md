## Goal

Restructure the plan results screen from 5 tabs to 3: **Workout Plan / Meal Plan / Progress**. All changes are confined to `src/pages/Results.tsx` plus label strings in `src/contexts/LanguageContext.tsx`. No engine, PDF, PNG, subscription, or DB changes.

## Changes

### 1. Tab list (`Results.tsx` 1357–1414)
- Remove the `grocery` trigger (1373–1385) and the `info` trigger (1386–1398).
- Keep `workout` (ungated), `meals` (gated), `progress` (gated, still wrapped in `planId && user`).
- Keep the existing inline `onPointerDown` free-tier lock handler and `Lock` icon verbatim on `meals` and `progress` — same condition (`access.isFreeTier && !access.isUnlimited`), same `openPopup('locked_tab')`. Workout stays open.
- Keep `data-tour="tab-workout" | "tab-meals" | "tab-progress"`; drop `tab-grocery` / `tab-info` (nothing consumes them).

### 2. Meal Plan tab — Grocery List as collapsible
- Move the grocery card body (current 1560–1574) to the end of `TabsContent value="meals"`, wrapped in a shadcn `Collapsible` (default collapsed) with a trigger row: `ShoppingCart` icon + `t.weeklyGrocery` + chevron.
- Rendering logic unchanged: `plan.grocery_list?.map(...)` through `resolveFoodLine`, same 2/3-column grid. No new state beyond the collapsible's open flag.
- Delete `TabsContent value="grocery"`.

### 3. Workout Plan tab — relocated content
Appended after the existing Cool-Down / estimated-calories block (after 1538), preserving current markup and data fields:
- **Deload Week** — `plan.deloadWeek`, heading `t.deloadWeekLabel` (always visible card).
- **Progress Projection** — `plan.weight_projection` via `resolveTemplated`, heading `t.progressProjection` (always visible card).
- **Collapsible group** (default collapsed) containing:
  - Safety Notes — `plan.safety_notes[]`, heading `t.safetyNotes`
  - Weekly Schedule Overview — `plan.weekly_schedule[]`, 7-column grid, heading `t.weeklySchedule`
  - The collapsible only renders if at least one of the two arrays is non-empty.

### 4. Info & Safety tab — deleted
- Remove `TabsContent value="info"` (1576–1641) entirely after the moves above.
- **Warnings** (`plan.warnings`) and **Recovery Tips** (`plan.recoveryTips`) are removed from the UI for good — no relocation.
- Progression Rules stays where it already is (Progress tab, 1650–1663) — untouched.

### 5. i18n (`LanguageContext.tsx`)
- No new strings needed. Reused: `workoutPlan`, `mealPlan`, `progressTab`, `weeklyGrocery`, `deloadWeekLabel`, `progressProjection`, `safetyNotes`, `weeklySchedule` — all three languages already present.
- One new key trio only if the Workout-tab collapsible needs its own header label (e.g. "Program Details" / "Detail Program" / "计划详情"); otherwise the collapsible is unlabeled and shows the two headings inside.
- Leave `groceryList`, `infoSafety`, `warningsLabel`, `recoveryTipsLabel` in the dictionary (harmless, avoids touching unrelated consumers).

## Explicitly not touched
`generate-plan` edge function (still emits `warnings`, `recoveryTips`, `grocery_list`, `deloadWeek`, `weight_projection` unchanged), `exportPdf.ts` (PDF still prints Grocery List, Progression Rules, Deload Week, Recovery Tips), PNG share cards, `WorkoutChecklist`, `WorkoutProgressSummary`, `useSubscription.ts`, routes, completion tracking.

## Verification
- Full build + typecheck.
- Playwright with the fixture account (`surya.sukmakertha+apptest123@gmail.com`): confirm exactly 3 triggers, Grocery collapsible expands with resolved food names, Deload/Projection/Safety/Schedule render in the Workout tab, Progress tab still loads.
- Confirm all three languages render translated tab labels and section headings.
- Free-tier lock check: confirm Meal Plan and Progress still fire the locked popup and Workout does not.
