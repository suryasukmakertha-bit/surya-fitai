# SURYA-FITAI SYSTEM KNOWLEDGE
> Single source of truth. Read this before making ANY change.
> Last updated: 2 Aug 2026

---

## 1. SYSTEM OVERVIEW

**App:** Surya-FitAI — fitness PWA (no longer "AI-powered" as of 4 Jul 2026 — see AI note below)
**Domain:** surya-fitai.com
**Stack:** React + Vite + Supabase (hrxqvheudexwswmlqbgw) + Midtrans (production)
**Languages:** EN (default), ID, ZH — ALL UI text must have all 3 via t('key')
**AI:** NONE. Plan generation (both workout and meal) is fully rule-based/deterministic as of 4 Jul 2026 — see WORKOUT_TEMPLATE_LOGIC.md and MEAL_TEMPLATE_LOGIC.md for the complete generation logic. **Historical correction:** earlier versions of this document stated "Claude API (claude-sonnet-4) for plan generation" — this was never accurate. The actual prior implementation called the Lovable AI Gateway using `google/gemini-3-flash-preview` (confirmed via code read of `generate-plan/index.ts`, lines 877-895), not Claude/Anthropic. This AI dependency has now been removed entirely — the pivot was triggered by Lovable Cloud & AI credit exhaustion but the decision to go fully rule-based is permanent, not a temporary workaround.
**Dev tool:** Lovable (prompt-based, English only)
**Assets:** GitHub CDN (https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/)
**Publish status:** App has NOT been published as of 2 Aug 2026. Real users remain on the old AI-based live version with old form fields. All rule-based engine work, form redesign, Programs-page removal, i18n fixes, and tab restructuring described below exist only in Lovable dev/preview — zero impact on real users until Coach publishes. As of this update, the full "ship together" rollout scope is complete (see Section 18) — publish decision is now the open item.

---

## 2. USER TIERS

| Tier | Access | Generate | Slots |
|------|--------|----------|-------|
| FREE | Workout tab only | 1/month | 1 |
| TRIAL | Full access, 14 days | 3 total | 3 |
| PAID (Rp19.900/mo) | Full access | 3/period | 3 |
| EXPIRED | Same as FREE | 1/month | 1 |
| ADMIN (surya.sukmakertha@gmail.com) | Unlimited, no locks, no counters | unlimited | unlimited |

**Tier gate pattern:**
- FREE/EXPIRED → show upgrade popup, never show error or lock icon (unless specified)
- TRIAL/PAID/ADMIN → allow action
- ADMIN bypasses ALL gates, counters, and locks without exception

---

## 2a. TESTING — PERMANENT E2E FIXTURE ACCOUNT

- Email: `surya.sukmakertha+apptest123@gmail.com`
- user_id: `1e0dd5cf-9342-4df0-b1fc-c02d192e8793`
- Purpose: permanent active-tier (PAID-equivalent) account for Playwright/E2E verification, created 27 Jul 2026 specifically to stop repeated blocking on locked-tab checks (previously required extending a random trial user's date each time, or was blocked entirely with no viable account in the DB).
- `subscriptions` row: `status='active'`, `subscription_end='2099-12-31'` — this date is intentional, not a data error. Do not "fix" or flag this in future audits/scans.
- Distinct from the ADMIN account above (`surya.sukmakertha@gmail.com`, no plus-sign). This fixture uses Gmail plus-addressing (`+apptest123`) and is a normal non-admin user — confirmed via `is_app_admin()` (no match, since that check is an exact-string match on the ADMIN email with no plus-sign).
- Safe to generate/delete test plans on this account repeatedly — not a real customer, no cleanup obligation. Existing test plans on it (SmokeTest, PWVerify2, FixtureTest, i18nVerify, etc.) may slightly skew `admin-report` program_type distribution — check current numbers before relying on that report for real business decisions.
- `profiles.period_generate_count` on this account gets reset to 0 whenever it hits the tier's real generate limit during testing — expected maintenance, not a bug, and confined to this account only.
- **Do not confuse with a prior mislabel:** an earlier investigation turn incorrectly called user_id `7887903d-bd3a-4fd3-865a-061543abb9f7` a "test/dev account." That user_id is actually Coach's own personal ADMIN account — off-limits for test fixture writes. This fixture (2a) is the only account that should be used for E2E testing.

---

## 2b. RESULTS PAGE — TAB STRUCTURE (restructured 30 Jul 2026)

**Current state: 3 tabs** (down from 5: Workout Plan / Meal Plan / Grocery List / Info & Safety / Progress). Single location: `src/pages/Results.tsx`. The Progress tab only renders after the plan has been saved (`planId && user` guard, pre-existing conditional) — this is by design, not a bug.

| Tab | `value` | Gated? | Contents |
|---|---|---|---|
| Workout Plan | `workout` | **No — always free**, no gate handler exists on this trigger at all | Extend Month banner, Week Selector, Warm-Up card, Weekly Split Overview, daily WorkoutChecklist (exercises with sets/reps/rest/tempo/cues), Cool-Down card, estimated calories burned, Deload Week, Progress Projection, "Coach Surya" program overview paragraph, collapsible "Program Details" section (Safety Notes + Weekly Schedule Overview) |
| Meal Plan | `meals` | Yes — FREE/EXPIRED locked | Meal cards (breakfast/snacks/lunch/dinner, resolved via `resolveMealName`/`resolveFoodLine`), collapsible Grocery List (resolved via `resolveFoodLine`) |
| Progress | `progress` | Yes — FREE/EXPIRED locked | WorkoutProgressSummary, Progression Rules, Program Duration, weight tiles, ProgressDownloadCard (PNG export), weight chart, Check-In form, History list |

**Removed 30 Jul 2026:** Grocery List and Info & Safety as standalone tabs (folded into Meal Plan and Workout Plan respectively). Warnings and Recovery Tips sections deleted entirely, not relocated.

**Removed 1 Aug 2026:** the "Coach's Program Calibration" gear-icon card (showed session-time confirmation text like "Session time matched: 60 minutes..."). Pure display, no side effects — `estimatedSessionTimeMinutes` itself was kept in the data model (still used by PDF export), only the on-screen card and its 2 i18n keys (`coachCalibration`, `sessionTimeBanner`) were removed.

**Gating mechanism:** inline `onPointerDown` handler duplicated per-`TabsTrigger` (not a shared function — 2 copies, on `meals` and `progress`), keyed on `access.isFreeTier && !access.isUnlimited` (from `useSubscription()`), calls `openPopup('locked_tab')`. The Workout tab's trigger has no handler at all — free by construction. Verified working for the Meal tab under a FREE-tier test (popup fires correctly). The identical handler on Progress uses the same code but was not independently re-verified in that same test run (a UI dialog got stuck mid-test) — low risk given it's the exact same mechanism, not urgent to re-check.

**⚠️ Deliberate gating decision (30 Jul 2026, Coach's explicit call) — do not "fix" this:** the 4 content blocks relocated into the Workout Plan tab (Deload Week, Progress Projection, Safety Notes, Weekly Schedule Overview) are INTENTIONALLY left free/ungated, even though they used to live behind the locked Info & Safety tab pre-restructuring. This was a conscious product decision: the content is thin-value relative to the real paid differentiators (Meal Plan detail, Grocery List, Progress history/charts — all of which remain fully gated), and there are no active paying users yet to lose revenue from. Reversible later via a new gating decision if user data suggests otherwise — do not silently add a lock back without Coach re-confirming the reasoning no longer applies.

**"Coach Surya" program overview paragraph (added i18n 1 Aug 2026):** this narrative sentence ("A rule-based 4-day Upper Body A-anchored program tuned for Fat Loss at Intermediate level...") is emitted by `generate-plan/index.ts` as `{key: "programOverviewTemplate", params: {days, split, goal, level}}` and resolved client-side via `resolveTemplated()` (`Results.tsx`, same helper used by `motivational_message`/`weight_projection`). `goal`/`level` are canonical tokens mapped to existing localized labels client-side; `split` (e.g. "Upper Body A") is passed through as a plain English parameter and is NOT translated — consistent with the split-name-stays-English rule below. `exportPdf.ts` resolves the same object shape. Legacy saved plans with a literal English string for this field still render unchanged (fallback path confirmed).

**i18n:** tab labels reuse existing keys `workoutPlan`/`mealPlan`/`progressTab`. New key `programDetailsLabel` added for the collapsible section header. Orphaned/repurposed keys after the restructuring: `groceryList` — repurposed as the `weeklyGrocery` section heading inside Meal Plan; `infoSafety`/`coachCalibration`/`sessionTimeBanner` — fully orphaned/removed.

---

## 3. PLAN RULES

**⚠️ SUPERSEDED 4 Jul 2026.** Plan generation is no longer AI-based. The complete, current workout generation logic (split selection by Days×Experience, 47-exercise pool with difficulty/limitation-exclusion/demo-image data, exercise selection algorithm with rotation-with-memory + cardio finisher, volume/intensity RIR+rep-range per Goal×Experience, W1-W4 progression with Extend Month carry-forward) now lives in **WORKOUT_TEMPLATE_LOGIC.md** — read that file directly. The complete meal generation logic (Mifflin-St Jeor calorie formula, macro split, food database, meal timing, 16/8 IF window-shift) now lives in **MEAL_TEMPLATE_LOGIC.md**. Do not use the old Bulking/Cutting goal system or the old RIR-by-experience-only table below for any new work — they are kept here only as historical reference for understanding pre-4-Jul-2026 behavior.

- New plan: plan_started_at = user selected date, NEVER NOW() — **this rule is unchanged and still applies** under the new rule-based system.
- Day card: days[0] → card 0, sequential index only, never remap or reorder — **unchanged, still applies.**

**OLD SYSTEM (pre-4 Jul 2026) — DO NOT USE, historical reference only:**
- Exercise list IDENTICAL Week 1-4 (same exercises, days, count):
  - W1 Foundation: lighter weight
  - W2 Volume: increase reps
  - W3 Intensity: increase weight
  - W4 Deload: -1 set, weight -20%
- Goals supported: Bulking, Cutting
- RIR by experience level (did not vary by goal):
  - Beginner: Compound 4 RIR, Isolation 3 RIR
  - Intermediate: Compound 3 RIR, Isolation 2 RIR
  - Advanced: Compound 2 RIR, Isolation 0-1 RIR
- ExerciseDB removed — replaced with hardcoded pool of 15 bodyweight exercises (this pool has since been expanded and restructured — see WORKOUT_TEMPLATE_LOGIC.md for the current 47-exercise pool)

---

## 4. EXTEND MONTH RULES

**Trigger:** Plan progress >= 80% → show banner on Home + Results page
**Tier gate:** FREE/EXPIRED → upgrade popup | TRIAL/PAID/ADMIN → allow

**On confirm:**
- plan_started_at = NOW() at moment of confirmation
- plan_completed_at = NULL
- Progress resets to 0%
- Badge = flame
- streak_carry_over = previous month final streak (written to saved_plans before resetting plan_started_at)

**Extended month content:**
- Same exercise and rest day pattern as previous month
- W1 baseline: reps and weight from previous month W3

**Visibility rules:**
- Home banner: check ACTIVE plan progress >= 80%
- Results page button: check VIEWED plan progress >= 80% (not active plan)
- When >= 80%: show banner ONLY — no duplicate standalone button
- After extend: banner hides immediately, reappears only when new month reaches >= 80%

**Post-extend state:**
- Today/This Week: filter by plan_id = active AND plan-anchored rolling week (see Section 6 — UPDATED 19 Jun 2026, supersedes any older "Monday boundary" rule)
- Streak: NEVER resets — inherits via streak_carry_over
- Progress bar: count only completions with plan_id = active plan after extend
- Extend reuses same plan_id → plan_started_at stays from ORIGINAL plan start, NOT reset to extend date for the rolling-week formula (confirm this stays true; rolling week must remain continuous across extend, not restart)

**Goal-mapping safety net:** `normalizeGoal(raw, programType)` in `generate-plan/index.ts` falls back to `programType` (bulking→Hypertrophy, cutting→Fat Loss, else→General Fitness) ONLY when the stored `goal` string matches none of the recognized keywords. Confirmed via live data audit (24 Jul 2026) that 9 of 11 existing `saved_plans` rows depend on this fallback for correct Extend Month goal mapping — DO NOT remove without re-confirming against current data (see Section 18 for full history).

---

## 5. STREAK RULES

**Per-plan streak algorithm (FORWARD walk):**
- Direction: FORWARD from plan_started_at to today
- days[0] = plan_started_at, days[1] = +1 day, sequential
- Rest day (by card content, NOT weekday name): skip, no break
- Past workout day WITH completions: streak++
- Past workout day NO completions: streak resets to 0, continue fresh
- Today = rest day or workout not yet done: stop, return current streak
- Future dates: skip/stop
- NEVER walk backward, NEVER change direction

**Extend month streak:**
- streak_carry_over stored in saved_plans table (INTEGER DEFAULT 0)
- On extend: capture previous streak value → save as streak_carry_over → then reset plan_started_at
- Display streak = streak_carry_over + computeCurrentStreak(active plan)
- New plan (not extend): streak_carry_over = 0

**Global longest streak:**
- Stored in profiles.longest_streak — server-side ONLY via bump_longest_streak() RPC
- Only increases, NEVER decreases
- Value = max(streak_carry_over + computed_streak) across ALL plans
- bump_longest_streak(p_candidate INTEGER): updates only if p_candidate > current longest
- Called: after workout toggle AND on WorkoutProgressSummary mount
- prevent_profile_counter_tampering trigger blocks direct updates — DO NOT REMOVE
- Bypass flag in RPC — DO NOT REMOVE
- EXECUTE granted to authenticated role only

---

## 6. WORKOUT ACTIVITY COUNTERS (Progress Tab) — UPDATED 19 Jun 2026

**⚠️ SUPERSEDES old rule.** The previous rule "This Week uses Monday calendar boundary" is WRONG and was fixed on 19 Jun 2026. Do not revert to Monday-based ISO week for plan-scoped views.

**Core principle — TWO valid week definitions, context-dependent:**
This app has two legitimate meanings of "this week" depending on whether a specific plan is in view:
1. **Plan-anchored rolling week** — used when viewing a SPECIFIC plan (planId is known). Anchored to that plan's `plan_started_at`, NOT to Monday, NOT to calendar.
2. **Calendar rolling week** — used for AGGREGATE/dashboard views with no single plan context (no planId). Anchored to today, NOT to any plan.

**Do NOT force one definition everywhere.** Always check whether `planId` is present before deciding which formula applies. This was the root cause of three separate bugs fixed on 19 Jun 2026 (see Section 6a).

**Plan-anchored rolling week formula (use whenever planId + plan_started_at are both known):**
```
daysSinceStart = floor((today - plan_started_at) in days)
weekIndex = floor(daysSinceStart / 7)
weekStart = plan_started_at + (weekIndex * 7) days
weekEnd = weekStart + 6 days
```
- This is the SAME formula already used by "Active Days X/7" (was already correct before 19 Jun fix — do not change its logic, only reuse its math elsewhere).
- Query: `workout_date >= weekStart AND workout_date <= weekEnd`, scoped to `plan_id = active/viewed plan`.

**Calendar rolling week formula (use ONLY when no planId — aggregate/all-plans views):**
```
chartStart = subDays(today, 6)
chartEnd = today
```
- Used by Progress.tsx dashboard chart (no plan context). Do NOT anchor this to any plan_started_at — there is no single valid anchor when aggregating across multiple plans with different start dates.

| Counter | Scope | Week Definition |
|---------|-------|-----------------|
| Today | plan_id = active + date = today | N/A (single day) |
| This Week | plan_id = active/viewed + plan-anchored rolling week | Plan-anchored (NOT Monday, NOT calendar) |
| Active Days X/7 | plan_id = active + plan-anchored rolling week | Plan-anchored (already correct pre-19 Jun) |
| Bar chart — Results.tsx usage (`<WorkoutProgressSummary planId={planId} />`) | plan_id scoped | Plan-anchored — MUST match "This Week" exactly |
| Bar chart — Progress.tsx usage (`<WorkoutProgressSummary />`, no planId) | unscoped, all plans | Calendar rolling-7 (subDays today,6 → today) — intentionally different, DO NOT unify |
| Streak display | streak_carry_over + computeCurrentStreak | N/A — forward-walk algorithm, unrelated to week boundary |

**Rules:**
- Filter by plan_id = active/viewed only when in plan-scoped mode — NEVER aggregate across unrelated plans in that mode
- `getPlanProgress()` (src/lib/planProgress.ts): completion filter MUST compare DATE only — `workout_date >= plan_started_at::date`. NEVER compare raw timestamps (`completed_at >= plan_started_at`) — time-of-day mismatch silently excludes valid same-day completions. Fixed 19 Jun 2026.
- Extend month: same plan_id reused → plan-anchored rolling week stays continuous from ORIGINAL plan_started_at, does not restart at extend date

### 6a. Bug history — 19 Jun 2026 fix cluster
Reference if similar symptoms reappear (e.g. in PNG share card, which reuses progress data and was NOT audited in this fix — check it if numbers look wrong there too).

1. **Saved Plans card showing N-1/N instead of N/N** — `getPlanProgress()` used `completed_at >= plan_started_at` (timestamp compare). A completion logged same calendar day but earlier clock time than `plan_started_at`'s time component was wrongly excluded. Fix: switched to date-only comparison.
2. **"This Week" undercounting** — `WorkoutProgressSummary.tsx` used `startOfWeek(today, {weekStartsOn:1})` (Monday ISO week) for ALL plans regardless of what day the plan actually started. A plan starting Sunday had its Sunday workout pushed into "last week" and excluded. Fix: switched to plan-anchored rolling week formula above.
3. **Bar chart window mismatch vs "This Week" card** — same file, separate `<BarChart>` block, used calendar rolling-7 (`subDays(today,6)→today`) unconditionally. On Results.tsx (planId passed) this showed a different 7-day window than the "This Week" counter directly above it — confusing even when totals coincidentally matched. Fix: when planId is present, bar chart now reuses the exact same plan-anchored weekStart/weekEnd as "This Week" (fetches plan_started_at once, shares the math, avoids drift). Progress.tsx usage (no planId) deliberately left unchanged.



---

## 7. DASHBOARD WIDGETS

| Widget | Source | Scope |
|--------|--------|-------|
| Workouts Done | Distinct workout days completed | Active plan only |
| Progress % | (Workouts Done / total workout days) x 100 | Active plan only |
| Week X/4 | Based on plan_started_at + today | Active plan only |

- Switching active plan: all widgets update immediately
- Never show global aggregates on dashboard widgets

---

## 8. PROFILE COUNTERS

| Counter | Definition | Scope |
|---------|-----------|-------|
| total_workouts | COUNT(*) all exercise completion rows | ALL plans, ALL time |
| active_days | COUNT(DISTINCT workout_date) | ALL plans, ALL time |
| longest_streak | Max streak across all plans | ALL plans, only increases |

- Updated server-side via sync_workout_counters RPC on every exercise toggle
- sync_workout_counters: NO plan_id filter — counts everything cross-plan
- NEVER reset, NEVER scoped to active plan
- Download Progress PNG: re-fetches fresh completions from DB at moment of download, never uses cached state

---

## 9. RUNNING & CYCLING

**Pre-screen (ActivityPre.tsx):**
- PB Card: fastest avg pace (mm:ss /km) + distance + duration
- PB logic: ORDER BY avg_pace_seconds_per_km ASC WHERE distance_km >= 1.0
- NOT longest distance — do not revert this
- Weekly chips: Week KM (Mon-Sun), Sessions (last 20 fetched count), Kcal (this week)
- Charts: Distance/Pace/Calories tabs, last 8 weeks, recharts
- Pace chart: Y-axis inverted, dashed avg line
- X-axis: Monday of each week
- Last 5 sessions: date, distance, pace, duration — non-interactive
- Empty state ONLY when allSessions.length === 0 (raw DB), never based on weekly data
- Date parsing: always new Date(session.date + 'T00:00:00') — never raw ISO string

**Session & Summary:**
- Data source: activity_sessions table (no separate running_sessions table)
- Filter by activity_type IN ('running', 'cycling')
- Route map: visible ALL tiers during live session and summary — NEVER lock
- GPS normalization: minLat/maxLat bounds + 10% padding, Y-axis inverted
- Same normalization algorithm for live canvas AND PNG card
- Start dot: first GPS coordinate, green (#4ade80)
- End dot: last GPS coordinate, red (#ef4444)
- Splits bar chart: shown in summary and PNG card when distance >= 1.0 km
  - Fastest km bar: #ff3d7f with glow (box-shadow 0 0 6px rgba(255,61,127,0.5))
  - Normal km bar: #ff6b00 gradient top to transparent
  - Bars are vertical, grow upward, inversely proportional to pace (faster = taller)
  - Hide splits if distance < 1.0 km
- PB badge on summary: triggers when current avg pace < all-time best pace AND distance >= 1.0
- Download limit: NONE — all tiers can download summary PNG

**Tier gates for Running/Cycling:**
- FREE: live stats + route map + last 5 sessions + PNG download + share card (no PB banner, no splits on PNG)
- TRIAL/PAID: + pre-screen charts + PB tracking + splits on PNG + unlimited history
- ADMIN: all access, no locks

---

## 10. PNG SHARE CARD (activityImage.ts)

**Non-negotiable rules:**
- Native Canvas API ONLY — NEVER html2canvas
- Background: fully transparent canvas (no fill, no gradient on canvas itself)
- Text visibility: shadowColor rgba(0,0,0,0.95), shadowBlur 12, shadowOffsetY 2
- Paint each text element TWICE for punch/density
- Stat boxes: rgba(0,0,0,0.72) background
- Route box: rgba(0,0,0,0.65) background
- Section labels (ROUTE, SPLITS PER KM): dark pill background behind text

**Layout (top to bottom):**
1. Header: logo PNG left + activity badge right (RUNNING/CYCLING, no emoji)
2. PB Banner (TRIAL/PAID/ADMIN only, if isPB session)
3. 4 Stats: Distance · Duration · Avg Pace · Calories
4. Route map section (GPS normalized, all tiers)
5. Splits bar chart (TRIAL/PAID/ADMIN only, if distance >= 1.0 km)
6. Footer: date left + surya-fitai.com right (both bold)

**Tier gate on card content:**
- ALL tiers: logo + badge + 4 stats + route map + footer
- TRIAL/PAID/ADMIN: additionally PB banner + splits chart
- FREE/EXPIRED: omit PB and splits — NO lock icon, just omit silently
- Card height adjusts dynamically based on what sections are shown

---

## 11. DOWNLOAD PROGRESS PNG (Results page) — UPDATED 21 Jun 2026

**Data rules (unchanged):**
- Re-fetches fresh workout_completions from DB at moment of download click
- NEVER uses cached React state for progress calculation
- Computes: completions WHERE plan_id = this plan AND completed_at >= plan_started_at
- Progress % = (fresh completions / total workout days) x 100
- Circular ring and % text must match dashboard and saved plans page

**Visual transparency rules (NEW 21 Jun 2026) — applies to BOTH PNG cards below:**
Same transparency pattern as the Running/Cycling PNG share card (Section 10) — canvas base fully transparent, every content block keeps its own `rgba(0,0,0,0.72)` background, all text uses strong drop shadow (`shadowColor rgba(0,0,0,0.95)`, `shadowBlur 12`, `shadowOffsetY 2`, painted twice).

**⚠️ Renderer mismatch lesson (21 Jun 2026):** there can be MORE than one canvas renderer for visually-similar cards (e.g. a separate "celebration popup" renderer vs. the actual download-button renderer). Before editing, always confirm with Lovable which renderer is actually wired to the specific button/trigger being changed — do not assume there's only one. After any change, require a freshly generated PNG for visual comparison before accepting "done." Do not accept a text description of changes as proof they were applied to the live code path. **Same renderer-fragmentation risk applies to translatable text generally** — see Section 15's i18n history: multiple render sites (WorkoutChecklist, PNG progress card, PDF export) were missed on first-pass fixes more than once for exactly this reason. Always audit ALL render sites of a field, not just the most obvious one.

**Card A — "Download Daily Progress" (exercise checklist, triggered from workout plan / exercises section):**
- Layout: centered eyebrow (brand + "·" + "Month N" pill) → centered title "YOU VS YOU." (white/white/orange) → centered thin orange accent rule (48px wide, 3px tall) → centered subtitle (e.g. "6 of 6 exercises done · [date]") → 2-column exercise grid at 88% width, centered (intentional inset, NOT full width) → thin divider line (rgba(255,255,255,0.12)) → centered footer, fraction (e.g. "6/6") stacked above "surya-fitai.com"
- Each exercise item is its own `rgba(0,0,0,0.72)` box with an orange checkmark circle + exercise name (left-aligned inside the box)
- Verified working and visually confirmed by Coach (manual check, not just Lovable's claim) — 21 Jun 2026

**Card B — "Download Progress" (overall plan progress, triggered from Progress section):**
- Layout: dots eyebrow + "SURYA-FITAI · PROGRESS REPORT" label → large plan/user name (no box, shadow only) → thin orange rule → meta line (e.g. "cutting · Month 2") → stats row box (Weight/BMI/Kcal, `rgba(0,0,0,0.72)`) → duration row box (`rgba(0,0,0,0.72)`) → completion box (`rgba(0,0,0,0.72)` + orange border) containing % text and the existing donut/ring chart (ring visual itself unchanged — only its background became transparent) → italic quote with orange left border → footer
- Verified working and visually confirmed by Coach (manual check, not just Lovable's claim) — 21 Jun 2026

---

## 12. CHART & THEME RULES

**CRITICAL — always use CSS variables, never hardcode:**
- Axis tick fill: hsl(var(--foreground)) with fillOpacity 0.5
- Grid line stroke: hsl(var(--border)) with strokeOpacity 0.4
- NEVER use: rgba(255,255,255,x), #aaa, #666, white for any text or grid

**Chart style (recharts brand colors):**
- Bar fill: gradient (#ff6b00 top → transparent bottom)
- Line stroke: #FF5E1A with drop-shadow filter
- Active dot: white with orange glow
- Tooltip: glassmorphism (blur backdrop-filter, dark bg, orange border, rounded-lg)

**Theme support:**
- Dark: background #111111, accent #FF6A00 orange
- Light: all colors via CSS variables
- ALL components must work correctly in BOTH dark and light mode
- NEVER hardcode dark-only colors anywhere

---

## 13. SECURITY RULES

**Prompt injection protection (generate-plan/index.ts) — NEVER REMOVE:**
- Layer 1: sanitizeUserText() on name(60), goal(300), limitations(200), allergies(200), occupation(200)
- Layer 2: all 5 fields wrapped in <user_provided_data>...</user_provided_data> tags
- System prompt instructs AI to treat wrapped content as data only
- NEVER raw field interpolation in system prompt
- **Hardened 26 Jun 2026:** verification testing found the original INJECTION_PATTERNS regex denylist stripped individual trigger words (ignore, you are now, system prompt) but left surrounding instruction-like phrasing semantically intact and readable (e.g. "IGNORE ALL PREVIOUS INSTRUCTIONS...developer mode...verbatim" survived as "ALL PREVIOUS INSTRUCTIONS...in developer mode...verbatim" — still a coherent injected instruction). Added 7 more patterns (previous instructions, developer mode, verbatim, instead of, raw (system )?prompt, reveal/print instructions or prompt) to close the gap. Re-verified end-to-end against the live Claude API afterward: malicious payload produced 0 leakage matches (system prompt / developer mode / verbatim / ignore / raw prompt / previous instructions) anywhere in the response, output schema matched normal plan structure, and a control test with a legitimate goal produced equivalent output size/quality — confirms the regex extension did not degrade normal use. Regex denylist is explicitly NOT a complete scrub by design; the `<user_provided_data>` delimiter + system-prompt instruction is the primary defense layer, the regex list is defense-in-depth on top of it. If extending further, test the exact same way (real Claude API call with a crafted payload + grep the raw response for leakage terms) before trusting a "looks sanitized" read of the string alone.
- **Scanner status note (26 Jun 2026):** Lovable's security scanner continues to flag this as a "Warning — Unsanitized Fields" finding even after the hardening and verification above, including on fresh scans run after the Security Memory update. This is expected and permanent — the scanner does static analysis (it sees fields interpolated into an LLM prompt) and has no way to detect runtime sanitization layers, so it will flag this pattern indefinitely regardless of how well-defended the code actually is. This is NOT a sign the fix failed. The finding has been marked "Ignore issue" in the scanner (consistent with the other 14 previously-ignored findings) on the strength of the live end-to-end verification documented above, not on the strength of the scanner's own assessment. Do not re-investigate this specific warning from scratch in a future session — re-read this section instead. Only re-verify if INJECTION_PATTERNS, the `<user_provided_data>` wrapper, or the system prompt's data-not-instructions framing are modified.

**Dependency vulnerabilities — fixed 26 Jun 2026 (Lovable security scan):**
- jspdf: 4.1.0 → 4.2.1 (fixed PDF Object Injection, GIF dimension DoS, AcroForm JS execution — Critical/High)
- @supabase/supabase-js: 2.95.3 → 2.108.2 (fixed `ws` Memory Exhaustion DoS + Uninitialized Memory Disclosure — High/Medium; confirmed no breaking API changes in this range)
- react-router-dom: 6.30.1 → 6.30.4 (fixed open-redirect-via-`//`-path XSS — patch-level, stayed on v6 line, did NOT jump to v7 which has breaking changes)
- recharts: kept at 2.15.4 unchanged (upgrading to v3 has real breaking changes, out of scope for a security-only fix); added `package.json` `overrides: { "lodash": "^4.18.1" }` to force the transitive lodash dependency to a patched version instead, fixing the Prototype Pollution advisories without touching recharts itself
- Pattern for future dependency vulns: prefer patch/minor bumps within the same major version; for vulnerabilities in transitive dependencies, prefer `overrides`/`resolutions` over forcing a major version bump on the direct dependency

**⚠️ @supabase/supabase-js 2.108.2 upgrade caused a real-world regression — fixed 26 Jun 2026, same day.** The version bump above (2.95.3→2.108.2) tightened realtime channel reuse semantics: `supabase.channel('subscription-changes')` now returns the SAME already-subscribed channel object if one with that exact topic already exists, instead of always returning a fresh one. `src/hooks/useSubscription.ts` is consumed by 8 components simultaneously on most routes (AppHeader + the page component: Profile, ProgramForm, SavedPlans, Results, ActivityPre/Active/Summary), all using the same hardcoded channel name. Every mount after the first threw "cannot add `postgres_changes` callbacks for realtime:subscription-changes after `subscribe()`", crashing the React tree on EVERY route except Home (which only mounts one consumer via AppHeader) — full outage of Program/Plans/Profile/Results/etc for several hours. Fix: implemented a module-level singleton guard in `useSubscription.ts` — only one real channel/subscription exists app-wide; all 8 consumers register/deregister callbacks into a shared registry instead of each creating their own channel; the real channel is only torn down when the last subscriber unmounts. Public API of the hook unchanged, no consuming component needed changes. **Important operational lesson:** immediately after deploying this fix, the error initially appeared to persist — this was NOT a failed fix, it was a stale pre-fix module instance still held in the running dev server/preview's memory (module-level singletons don't always get reset by HMR). A full dev-server restart + hard browser reload (Cmd/Ctrl+Shift+R) was required before the new singleton took effect. If a module-level-state fix appears not to work immediately after deployment, hard-reload before concluding the fix failed.

**Quota race condition — NEVER restore old pattern:**
- Uses atomic reserve_generate_quota RPC (row-lock + check + increment in one transaction)
- Old read-check-increment pattern is permanently replaced

**RLS rules:**
- workout_completions: user ownership check only (auth.uid() = user_id)
- Date-guard trigger (BEFORE INSERT): completed_at cannot be >1 day past or in future
- Do NOT add plan_started_at as guard — intentionally removed

**Tamper protection:**
- prevent_profile_counter_tampering trigger: blocks direct profile counter updates
- bump_longest_streak() uses scoped bypass flag — DO NOT REMOVE
- guard_ucp_writes trigger (BEFORE INSERT/UPDATE on user_challenge_progress): forces xp_earned:=0 and completed_at:=NULL on client writes — only complete_daily_challenge() RPC can legitimately set completed_at, via session bypass flag app.bypass_ucp_guard
- guard_saved_plan_completion trigger (BEFORE UPDATE on saved_plans, fixed 20 Jun 2026): client cannot set plan_completed_at directly — non-NULL value triggers server-side recompute of real progress (mirrors Results.tsx:575-595 formula); if real completion < 80%, silently reverts to OLD value. Setting to NULL is allowed (required for Extend Month flow — short-circuits, does not interfere)
- guard_activity_session_distance trigger (BEFORE INSERT/UPDATE on activity_sessions, fixed 20 Jun 2026): rejects rows with missing/invalid route_json (must have ≥2 GPS points); recomputes distance from route_json using the same haversine formula + noise filter as the client recorder; silently overwrites distance_km if it differs from GPS-derived distance by more than ±15% (or ±0.2km, whichever is larger); hard ceiling 300km (running) / 500km (cycling) as defense-in-depth
- FIRST_GENERATE medal (award_medal_if_earned, fixed 20 Jun 2026): no longer grants on row-existence alone — requires plan_data->'workout_plan' (or workoutPlan) to be a JSONB array with length >= 3, AND at least one day entry with a non-empty exercises array
- SECURITY DEFINER functions: PUBLIC EXECUTE revoked
- Edge functions: return generic 500 errors, never raw exceptions
- Full mechanism details and active/accepted-risk vulnerabilities tracked separately in the Lovable Security Memory document (Security tab → Edit security memory) — keep both documents in sync when fixing security issues

---

## 14. MEDAL SYSTEM

**Total medals:** 14 in code catalog (`ALL_MEDALS` in `src/lib/medalCatalog.ts`), no Platinum tier currently.
**Plus 1 orphan:** WEIGHT_GOAL is awarded by the RPC (`award_medal_if_earned` handles it, >= 1 completed saved_plan, grants 250 XP) but is NOT in `ALL_MEDALS` — UI gallery will never render it even though a user can have it in `user_medals`. Treat as a known legacy gap, not a bug to silently "fix" without a product decision (removing it from DB would lose a real user's earned medal).
**Storage:** user_medals table (user_id x medal_id, unique constraint)
**Progress:** computed on-the-fly at Medals page mount — NOT stored in DB
**XP:** granted atomically with medal award via RPC

**⚠️ Naming mismatch — confirmed by code audit 23 Jun 2026:** The "Name" column below is the canonical/Indonesian-rooted name stored in `src/lib/medalCatalog.ts`. The actual EN string shown in the UI comes from `LanguageContext.tsx` key `medal.<ID>.name`, and several of these EN translations do NOT literally match the catalog name — they were intentionally renamed away from a literal translation. Always check `LanguageContext.tsx` for the live EN/ID/ZH strings; do not assume the catalog name is what EN users see. Known mismatches found so far:

| Medal ID | Catalog name (this table) | Actual EN UI name |
|----------|---------------------------|---------------------|
| DAILY_1 | Pejuang Pertama | **First Warrior** (not "First Step" — that's FIRST_GENERATE) |
| FIRST_RIDE | Pesepeda Baru | **First Rider** |
| STREAK_7 | Minggu Penuh Api | **Full Week Blaze** (sometimes seen as "Week of Fire" — verify current string before quoting) |
| RUN_10K | 10K Hero | **10K Legend** |

If more mismatches are found during future work, add them here rather than re-discovering via a fresh investigation prompt each time.

**Medal Catalog:**

| Medal ID | Name (catalog/ID-rooted) | Tier | Unlock Condition | Data Source |
|----------|------|------|-----------------|-------------|
| FIRST_GENERATE | Langkah Pertama | Bronze | >= 1 saved plan, workout_plan array >= 3 days with >= 1 exercise in any day (tightened 20 Jun 2026) | saved_plans |
| DAILY_1 | Pejuang Pertama | Bronze | >= 1 challenge completed | user_challenge_progress.completed_at |
| DAILY_7 | Petarung Mingguan | Silver | >= 7 challenges cumulative all-time | user_challenge_progress.completed_at |
| DAILY_30 | Gladiator | Gold | >= 30 challenges cumulative all-time | user_challenge_progress.completed_at |
| STREAK_3 | On Fire | Bronze | profiles.longest_streak >= 3 | profiles.longest_streak |
| STREAK_7 | Minggu Penuh Api | Silver | profiles.longest_streak >= 7 | profiles.longest_streak |
| STREAK_30 | Unstoppable | Gold | profiles.longest_streak >= 30 | profiles.longest_streak |
| PROGRAM_COMPLETE | Program Tamat | Silver | >= 1 plan with plan_completed_at IS NOT NULL | saved_plans.plan_completed_at |
| WEIGHT_GOAL (orphan, not in ALL_MEDALS) | Target Tercapai | Gold | >= 1 completed saved_plan | saved_plans, grants 250 XP |
| CHECKIN_14 | Konsisten | Silver | 14 consecutive progress_checkins ending today/yesterday | progress_checkins.date |
| FIRST_RUN | Pelari Baru | Bronze | >= 1 running session any distance | activity_sessions WHERE activity_type='running' |
| RUN_5K | 5K Finisher | Silver | single session distance_km >= 5 | activity_sessions.distance_km |
| RUN_10K | 10K Hero | Gold | single session distance_km >= 10 | activity_sessions.distance_km |
| FIRST_RIDE | Pesepeda Baru | Bronze | >= 1 cycling session | activity_sessions WHERE activity_type='cycling' |
| RIDE_20K | 20K Rider | Silver | single session distance_km >= 20 | activity_sessions.distance_km |

**Award logic trigger points:**
- Workout toggle (WorkoutChecklist) → streak medals + PROGRAM_COMPLETE
- Activity session end (ActivitySummary) → FIRST_RUN, RUN_5K, RUN_10K, FIRST_RIDE, RIDE_20K
- Daily challenge completion → DAILY_1, DAILY_7, DAILY_30
- Check-in submit (Progress) → CHECKIN_14, WEIGHT_GOAL
- Plan generate success → FIRST_GENERATE
- Medals page mount → re-evaluates ALL categories, awards any missed

**Handler files:** src/lib/dailyChallenge.ts
- Functions: checkAndAwardMedals, checkWorkoutStreakMedals, checkPlanCompletionMedal, checkFirstGenerateMedal, checkActivityMedals, checkCheckinMedals
- Each calls RPC: award_medal_if_earned(p_medal_id, name, tier, description)

**⚠️ checkWorkoutStreakMedals — fixed 25 Jun 2026:** Previously had a redundant client-side gate (`consecutiveStreakEndingNow`, a strict backward-walk from today that ignores rest days and breaks on any gap) that decided whether to even call the RPC. This gate was STRICTER than the RPC's own correct check (`profiles.longest_streak >= N`), so STREAK_30 ("Unstoppable") could be stuck Locked forever even when longest_streak already reached 30 — because any single gap day in the trailing ~30 days zeroed the local `streak` variable before the RPC was ever invoked. Fix: the local gate was removed entirely. `awardIfNew(userId, t.medal)` is now called unconditionally for STREAK_3 / STREAK_7 / STREAK_30 every time `checkWorkoutStreakMedals` runs — the RPC's `longest_streak >= N` check plus `user_medals` idempotency is now the SOLE gate. This is intentional and aligned with product intent: STREAK_30 must be achievable via cross-plan accumulation (e.g. multiple Extend Month cycles), not only via one unbroken 30-day window. Do not reintroduce a client-side pre-check gate without re-confirming it reads the exact same source (`profiles.longest_streak`) as the RPC.

**Server RPC rules:**
- Re-checks qualifying condition against DB before awarding
- Client-supplied claims are NOT trusted
- Inserts into user_medals + grants XP atomically
- Duplicate guard 1: early-return {awarded:false} if medal already in user_medals
- Duplicate guard 2: INSERT ON CONFLICT DO NOTHING

**Key rules:**
- Distance medals (RUN_5K, RUN_10K, RIDE_20K): ONE qualifying session >= threshold, NOT cumulative
- Locked tab progress bar shows cumulative km as UX hint only — actual unlock requires single session
- Streak medals (STREAK_3/7/30) use profiles.longest_streak (monotonic) as the ONLY eligibility gate — no client-side pre-check (see fix above, 25 Jun 2026)
- Daily challenge counter: cumulative all-time, no date window, never resets
- Profile My Medals: earned medals only from user_medals ORDER BY earned_at DESC
- Full gallery (/medals): earned + locked tabs, progress recomputed every visit

---

## 15. CODING PATTERNS

**Timezone:** Always getTodayLocal() from src/lib/dateLocal.ts
- NEVER new Date().toISOString().split('T')[0]
- NEVER raw ISO string for date comparison

**i18n:** ALL user-facing strings via t('key')
- Add keys for EN + ID + ZH simultaneously
- NEVER hardcode any UI text

**Minimum change rule:** Change ONLY what is needed for the specific fix
- Never rewrite working features
- Never refactor unless strictly necessary
- Never break working features when fixing unrelated ones

**One prompt per fix:** Test before proceeding to next prompt

**PNG generation:** Native Canvas API only, always transparent background

**No ExerciseDB:** Removed due to commercial licensing. Exercise pool (47 exercises: 27 gym + 15 bodyweight + 5 cardio finisher, with difficulty tags, limitation-exclusion mapping, and confirmed demo images) is fully defined in WORKOUT_TEMPLATE_LOGIC.md — not a third-party database, not AI-generated.

**Exercise & food name i18n:** Exercise names (WORKOUT_TEMPLATE_LOGIC.md) and food item names (MEAL_TEMPLATE_LOGIC.md) use static i18n KEYS (e.g. `exercise.barbell_bench_press`, `food.tempe_goreng`) resolved via the standard t('key') pattern — NOT on-the-fly/AI-based translation. On-the-fly translation would reintroduce an AI/API dependency, contradicting the whole point of the AI-removal pivot.

**⚠️ Full history of the workout-engine i18n gap — three separate turns, now fully closed as of 1 Aug 2026. Read this if anything about workout-text translation looks wrong again:**

- **Original gap (found 25 Jul 2026):** despite a 6 Jul 2026 turn being signed off as "complete," `EXERCISE_POOL` emitted plain English literals with zero i18n path, and `Results.tsx`/`exportPdf.ts` rendered them raw. The meal-side equivalent (`food.*`/`meal.*` keys resolved via `tKey()`) was correctly implemented from the start and was never affected.
- **Round 1 (25-26 Jul 2026):** wired exercise NAMES ONLY to their existing i18n keys (all 44 unique names already had a matching key — 0 gaps, pure wiring fix) across `generate-plan/index.ts`, `Results.tsx`, `exportPdf.ts`. Coaching cues, warm-up/cool-down text, weeklySplit day labels, and weekday names were explicitly deferred to a separate prompt at this point — NOT fixed yet, despite Coach having already decided (same day) that they should be in scope.
- **Round 2 (27 Jul 2026):** closed a regression Round 1 introduced — `WorkoutChecklist.tsx` and the PNG progress share card (`dailyProgressDownload.ts`/`DailyProgressImage.tsx`/`DailyCelebrationPopup.tsx`) also render exercise names but were missed in Round 1's render-site audit. Fixed with the same resolver pattern. GIF-asset lookup (needs literal English) and completion-matching logic (same key-form string on both write and read sides) deliberately left untouched.
- **⚠️ Documentation gap (self-correcting note):** an earlier version of this document claimed the Round 1/2 work already covered coaching cues/warmUp/coolDown/weekday names ("scope was widened... both rounds fully verified"). That was inaccurate — those items were decided-in-scope but not actually built until the fix below. If you ever find a KNOWLEDGE.md claim that something is "done" but the live app disagrees, trust the live app and re-verify; this file has been wrong before.
- **Final fix (1 Aug 2026):** coaching cues, warm-up/cool-down body text, weeklySplit day labels, and calendar weekday names all converted. Engine now emits `cue.cardio`/`cue.compound`/`cue.isolation`, `warmup.gym`/`warmup.bodyweight`, `cooldown.default` (key strings, resolved via `tKey()`/`resolveEngineText()` with legacy-literal passthrough for old saved plans). The `Day N: {splitName}` line was split into `{dayKey: {key:"workoutDayPrefix", params:{n}}, splitName}` — the day-number prefix resolves via `resolveTemplated()`, `splitName` passes through as plain English (split-type names — "Upper Body A", "Push", etc. — are the ONE deliberate exception across this entire i18n effort and stay English in all languages, per a locked product decision; do not create `split.*` keys). Calendar weekday names (`weekly_schedule`, `formatDayLabel`) reuse the existing EN/ID/ZH weekday arrays already in `src/lib/dailyProgressDownload.ts` rather than duplicating new translations. `WorkoutChecklist.tsx` day headings resolve via a new `localizeDayLabel` helper. Completion-tracking keys (`day.day`, `ex.name`) deliberately left as raw/untouched — only DISPLAY changed. Verified end-to-end: fresh-plan raw response confirmed key-based shapes; rendered EN/ID/ZH text confirmed correct (warm-up, cool-down, cues, split-chip day-prefix, day-heading weekday name) with split names staying English throughout; an old legacy saved plan (literal strings, no `*Display` fields) rendered its original English unchanged with no `[object Object]` and no raw keys; build passed; console clean.
- **Known remaining gap (LOW priority, not fixed):** the rest-interval string still prints as "90-180 seconds" untranslated in ID/ZH (only the word "seconds" is unlocalized — the numbers are fine). Deliberately deferred, not urgent — see Section 18 backlog.

---

## 16. LAYOUT & PWA

- Top + bottom navbar: position fixed on ALL pages including dashboard
- Viewport: user-scalable=no, no horizontal scroll, no zoom
- PWA install: via Unduh Aplikasi in hamburger menu ONLY — no in-UI install banner
- Mascot (SUNY): SVG + CSS only, no image files. Letter S on chest. Mood-based eyes. Dashboard + landing page only.

---

## 17. PRE-DEPLOY CHECKLIST

1. Generate plan works for all tiers
2. Subscription popup correct for FREE/EXPIRED
3. Locked tabs (Meal Plan, Progress) locked for FREE/EXPIRED — Workout Plan tab (including the relocated Deload Week/Progress Projection/Program Details blocks) is INTENTIONALLY free for all tiers, see Section 2b — do not treat this as a bug
4. Workout checklist renders correctly (sequential, no remap)
5. Extended month: 4 full weeks, correct progression, no extra rest days
6. streak_carry_over written correctly on extend confirm
7. Push notification cron active
8. ADMIN account: no locks, no counters
9. PNG export: native Canvas only, transparent background
10. All UI text present in EN/ID/ZH — including exercise names, coaching cues, warm-up/cool-down, split day-prefix, weekday names, and the Program Overview paragraph (all confirmed as of 1 Aug 2026; only the rest-interval "seconds" unit label is a known, deliberately-deferred exception — see Section 15)
11. Dark + light mode correct on all pages
12. Route map visible for all tiers
13. Extend Month button: shows only at >= 80% of VIEWED plan
14. Download Progress PNG: fresh data from DB, matches dashboard %
15. `/programs` legacy URL redirects to `/program/custom`, no dead nav links remain
16. Results page shows exactly 3 tabs (Workout Plan / Meal Plan / Progress) — no leftover references to the old Grocery List or Info & Safety tabs anywhere (nav, deep links, i18n)
17. "Coach's Program Calibration" card is gone from the Results page in all 3 languages

---

## 18. BACKLOG (as of 2 Aug 2026)

**MAJOR PIVOT — RESOLVED 4 Jul 2026:**
- ✅ AI dependency fully removed from generate-plan. Trigger was Lovable Cloud & AI credit exhaustion, but the decision to go fully rule-based is permanent product direction, not a stopgap. Both WORKOUT_TEMPLATE_LOGIC.md and MEAL_TEMPLATE_LOGIC.md are complete and define the entire generation logic deterministically.

**RESOLVED since 4 Jul (rollout continuation) — this entire rollout is now COMPLETE:**
- ✅ Programs-page removal (24-25 Jul) — see Section 4 for the retained `normalizeGoal` safety net.
- ✅ Exercise/workout-engine i18n gap, full history (25 Jul – 1 Aug) — see Section 15 for the complete three-round history. Nothing outstanding except the LOW-priority rest-interval unit label.
- ✅ Permanent E2E fixture test account (27 Jul) — see Section 2a.
- ✅ UI tab restructuring 5→3 tabs (30 Jul) — see Section 2b, including the deliberate gating decision.
- ✅ "Coach's Program Calibration" card removed + "Coach Surya" program overview paragraph made translatable (1 Aug) — see Section 2b.

**Publish readiness:** with the above complete, the full "ship together" scope (rule-based engine + form redesign + Programs removal + i18n + tab restructuring) is done. Publish is now a decision for Coach to make, not blocked by any known outstanding technical item. A full combined smoke test (generation → all 3 tabs → all 3 languages → FREE vs PAID tier behavior) was run 2 Aug 2026 and passed clean.

**RESOLVED since 17 Jun:**
- ✅ Push notification fix (evening branch + test mode) — deployed
- ✅ Extended Month Bug 2 — fixed
- ✅ Saved Plans fraction off-by-one (timestamp vs date comparison) — fixed 19 Jun
- ✅ "This Week" counter wrong week boundary (Monday ISO vs plan-anchored) — fixed 19 Jun
- ✅ Bar chart window mismatch on Results.tsx — fixed 19 Jun
- ✅ Security audit cluster (3 fixed: saved_plans.plan_completed_at client-trust, activity_sessions.distance_km client-trust, FIRST_GENERATE row-existence-only; 2 verified already-fixed) — 20 Jun
- ✅ PNG share card transparency redesign for "Download Daily Progress" and "Download Progress" cards — fixed & manually verified 21 Jun
- ✅ STREAK_30 "Unstoppable" stuck Locked despite longest_streak already >= 30 — removed redundant client-side gate in checkWorkoutStreakMedals; RPC's longest_streak check is now the sole gate — fixed & verified 25 Jun (see Section 14)
- ✅ Dependency vulnerabilities (jspdf, @supabase/supabase-js, react-router-dom, recharts/lodash) — patched to safe versions, no major version jumps — fixed & build-verified 26 Jun (see Section 13)
- ✅ Prompt injection hardening on generate-plan — extended INJECTION_PATTERNS denylist, re-verified end-to-end against live Claude API with 0 leakage — fixed & verified 26 Jun (see Section 13)
- ✅ Site-wide outage (all routes except Home blank) — caused by the @supabase/supabase-js 2.108.2 upgrade tightening realtime channel reuse semantics, crashing useSubscription's 8 simultaneous consumers — fixed same-day 26 Jun with a module-level singleton guard in useSubscription.ts; verified working on Progress/Program/Plans/Profile after a dev-server restart + hard reload (see Section 13 for the operational lesson about stale module instances)

**HIGH PRIORITY:**
- Swap Workout Days feature

**MEDIUM PRIORITY:**
- Subscription Reminder H-3
- XP Reward System
- Admin Report Charts verify
- Independent Playwright re-check of Progress-tab gating under FREE tier specifically (Meal tab gating confirmed working; Progress uses the identical handler but a test run got stuck on a lingering dialog before it could confirm that specific tab) — very low risk, same code path as the already-confirmed Meal tab

**LOW PRIORITY / PENDING:**
- Rest-interval string ("90-180 seconds") not translated in ID/ZH — only the unit word, deliberately deferred 1 Aug 2026, low value
- FCM Migration (Android Doze fix for Web Push)
- Weight Tracking full feature
- Social Sharing
- SEO optimization
- Workout Timer
- Add regression tests covering the 19 Jun date-window fix cluster (Section 6a) — not yet implemented, consider batching into one test-writing prompt rather than one per bug
- bump_longest_streak client-trusted value and unlimited XP via increment_user_xp — both accepted risks, deprioritized (see Security Memory doc for full reasoning)
- Dead prop cleanup: `onOpenPrograms` in `Index.tsx` (confirmed unreachable — never wired to a click handler in the DOM) — cosmetic, no functional risk
- FeedbackModal reads `program_type` as plan goal instead of the real Fitness Goal field — cosmetic mislabeling, deferred
- Raw `program_type` display localization (Dashboard, SavedPlans, Results subtitle show the raw lowercase token untranslated) — cosmetic, low priority
- Food Allergies multi-select redesign (currently free-text, not broken, just inconsistent with the other multi-select fields)
