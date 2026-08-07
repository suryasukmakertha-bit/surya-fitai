- Fix: bodyweight sessions falling below the minimum exercise count

## Problem (measured, not assumed)

- With `equipment = bodyweight`, three muscle groups have an empty pool: **shoulder (0), bicep (0), calf (0)**. Every session type whose target list leans on those groups cannot physically reach the required exercise count, so users get 3-4 exercise sessions where 5 are expected at 75 minutes.

Measured on Hypertrophy / Intermediate / 5 days / 75 min / bodyweight:
Push 3, Pull 3, Legs 4, Upper A 5, Lower A 4 — four of five days short. Category correctness is fine (0 violations); this is purely a count shortfall.

## Approach

Two bodyweight-only adjustments in the workout engine. Gym behaviour, session labels, split selection, progression, rotation memory, and output shape are untouched.

### 1. Bodyweight-specific muscle caps

Today one global cap table applies to both equipment types. Those caps were sized for the 27-exercise gym pool. Add a bodyweight cap table used only when `equipment === 'bodyweight'`:


| Muscle                  | Gym cap (unchanged) | Bodyweight cap                   |
| ----------------------- | ------------------- | -------------------------------- |
| chest                   | 2                   | 2                                |
| back                    | 2                   | 3                                |
| tricep                  | 1                   | 2                                |
| quad                    | 2                   | 2                                |
| hamstring               | 1                   | 2                                |
| core                    | 1                   | 2                                |
| shoulder / bicep / calf | 2 / 1 / 1           | unchanged (pool is empty anyway) |


Caps still never exceed the real pool size, so no duplicates inside a single day.

### 2. Bodyweight session-target extension

Core is a legitimate accessory on any session and has the deepest bodyweight pool (3-4). For bodyweight only, append `core` to the target list of the session types that currently have no way to fill their slots: Push, Pull, Upper A, Upper B, and Weak-Point. Push and Weak-Point also get `chest` / `back` respectively as a final fallback slot. Target lists for gym stay exactly as they are.

### Result after both changes (theoretical max vs. the 5-exercise 75-min minimum)


| Session             | Beginner                   | Intermediate/Advanced |
| ------------------- | -------------------------- | --------------------- |
| Full Body A / B / C | 5-7                        | 7-9                   |
| Upper A / Upper B   | 6                          | 9                     |
| Lower A / Lower B   | 5                          | 6                     |
| Push                | n/a (no PPL for beginners) | 6                     |
| Pull                | n/a                        | 5                     |
| Legs                | n/a                        | 6                     |
| Weak-Point          | n/a                        | 6                     |


Every reachable combination of experience x session type x duration clears the minimum.

## Verification (raw output, same protocol as the gym fixes)

1. Re-run the three bodyweight scenarios via the Deno harness (zero quota): Hypertrophy/Intermediate/5d/75min, Beginner/3d/75min, Intermediate/4d/75min — report per-day exercise count and muscle group.
2. Re-run the cross-session-type theoretical-max audit for bodyweight at 45/60/75 min, all three experience levels — expect zero failing rows.
3. Confirm zero category violations on all three scenarios.
4. Confirm no duplicate exercise within any single day.
5. Regression: re-run the gym scenario (Hypertrophy/Intermediate/5d/75min gym) and confirm the previously verified counts 5,5,5,6,5 and zero violations are unchanged.
6. Build exit code, then deploy the edge function and report the deployment timestamp.

## Technical notes

- Single file: `supabase/functions/generate-plan/index.ts`.
- New `BODYWEIGHT_MUSCLE_CAPS` table plus an equipment argument threaded into the existing `maxForMuscle(session, muscle)` helper.
- New `bodyweightTargetsFor(session)` wrapper around `SESSION_TARGETS`, applied only in the bodyweight branch; the existing `SESSION_TARGETS` constant is not edited.
- Existing `SESSION_MUSCLE_CAP_OVERRIDES` (PPL_PULL back 3 / bicep 2) stays; bodyweight caps take precedence for bodyweight only.
- Not touched: fill-pass category constraint (C4a), relaxed cross-day reuse (C4), rotation memory (C5), cardio finisher (C6), progression (Layer E), extension carry-forward.

## Out of scope

- Adding new bodyweight exercises for shoulder / bicep / calf (would need new names plus demo assets and a spec update).
- The unrelated rest-day distribution gap observed during the investigation (`weekly_schedule` still trains the first N consecutive days instead of the distributed pattern in the spec). Separate change if you want it.
- MEAL_TEMPLATE_LOGIC.md remains absent from the repo, per your answer.