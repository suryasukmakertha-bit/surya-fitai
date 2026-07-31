# Results Header: Remove Calibration Card + Translate Program Overview

Two independent fixes in the plan-overview area of the Results page.

## Item 1 — Remove the "Coach's Program Calibration" card

Delete the gear/clock card that says "Session time matched: 60 minutes (5 min warm-up + lifting + 5 min cool-down)".

- Remove the JSX block at `src/pages/Results.tsx:1290-1304`.
- Remove the now-orphaned i18n keys in `src/contexts/LanguageContext.tsx`:
  - `coachCalibration` (EN L368, ID L1024, ZH L1671)
  - `sessionTimeBanner` (EN L340, ID L996, ZH L1643)
- Keep `plan.estimatedSessionTimeMinutes` in the data model untouched — it is still used by the PDF export (`src/lib/exportPdf.ts:200-204`) and written by the engine (`generate-plan/index.ts:840`).
- Evidence that removal is safe: the block is a plain leaf fragment with no hooks, effects, state, or handlers; both keys have exactly one consumer each.

## Item 2 — Make the Coach Surya program overview translatable

Today `programOverview` is a fully English server-composed string (`supabase/functions/generate-plan/index.ts:826`) rendered raw (`src/pages/Results.tsx:1320`), so it never translates.

Convert it to the existing `{key, params}` + `resolveTemplated()` pattern already used by `motivational_message` and `weight_projection`.

### Locked rule: split-type names stay English

New i18n keys cover ONLY the surrounding sentence template. The split-type name ("Upper Body A", "Push", "Full Body B", ...) is passed through as a plain English parameter and is NOT translated in any language. No `split.*` keys will be created.

### Server change (`generate-plan/index.ts`)

Emit an object instead of a string:

```text
programOverview = {
  key: "programOverviewTemplate",
  params: {
    days:  trainingDaysPerWeek,           // number
    split: sessionLabel(sessionOrder[0]), // English, passed through as-is
    goal:  goal,                          // canonical token -> resolved client-side
    level: experience                     // canonical token -> resolved client-side
  }
}
```

`goal` and `level` are sent as canonical tokens so the client can map them to existing localized labels.

### Client change (`src/pages/Results.tsx`)

- Render via `resolveTemplated(plan.programOverview)` (helper already exists at L349-355), keeping the existing string branch so old saved plans holding a literal English string still render unchanged.
- Before resolving, map the `goal` and `level` params to localized labels using existing keys:
  - goals: `goalStrength`, `goalHypertrophy`, `goalFatLoss`, `goalBodyRecomp`, `goalGeneralFitness`
  - levels: `beginner`, `intermediate`, `advanced`
- `src/lib/exportPdf.ts:226-230` also renders `programOverview` raw; it will be updated to accept the new object shape (resolved the same way) so PDF export never prints `[object Object]`.

### New i18n key (EN / ID / ZH)

One key, `programOverviewTemplate`, e.g. EN:
`"A rule-based {days}-day {split}-anchored program tuned for {goal} at {level} level. Weeks 1-3 progress linearly; week 4 deloads to consolidate gains."`
plus ID and ZH equivalents. `{split}` renders the English split name in all three languages by design.

### Reused, not recreated

- Goal labels: EN L79-83 / ID L735-739 / ZH L1382-1386
- Experience labels: EN L86-88 / ID L742-744 / ZH L1389-1391
- `deloadWeekLabel` is not reused — the deload phrasing lives inside the single template sentence.

## Out of scope

Workout engine logic, `estimatedSessionTimeMinutes` computation, split naming, tab structure, completion tracking, quota/subscription logic.

## Verification

- Full build.
- Playwright with the fixture account: open a plan, confirm the calibration card is gone, and confirm the Coach Surya paragraph changes across EN/ID/ZH while the split name stays English.
- Confirm an old saved plan (literal-string `programOverview`) still renders.
- Redeploy the edge function and confirm with a log timestamp.