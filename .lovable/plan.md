# Limitation x SessionType x Equipment Capacity Audit (75 min, C1 min = 5)

Investigation only — no code changed. Numbers computed directly from `EXERCISE_POOL`, `SESSION_TARGETS`, `BODYWEIGHT_EXTRA_TARGETS`, `MAX_PER_MUSCLE`, `SESSION_MUSCLE_CAP_OVERRIDES`, `BODYWEIGHT_MUSCLE_CAPS` in `supabase/functions/generate-plan/index.ts` (lines 209-272, 357-432). 47 exercises parsed.

Definitions:
- `pool` = exercises left in that muscle group after equipment + experience-difficulty + limitation filtering
- `cap` = current `maxForMuscle(session, muscle, equipment)`
- `reach` = sum over the session's target muscles of `min(pool, cap)` — the max exercises the session can produce today
- `headroom` = sum of `pool` over the same target set — what the session could reach if every cap were raised to its real pool size
- FIXABLE = headroom >= 5 (redistribution alone suffices); NEEDS-CONTENT = headroom < 5 (no cap arrangement reaches 5)

## Baseline first: failures that exist with NO limitation

Advanced and Intermediate reach 5 everywhere with no limitation. Beginner does not:

| Exp | Equip | Session | reach | pools (pool/cap) |
|---|---|---|---|---|
| Beginner | gym | UL_LOWER_A | 4 | quad 1/2, hamstring 1/1, calf 2/1, core 3/1 |
| Beginner | gym | UL_LOWER_B | 4 | hamstring 1/1, quad 1/2, calf 2/1, core 3/1 |
| Beginner | gym | PPL_PUSH | 4 | chest 1/2, shoulder 2/2, tricep 1/1 |
| Beginner | gym | PPL_PULL | 4 | back 2/3, bicep 4/2 |
| Beginner | gym | PPL_LEGS | 4 | quad 1/2, hamstring 1/1, calf 2/1, core 3/1 |
| Beginner | bodyweight | PPL_PUSH | 4 | chest 2/2, shoulder 0/2, tricep 0/2, core 3/2 |
| Beginner | bodyweight | PPL_PULL | 4 | back 2/3, bicep 0/2, core 3/2 |
| Beginner | bodyweight | WEAKPOINT | 4 | core 3/2, bicep 0/1, tricep 0/2, shoulder 0/2, back 2/3 |

Cause: `isAllowedForExperience` removes every `intermediate`/`advanced` exercise for Beginners, shrinking gym chest to 1, gym tricep to 1, gym quad to 1, gym hamstring to 1, bodyweight back to 2, bodyweight core to 3.

## Items 1 + 2 — Failing combinations at Advanced (best case)

Only these fall below 5. All other SessionType x Limitation x Equipment combinations reach >= 5.

| Equip | Limitation | Session | reach | short | headroom | verdict | pools for EVERY target muscle (pool/cap) |
|---|---|---|---|---|---|---|---|
| gym | knee | UL_LOWER_A | 3 | 2 | 8 | FIXABLE | quad 0/2, hamstring 3/1, calf 2/1, core 3/1 |
| gym | knee | UL_LOWER_B | 3 | 2 | 8 | FIXABLE | hamstring 3/1, quad 0/2, calf 2/1, core 3/1 |
| gym | knee | PPL_LEGS | 3 | 2 | 8 | FIXABLE | quad 0/2, hamstring 3/1, calf 2/1, core 3/1 |
| gym | hip | UL_LOWER_A | 3 | 2 | 8 | FIXABLE | quad 0/2, hamstring 3/1, calf 2/1, core 3/1 |
| gym | hip | UL_LOWER_B | 3 | 2 | 8 | FIXABLE | hamstring 3/1, quad 0/2, calf 2/1, core 3/1 |
| gym | hip | PPL_LEGS | 3 | 2 | 8 | FIXABLE | quad 0/2, hamstring 3/1, calf 2/1, core 3/1 |
| gym | ankle | UL_LOWER_A | 4 | 1 | 9 | FIXABLE | quad 3/2, hamstring 3/1, calf 0/1, core 3/1 |
| gym | ankle | UL_LOWER_B | 4 | 1 | 9 | FIXABLE | hamstring 3/1, quad 3/2, calf 0/1, core 3/1 |
| gym | ankle | PPL_LEGS | 4 | 1 | 9 | FIXABLE | quad 3/2, hamstring 3/1, calf 0/1, core 3/1 |
| gym | shoulder | PPL_PUSH | 4 | 1 | 5 | FIXABLE (exactly 5) | chest 2/2, shoulder 1/2, tricep 2/1 |
| gym | shoulder | WEAKPOINT | 4 | 1 | 10 | FIXABLE | core 3/1, bicep 4/1, tricep 2/1, shoulder 1/2 |
| bodyweight | knee | UL_LOWER_A | 4 | 1 | 6 | FIXABLE | quad 0/2, hamstring 2/2, calf 0/1, core 4/2 |
| bodyweight | knee | UL_LOWER_B | 4 | 1 | 6 | FIXABLE | hamstring 2/2, quad 0/2, calf 0/1, core 4/2 |
| bodyweight | knee | PPL_LEGS | 4 | 1 | 6 | FIXABLE | quad 0/2, hamstring 2/2, calf 0/1, core 4/2 |
| bodyweight | hip | UL_LOWER_A | 4 | 1 | 6 | FIXABLE | quad 0/2, hamstring 2/2, calf 0/1, core 4/2 |
| bodyweight | hip | UL_LOWER_B | 4 | 1 | 6 | FIXABLE | hamstring 2/2, quad 0/2, calf 0/1, core 4/2 |
| bodyweight | hip | PPL_LEGS | 4 | 1 | 6 | FIXABLE | quad 0/2, hamstring 2/2, calf 0/1, core 4/2 |
| bodyweight | wrist | UL_UPPER_A | 4 | 1 | 6 | FIXABLE | chest 0/2, back 2/3, shoulder 0/2, bicep 0/1, tricep 0/2, core 4/2 |
| bodyweight | wrist | UL_UPPER_B | 4 | 1 | 6 | FIXABLE | back 2/3, chest 0/2, shoulder 0/2, tricep 0/2, bicep 0/1, core 4/2 |
| bodyweight | wrist | PPL_PULL | 4 | 1 | 6 | FIXABLE | back 2/3, bicep 0/2, core 4/2 |
| bodyweight | wrist | WEAKPOINT | 4 | 1 | 6 | FIXABLE | core 4/2, bicep 0/1, tricep 0/2, shoulder 0/2, back 2/3 |
| bodyweight | wrist | FB_C | 4 | 1 | 4 | NEEDS-CONTENT | chest 0/2, back 2/3, quad 2/2, tricep 0/2, bicep 0/1 |
| bodyweight | wrist | PPL_PUSH | 2 | 3 | 4 | NEEDS-CONTENT | chest 0/2, shoulder 0/2, tricep 0/2, core 4/2 |
| bodyweight | shoulder | PPL_PUSH | 2 | 3 | 4 | NEEDS-CONTENT | chest 0/2, shoulder 0/2, tricep 0/2, core 4/2 |
| bodyweight | elbow | PPL_PUSH | 4 | 1 | 6 | FIXABLE | chest 2/2, shoulder 0/2, tricep 0/2, core 4/2 |

Limitations with ZERO failing sessions at Advanced: `lower_back` (gym + bodyweight), `elbow` (gym), `wrist` (gym), `ankle` (bodyweight), `shoulder` (gym has the 2 rows above only).

## Items 1 + 2 — Beginner (worst case)

Gym, Beginner — failing sessions per limitation, shown as reach/headroom (F = FIXABLE, NC = NEEDS-CONTENT):
- knee: FB_A 4/6 F, UL_LOWER_A 3/6 F, UL_LOWER_B 3/6 F, PPL_LEGS 3/6 F, PPL_PUSH 4/4 NC, PPL_PULL 4/6 F
- lower_back: UL_LOWER_A 4/7 F, UL_LOWER_B 4/7 F, PPL_LEGS 4/7 F, PPL_PUSH 4/4 NC, PPL_PULL 4/6 F
- shoulder: PPL_PUSH 3/3 NC, UL_LOWER_A 4/7 F, UL_LOWER_B 4/7 F, PPL_LEGS 4/7 F, PPL_PULL 4/6 F, WEAKPOINT 4/9 F
- wrist: PPL_PUSH 4/4 NC, UL_LOWER_A 4/7 F, UL_LOWER_B 4/7 F, PPL_LEGS 4/7 F, PPL_PULL 4/5 F
- ankle: UL_LOWER_A 3/5 F, UL_LOWER_B 3/5 F, PPL_LEGS 3/5 F, PPL_PUSH 4/4 NC, PPL_PULL 4/6 F
- hip: UL_LOWER_A 3/6 F, UL_LOWER_B 3/6 F, PPL_LEGS 3/6 F, PPL_PUSH 4/4 NC, PPL_PULL 4/6 F
- elbow: UL_LOWER_A 4/7 F, UL_LOWER_B 4/7 F, PPL_LEGS 4/7 F, PPL_PUSH 4/4 NC, PPL_PULL 4/6 F

Beginner gym `PPL_PUSH` is NC under every limitation because the Beginner-eligible push pool is only chest 1 + shoulder 2 + tricep 1 = 4 total.

Bodyweight, Beginner — NEEDS-CONTENT cases (headroom < 5):
- knee: FB_C 4/4, UL_LOWER_A 3/4, UL_LOWER_B 3/4, PPL_LEGS 3/4
- hip: FB_C 4/4, UL_LOWER_A 3/4, UL_LOWER_B 3/4, PPL_LEGS 3/4
- shoulder: FB_C 4/4, PPL_PUSH 2/3
- wrist: FB_C 4/4, PPL_PUSH 2/3

All other bodyweight Beginner failures are FIXABLE at headroom exactly 5 (core 3 + back 2).

## Item 3 — Redistribution sufficiency

Truly unfixable with today's content (headroom < 5):

| Exp | Equip | Limitation | Session | reach | headroom | content gap |
|---|---|---|---|---|---|---|
| Advanced / Intermediate | bodyweight | shoulder | PPL_PUSH | 2 | 4 | shoulder excludes all BW chest + tricep; only core 4 remains |
| Advanced / Intermediate | bodyweight | wrist | PPL_PUSH | 2 | 4 | wrist excludes all BW chest + tricep |
| Advanced / Intermediate | bodyweight | wrist | FB_C | 4 | 4 | chest 0, tricep 0, bicep 0 (no BW bicep exists at all) |
| Beginner | gym | any | PPL_PUSH | 3-4 | 3-4 | Beginner-eligible gym push pool is 4 exercises total |
| Beginner | bodyweight | knee / hip | FB_C, UL_LOWER_A/B, PPL_LEGS | 3-4 | 4 | quad 0, calf 0 (no BW calf exists), hamstring 1 at Beginner |
| Beginner | bodyweight | shoulder / wrist | FB_C, PPL_PUSH | 2-4 | 3-4 | chest 0, tricep 0, bicep 0 |

Everything else — including every gym Knee case the coach reported (UL_LOWER_A/B and PPL_LEGS: reach 3, headroom 8) — is fixable today by redistribution alone: hamstring 3, calf 2, core 3 sit in the same session with caps of 1 each.

Knee + Lower Back combined (gym, Advanced): UL_LOWER_A / UL_LOWER_B / PPL_LEGS all reach 3, headroom 6 (quad 0, hamstring 1, calf 2, core 3) — still FIXABLE, margin drops from 8 to 6 because lower_back removes 2 of 3 hamstring options.

## Item 4 — Scoping conclusion (no fix proposed)

A general "when a target muscle's pool is exhausted, redistribute remaining slots to the session's other target muscles up to their real pool size" rule would resolve every gym failure at Advanced/Intermediate, all reported Knee/Hip/Ankle legs cases, and the Knee + Lower Back combination.

It would not resolve the NEEDS-CONTENT rows. Those need new exercise content, specifically: bodyweight calf (0 exist), bodyweight bicep (0 exist), bodyweight shoulder (0 exist), knee-safe and hip-safe quad options in both pools (0 after filtering), beginner-eligible gym chest and tricep (1 each), and shoulder-safe / wrist-safe bodyweight pressing (0).