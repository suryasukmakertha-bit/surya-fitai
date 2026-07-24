## Verification Report (Read-Only, No Code Changes)

### Item 1 — Playwright: remaining "start new plan" entry points

**(a) Index.tsx:659 `onGenerate` — "Generate New" button on logged-in dashboard**

- Element triggered: `<button>Generate New</button>` on `/` (LoggedInDashboard, line 466).
- Resulting URL: `http://localhost:8080/program/custom`
- Console errors: `[]` (empty)

**(b) Index.tsx:661 `onOpenPrograms`**

- Playwright DOM inspection of `/` (logged-in): no element in `LoggedInDashboard` invokes the `onOpenPrograms` prop. `rg` confirms only 3 hits in `src/pages/Index.tsx`:
  - line 54 (interface declaration)
  - line 58 (destructure in `LoggedInDashboard({ ... onOpenPrograms, ... })`)
  - line 661 (parent passes `() => navigate("/program/custom")`)
- No `onClick={onOpenPrograms}` or equivalent anywhere in the component body — **dead prop**. Not triggerable via UI. Console errors: N/A.

**(c) Results.tsx:801 `handleStartFreshProgram` — post-completion "Start Fresh"**

- Not triggerable via Playwright in the current DB state: `SELECT ... FROM saved_plans WHERE plan_completed_at IS NOT NULL` returns 0 rows for all users, so `PlanCompletionModal` cannot be opened through the normal 80%-threshold path (`Results.tsx:483, 624, 628`) or the Extend banner path (`Results.tsx:1420`, gated on `PlanExtendBanner` visibility).
- Source-level confirmation only: `handleStartFreshProgram` (line 799–802) executes `setShowCompletionModal(false); navigate("/program/custom");`. Wired to `PlanCompletionModal.onStartFresh` at line 1831. No other target string exists in the function body.
- Recommendation: to close this gap with actual runtime evidence, either (i) seed a test row with `plan_completed_at` set + sufficient `workout_completions` to satisfy `guard_saved_plan_completion`, or (ii) run E2E from a fresh test account through 80% completion. Both are out of scope for this read-only turn.

### Item 2 — Actual save test: `program_type` write

Executed full end-to-end via Playwright as authenticated user `7887903d-bd3a-4fd3-865a-061543abb9f7`:

1. Navigate to `/program/custom`
2. Fill form (name=PWVerify2, age=30, male, 70kg, 175cm, General Fitness, Beginner, 3 days, <4000 steps, Omnivore, Asian, 3 meals/day, today's start date)
3. Click "Generate My Plan" → real `generate-plan` edge function call
4. Navigate to `/results`
5. Click "Save Plan Now" (in `SavePlanReminderModal`, which invokes `handleSave` → `Results.tsx:1159–1167` `saved_plans` insert)

**Raw DB row** (`SELECT id, program_type, plan_name, created_at FROM saved_plans WHERE created_at > NOW() - INTERVAL '15 minutes'`):

```
                  id                  | program_type |     plan_name      |          created_at           
--------------------------------------+--------------+--------------------+-------------------------------
 c8d59b6b-d599-4131-87df-68e89b552886 | custom       | PWVerify2 - Custom | 2026-07-24 05:20:20.644302+00
```

- **Row id**: `c8d59b6b-d599-4131-87df-68e89b552886`
- **user_id**: `7887903d-bd3a-4fd3-865a-061543abb9f7` (test/dev account "Aci")
- **program_type**: `custom` ✅ (matches `programType || "custom"` at Results.tsx:1161, driven by URL param `type = "custom"` from `/program/:type` route)
- **plan_name**: `PWVerify2 - Custom` (matches Results.tsx:1146 template)

Test row left in place; identifiable by the id above if cleanup is desired.

### Summary

| Check | Result |
|---|---|
| Index onGenerate → `/program/custom` | ✅ Verified live |
| Index onOpenPrograms | ⚠️ Dead prop (never invoked in DOM); source target is `/program/custom` |
| Results handleStartFreshProgram | ⚠️ Not runtime-verifiable (no completed plans in DB); source target is `/program/custom` |
| DB `program_type` written as `"custom"` | ✅ Verified with raw row above |

No code changes made.
