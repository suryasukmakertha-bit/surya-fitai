# WORKOUT_TEMPLATE_LOGIC.md

**Status:** Design finalized 30 Jun 2026. Rest-day distribution added and confirmed by Coach 5 Aug 2026. A category-filtering bug in exercise selection (Layer C) found and partially fixed 5 Aug 2026 — see Layer C correction note and Open Items for the still-unresolved piece.
**Supersedes:** KNOWLEDGE.md Section 3 (old AI-prompt-based plan generation logic)
**Context:** This document defines the full rule-based (non-AI) workout plan generation engine that replaces the old `generate-plan/index.ts` AI Gateway call (Lovable AI Gateway → Gemini 3 Flash). No AI call is used anywhere in this system. All logic below is deterministic.
**⚠️ Process note (5 Aug 2026):** this file was never actually uploaded to the Lovable project as a reference document — Lovable had no direct access to it, only to Claude's prompts describing pieces of it. This is a likely contributor to spec-drift (e.g. the rest-day distribution rule below was never implemented because it never existed in any form Lovable could read). Recommend uploading this file (and MEAL_TEMPLATE_LOGIC.md) into the Lovable project itself, same as KNOWLEDGE.md, so future work can reference it directly.

---

## 0. Input Schema (from the redesigned generate-plan form)

The engine consumes exactly these fields. Any field not listed here does NOT affect workout generation (some feed the separate meal plan engine instead).

| Field | Type | Values |
|---|---|---|
| Fitness Goal | enum (single-select) | Hypertrophy, Strength, Fat Loss, Body Recomposition, General Fitness |
| Experience Level | enum (single-select) | Beginner, Intermediate, Advanced |
| Training Days/Week | enum (dependent dropdown on Experience Level) | Beginner: 2-5, Intermediate: 2-6, Advanced: 2-7 |
| Session Duration | number (slider, minutes) | Typically 45 / 60 / 75+ |
| Available Equipment | enum (single-select) | Bodyweight Only, Full Gym |
| Physical Limitations | multi-select (9 options) | Knee, Lower Back, Shoulder, Wrist, Ankle, Hip, Elbow, Pregnancy, None |
| Training Start Date | date | feeds `plan_started_at` — unchanged from existing system |

Age/Gender/Weight/Height/Activity Level/Diet fields feed the separate MEAL_TEMPLATE_LOGIC.md engine, not this one.

---

## LAYER A — Split Selector

**Rule: Split type is a pure function of Training Days/Week × Experience Level. Fitness Goal does NOT affect split type** — Goal only affects Layer D (volume/intensity). This keeps the split matrix small (~12 combinations) and matches real-world program design, where the same exercise/day-slot structure serves multiple goals via different sets/reps/RIR.

Training Days/Week is a **dependent dropdown**: the options shown change based on Experience Level, enforced at the form/UI level (not just a backend warning):
- Beginner → 2, 3, 4, 5 days only
- Intermediate → 2, 3, 4, 5, 6 days
- Advanced → 2, 3, 4, 5, 6, 7 days

### Split Table

| Days/Week | Beginner | Intermediate | Advanced |
|---|---|---|---|
| 2 | Full Body A/B | Full Body A/B | Full Body A/B |
| 3 | Full Body A/B/C | Full Body A/B/C | Push/Pull/Legs |
| 4 | Upper/Lower A/B | Upper/Lower A/B | Upper/Lower A/B |
| 5 | Upper/Lower + 1 Full Body | Push/Pull/Legs + Upper/Lower | Push/Pull/Legs/Upper/Lower |
| 6 | *(not available)* | Push/Pull/Legs ×2 | Push/Pull/Legs ×2 |
| 7 | *(not available)* | *(not available)* | Push/Pull/Legs ×2 + 1 Full Body/Weak-Point day |

**⚠️ Known structural tension (found 5 Aug 2026):** the 5-day Intermediate/Advanced rows deliberately combine PPL with Upper/Lower in the same week. These two systems have heavily overlapping muscle-group targets (e.g. PPL_PUSH and UL_UPPER_A both target chest/shoulder/tricep). Combined with Layer C4's week-global no-repeat rule and small per-category pool sizes (e.g. only 2 Tricep exercises total in the gym pool), this can starve later sessions in the week of enough distinct in-category exercises to hit the Layer C1 count target. See Layer C correction note and Open Items — not yet resolved as of 5 Aug 2026.

### Rest Day Distribution (added 5 Aug 2026, Coach-confirmed)

**Rule: rest days are distributed across the week, not front-loaded/consecutive-block.** The previous (undocumented, accidental) implementation trained the first N calendar days of the week and rested the remainder (e.g. 5 days/week = train Mon-Fri, rest Sat-Sun). This was never a specified design decision — it was an implementation default that happened to ship. Coach reviewed and rejected it in favor of spreading rest days through the week to avoid long unbroken training stretches.

Training-day weekday indices (Monday = index 0) per Days/Week — training days consume `sessionOrder` in array order, i.e. `sessionOrder[0]` lands on the first listed weekday index, `sessionOrder[1]` on the second, etc.:

| Days/Week | Training weekday indices (Mon=0) | Pattern (T=train, R=rest) | Weekdays |
|---|---|---|---|
| 2 | [0, 3] | T-R-R-T-R-R-R | Mon, Thu |
| 3 | [0, 2, 4] | T-R-T-R-T-R-R | Mon, Wed, Fri |
| 4 | [0, 1, 3, 4] | T-T-R-T-T-R-R | Mon, Tue, Thu, Fri |
| 5 | [0, 1, 2, 4, 5] | T-T-T-R-T-T-R | Mon, Tue, Wed, Fri, Sat |
| 6 | [0, 1, 2, 4, 5, 6] | T-T-T-R-T-T-T | Mon, Tue, Wed, Fri, Sat, Sun |
| 7 | [0, 1, 2, 3, 4, 5, 6] | T-T-T-T-T-T-T | All days (Advanced only, per split table) |

This table is the same for every split type at a given Days/Week count — the pattern doesn't vary by Push/Pull/Legs vs Upper/Lower vs Full Body. If a future need arises to vary the pattern by split type (e.g. always resting the day after a Legs session specifically), that's a new decision, not implied by this table.

---

## LAYER B — Exercise Pool

The exercise pool is a **typed data structure**, not AI prompt text. Each exercise has:

```typescript
interface Exercise {
  id: string;
  name: string;                  // canonical name — one name per physical movement
  muscleGroup: MuscleGroup;      // 'chest' | 'back' | 'shoulder' | 'bicep' | 'tricep' 
                                  // | 'quad' | 'hamstring' | 'calf' | 'core' | 'cardio'
  equipment: 'bodyweight' | 'gym';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  isCompound: boolean;
  excludedBy: Limitation[];      // array of limitation categories this exercise is unsafe for
  demoKey: string;                // filename in STATIC_GIF_MAP (all confirmed uploaded)
}
```

### One-Canonical-Name Principle

Each physically-distinct movement has exactly ONE name. The old system's alias map (one image serving 3-6 different name strings, e.g. "Push Up"/"Standard Push Up"/"Floor Push Up" all identical) is retired — that flexibility existed only because the old AI could phrase the same movement many ways in free text. A rule-based engine selects from fixed data, so aliasing is unnecessary.

### GYM Pool (27 exercises)

| Muscle Group | Exercises | Compound? |
|---|---|---|
| Chest | Barbell Bench Press, Incline Barbell Press, Cable Crossover | First two: yes / Crossover: no |
| Back | Lat Pulldown, T-Bar Row, Face Pull, Barbell Upright Row | Lat Pulldown/T-Bar Row: yes / others: no |
| Shoulder | Seated Dumbbell Press, Lateral Raise (Dumbbell), Machine Shoulder Press | Seated DB Press/Machine Press: yes / Lateral Raise: no |
| Bicep | Barbell Curl, Dumbbell Curl, Hammer Curl, Concentration Curl | All isolation |
| Tricep | Tricep Pushdown (Cable), Skull Crushers | All isolation |
| Quad | Box Squat, Bulgarian Split Squat, Dumbbell Lunge | All compound |
| Hamstring | Romanian Deadlift (Dumbbell), Barbell Glute Bridge, Glute Bridge | All compound |
| Calf | Standing Calf Raise, Seated Calf Raise | All isolation |
| Core | Forearm Plank, Dead Bug, Side Plank (Knee Version) | N/A (isometric/core) |

**⚠️ Small-pool risk (noted 5 Aug 2026):** Tricep (2) and Calf (2) are the smallest categories. Combined with the Layer A structural tension above, these are the categories most likely to run out mid-week on a 5-day PPL+UL split. If the Open Item below is resolved by expanding pool size rather than relaxing week-uniqueness, these two categories are the priority candidates.

### Bodyweight Pool (15 exercises, canonical names post-consolidation)

| Muscle Group | Exercises | Compound? |
|---|---|---|
| Chest | Push Up, Incline Push Up | Both compound |
| Back | Inverted Row, Superman Hold, Bird Dog | Inverted Row: compound / others: isometric |
| Shoulder | *(Push Up shared from Chest)* | — |
| Bicep | *(none — no bodyweight bicep isolation exists; deliberately skipped)* | — |
| Tricep | Bench Dip, Close Grip Push Up | Both compound |
| Quad | Reverse Lunge, Wall Sit | Both compound/isometric |
| Hamstring | Glute Bridge, Single Leg Glute Bridge | Both compound |
| Core | Forearm Plank, Dead Bug, Hollow Body Hold, Bicycle Crunch | N/A |

### Cardio Finisher Pool (5 exercises — see Layer C for usage rules)

| Exercise | Difficulty |
|---|---|
| Jumping Jack | Beginner |
| High Knees | Beginner |
| Mountain Climber | Intermediate |
| Jump Squat | Intermediate |
| Burpee | Advanced |

### Difficulty Tags

**Advanced-only** (excluded from Beginner/Intermediate pools entirely): Bulgarian Split Squat, Hollow Body Hold, Burpee.

All other exercises are tagged Beginner or Intermediate as their minimum entry point (an Intermediate-tagged exercise is available to both Intermediate and Advanced users; a Beginner-tagged exercise is available to all three levels).

### Limitation Exclusion Table (`excludedBy`)

| Limitation | Excluded Exercises |
|---|---|
| **Knee** | Box Squat, Bulgarian Split Squat, Dumbbell Lunge, Reverse Lunge, Wall Sit, Jump Squat |
| **Lower Back** | Romanian Deadlift (Dumbbell), T-Bar Row, Barbell Glute Bridge, Burpee |
| **Shoulder** | Seated Dumbbell Press, Machine Shoulder Press, Barbell Upright Row, Incline Barbell Press, Push Up, Incline Push Up, Close Grip Push Up, Bench Dip, Burpee, Mountain Climber |
| **Wrist** | Barbell Bench Press, Barbell Curl, Barbell Upright Row, Push Up, Incline Push Up, Close Grip Push Up, Bench Dip, Inverted Row, Mountain Climber, Burpee |
| **Ankle** | Standing Calf Raise, Seated Calf Raise, Reverse Lunge, Jump Squat, Jumping Jack, High Knees, Burpee — **Mountain Climber explicitly allowed** (no landing/impact phase; keeps the cardio finisher pool viable for Ankle-limited users) |
| **Hip** | Box Squat, Bulgarian Split Squat, Dumbbell Lunge, Reverse Lunge, Wall Sit, High Knees, Mountain Climber |
| **Elbow** | Skull Crushers, Bench Dip, Close Grip Push Up |
| **Pregnancy** | *(no exclusion list — disclaimer only: "Consult your doctor/OB-GYN before starting." Product/liability decision; the app does not attempt to generate a prenatal-safe program.)* |
| **None** | *(no exclusions)* |

### Demo Assets

All 47 exercises have confirmed working `.jpg` demo assets in the `surya-fitai-assets` GitHub repo. `.gif` format is reserved exclusively for the Daily Challenge feature — never used for workout plan demos.

---

## LAYER C — Exercise Selection Algorithm

### C1. Exercise Count Per Session (hard cap, by duration)

| Session Duration | Min Exercises | Max Exercises |
|---|---|---|
| ≤45 min | 3 | 4 |
| 60 min | 4 | 5 |
| 75+ min | 5 | 6 |

### C2. Max Per Muscle Group (per session)

Chest 2, Back 2, Shoulder 2, Bicep 1, Tricep 1, Quad 2, Hamstring 1, Calf 1, Core 1.

### C3. Ordering Rule

**Compound-before-isolation is universal across all 5 Fitness Goals.** Within each muscle-group slot in a session, compound movements are placed before isolation movements.

### C4. Week-Level Uniqueness

No exercise may repeat across different training days within the same week. If a muscle group needs work on a second day in the same week, a different exercise must be picked from the same curated list (after Layer B filtering).

**⚠️ Interacts badly with the Layer A structural tension above.** On a 5-day PPL+UL split, this rule can exhaust a category's entire pool before the week's later sessions (e.g. Upper Body A on day 4) are generated — see Open Items.

### C4a. Fill-Pass Category Rule (added 5 Aug 2026 — closes a real bug, found live post-publish)

**This sub-rule was never specified before 5 Aug 2026 — its absence is what caused the bug.** When a session's primary selection pass (drawing from that session's own target muscle groups, e.g. `SESSION_TARGETS[session]`) doesn't yield enough exercises to reach the C1 count target, the engine must NOT fall back to drawing from muscle groups outside that session's target set. A "Push" day must never contain a Back/Pull exercise, even as a filler pick, regardless of how the count target is handled.

**What happens when the in-category pool is exhausted (via C4) and the session still can't reach its C1 count target is an OPEN ITEM as of 5 Aug 2026 — see Open Items below.** The immediate fix (5 Aug 2026) enforces category correctness and accepts sessions falling below the C1 count target as an interim state; it does not yet resolve the shortfall itself.

### C5. Cross-Generate Variety — "Rotation With Memory"

To ensure a regenerated plan (e.g. next month, or Extend Month) doesn't feel identical to the previous one:

- The system persists the **last-used exercise per body-part slot** from the user's most recent generated plan.
- On the next generate, from the Layer-B-filtered valid pool for that slot, the previously-used exercise is **excluded** if any alternative remains in the pool.
- If the valid pool for that slot has exactly one option (e.g. after heavy limitation filtering), repetition is allowed — there is no alternative.
- Only one field needs to persist per slot (the last exercise used), not a full history log.

This was chosen over pure random selection (which can statistically repeat identical combinations and feels like a bug to users) and over rigid fixed rotation (which requires manually pre-designing exercise order for every Goal × Experience × Days combination — a design burden that doesn't scale).

### C6. Cardio Finisher (Fat Loss / General Fitness only)

- **Applies only when Fitness Goal = Fat Loss or General Fitness.** Hypertrophy, Strength, and Body Recomposition sessions do not include a cardio finisher.
- Positioned as a circuit appended at the **end** of the session, after all resistance exercises.
- Exercise count varies by session duration: **45min and 60min sessions → 2 cardio exercises; 75min+ sessions → 3 cardio exercises.**
- Selection method: **simple random** per generate (not rotation-with-memory) — the cardio pool is small (5 exercises), so natural variety is already sufficient without persistent tracking.
- Standard Layer B limitation filtering still applies (e.g. Ankle-limited users only draw from Mountain Climber in the cardio pool).

---

## LAYER D — Volume/Intensity Assignment (RIR + Rep Range)

RIR and rep range are both differentiated by **Goal AND Experience Level** (the old system only varied by Experience). Beginner rows are deliberately kept conservative and similar across all Goals — technique-learning matters more than goal-specific intensity at that stage. Goal differentiation becomes meaningful starting at Intermediate.

### RIR Table — Compound Exercises

| Goal | Beginner | Intermediate | Advanced |
|---|---|---|---|
| Strength | 3 | 2 | 1 |
| Hypertrophy | 4 | 3 | 2 |
| Body Recomposition | 4 | 3 | 2 |
| Fat Loss | 4 | 3 | 2-3 |
| General Fitness | 4 | 4 | 3 |

### RIR Table — Isolation Exercises

| Goal | Beginner | Intermediate | Advanced |
|---|---|---|---|
| Strength | 3 | 2 | 1 |
| Hypertrophy | 3 | 2 | 0-1 |
| Body Recomposition | 3 | 2 | 1 |
| Fat Loss | 3 | 2-3 | 2 |
| General Fitness | 3 | 3 | 2 |

### Rep Range Table

| Goal | Compound Reps | Isolation Reps |
|---|---|---|
| Strength | 3-6 | 6-10 |
| Hypertrophy | 6-10 | 10-15 |
| Body Recomposition | 6-10 | 10-15 |
| Fat Loss | 8-12 | 12-15 |
| General Fitness | 8-12 | 12-15 |

---

## LAYER E — Progression (W1–W4)

Standard linear-undulating progression: reps increase across W1→W3 at constant weight, then W4 deloads. Weight increases occur between cycles (via the Extend Month carry-forward rule), not within a single 4-week block.

| Week | Reps | Weight | RIR |
|---|---|---|---|
| **W1** | Low end of the Layer D rep range | Baseline (user-entered or estimated) | Per Layer D table |
| **W2** | +1-2 reps from W1 (same weight) | Same as W1 | Same as W1 |
| **W3** | High end of the rep range (same weight) | Same as W1-W2 | –1 from baseline (closer to failure — progressive overload step) |
| **W4 (Deload)** | Back down to low end of range | –10-20% from W1-W3 | +1-2 above baseline (recovery-focused) |

### Extend Month Carry-Forward Rule (hard requirement — must not be bypassed)

When a user extends their program into a new month, the new cycle's **W1 baseline (reps AND weight) is carried forward from the PREVIOUS cycle's W3** — never from W4 (since W4 is intentionally deloaded) and never regenerated from scratch. This is how long-term progressive overload compounds across cycles: each new cycle's baseline is higher than the last.

### Monetization Gate (existing tier system — unchanged, reconfirmed)

Extend Month is a paid-tier feature. FREE and EXPIRED users see a subscription popup when attempting to access it; TRIAL users (within the 14-day window) get full access as if PAID. Since the UI blocks FREE/EXPIRED users before generation is ever triggered, the rule-based engine itself only needs to handle the Extend Month carry-forward logic for TRIAL/PAID users — no "free user extend month" edge case exists at the engine level.

---

## Warm-Up & Cool-Down (static content, outside the matrix)

Not personalized by Goal or Experience — generic instructional text blocks shown alongside every generated plan. Equipment creates the only variation (2 Warm-Up versions), Cool-Down is identical for both equipment types. As of 1 Aug 2026, this text is emitted as i18n keys (`warmup.gym`/`warmup.bodyweight`/`cooldown.default`) resolved client-side, not literal English — see KNOWLEDGE.md Section 15 for the i18n implementation history.

### Warm-Up — Gym Version (5-7 min)
1. 5 min light cardio (treadmill/bike/marching)
2. Arm circles — 10x each direction
3. Leg swings — 10x per leg (front-back, then side)
4. Bodyweight squat — 10x
5. Cat-cow stretch — 30 sec

### Warm-Up — Bodyweight Version (5-7 min)
1. Marching/light jumping jacks — 2-3 min
2. Arm circles — 10x each direction
3. Leg swings — 10x per leg
4. Bodyweight squat — 10x
5. Cat-cow stretch — 30 sec

### Cool-Down — Same for Both Equipment Types (5 min)
1. Easy walk/march in place — 1-2 min, breathing focus
2. Static hamstring stretch — 30 sec per leg
3. Static quad stretch — 30 sec per leg
4. Static chest/shoulder stretch (doorway stretch or cross-body) — 30 sec per side
5. Deep breathing — 5 breaths

---

## Output Shape Requirement

The final assembled JSON output of this engine **must match the existing `plan_data->workout_plan` shape** produced by the old AI system, so that all downstream logic (`getPlanProgress()`, medal checks, streak algorithms, dashboard rendering, PNG share cards) requires zero changes. This is a hard architectural constraint — the engine replaces *how* the plan is generated, not *what shape* it is.

---

## Open Items / Not Yet Decided

- **Exercise-count shortfall on category-overlapping multi-split weeks (found 5 Aug 2026, NOT YET RESOLVED):** the 5-day PPL+UL split combo (and any other split combining systems with overlapping muscle-group targets in the same week) can run a later session's category pool dry due to C4's week-global uniqueness rule, resulting in sessions with fewer exercises than the C1 count target — even after the C4a fill-pass fix. Three candidate resolutions, none yet chosen:
  1. Relax C4 to allow repeats across different days in the same week (never on the same day) — trades away some of the "feels varied" benefit C4 was designed for, but is common in real training practice (e.g. bench press legitimately appearing on both a Push day and an Upper day in the same week).
  2. Accept shorter sessions when the in-category pool is exhausted — preserves C4 exactly as designed, but means some generated sessions are shorter than the user's selected duration would suggest.
  3. Expand the exercise pool size for the smallest categories (Tricep, Calf — 2 each currently) — doesn't change either rule, but requires new exercise content (names, demo assets) and doesn't fully solve the problem for every combination, only reduces its frequency.
- **Grace period tolerance for streaks** — separate, deferred discussion (see KNOWLEDGE.md), not part of this document.
- **Mobility/Flexibility as a 6th Goal** — explicitly deferred; would require a different program class (stretching/mobility drills rather than resistance exercises) and is out of scope for this version.
- **Elbow limitation's interaction with all bodyweight tricep work** — Bench Dip and Close Grip Push Up are excluded; general elbow-lockout stress on other pressing movements (e.g. Push Up) has not been separately evaluated and may need future review if user feedback surfaces issues.
