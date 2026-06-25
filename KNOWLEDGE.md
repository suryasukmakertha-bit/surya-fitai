# SURYA-FITAI SYSTEM KNOWLEDGE
> Single source of truth. Read this before making ANY change.
> Last updated: 25 Jun 2026

---

## 1. SYSTEM OVERVIEW

**App:** Surya-FitAI — AI-powered fitness PWA
**Domain:** surya-fitai.com
**Stack:** React + Vite + Supabase (hrxqvheudexwswmlqbgw) + Midtrans (production)
**Languages:** EN (default), ID, ZH — ALL UI text must have all 3 via t('key')
**AI:** Claude API (claude-sonnet-4) for plan generation
**Dev tool:** Lovable (prompt-based, English only)
**Assets:** GitHub CDN (https://raw.githubusercontent.com/suryasukmakertha-bit/surya-fitai-assets/main/)

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

## 3. PLAN RULES

- New plan: plan_started_at = user selected date, NEVER NOW()
- Day card: days[0] → card 0, sequential index only, never remap or reorder
- Exercise list IDENTICAL Week 1-4 (same exercises, days, count):
  - W1 Foundation: lighter weight
  - W2 Volume: increase reps
  - W3 Intensity: increase weight
  - W4 Deload: -1 set, weight -20%
- Goals supported: Bulking, Cutting
- RIR by experience level:
  - Beginner: Compound 4 RIR, Isolation 3 RIR
  - Intermediate: Compound 3 RIR, Isolation 2 RIR
  - Advanced: Compound 2 RIR, Isolation 0-1 RIR
- ExerciseDB removed — replaced with hardcoded pool of 15 bodyweight exercises

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

**⚠️ Renderer mismatch lesson (21 Jun 2026):** there can be MORE than one canvas renderer for visually-similar cards (e.g. a separate "celebration popup" renderer vs. the actual download-button renderer). Before editing, always confirm with Lovable which renderer is actually wired to the specific button/trigger being changed — do not assume there's only one. After any change, require a freshly generated PNG for visual comparison before accepting "done." Do not accept a text description of changes as proof they were applied to the live code path.

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

**No ExerciseDB:** Removed due to commercial licensing — hardcoded bodyweight pool only

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
3. Locked tabs locked for FREE/EXPIRED
4. Workout checklist renders correctly (sequential, no remap)
5. Extended month: 4 full weeks, correct progression, no extra rest days
6. streak_carry_over written correctly on extend confirm
7. Push notification cron active
8. ADMIN account: no locks, no counters
9. PNG export: native Canvas only, transparent background
10. All UI text present in EN/ID/ZH
11. Dark + light mode correct on all pages
12. Route map visible for all tiers
13. Extend Month button: shows only at >= 80% of VIEWED plan
14. Download Progress PNG: fresh data from DB, matches dashboard %

---

## 18. BACKLOG (as of 25 Jun 2026)

**RESOLVED since 17 Jun:**
- ✅ Push notification fix (evening branch + test mode) — deployed
- ✅ Extended Month Bug 2 — fixed
- ✅ Saved Plans fraction off-by-one (timestamp vs date comparison) — fixed 19 Jun
- ✅ "This Week" counter wrong week boundary (Monday ISO vs plan-anchored) — fixed 19 Jun
- ✅ Bar chart window mismatch on Results.tsx — fixed 19 Jun
- ✅ Security audit cluster (3 fixed: saved_plans.plan_completed_at client-trust, activity_sessions.distance_km client-trust, FIRST_GENERATE row-existence-only; 2 verified already-fixed) — 20 Jun
- ✅ PNG share card transparency redesign for "Download Daily Progress" and "Download Progress" cards — fixed & manually verified 21 Jun
- ✅ STREAK_30 "Unstoppable" stuck Locked despite longest_streak already >= 30 — removed redundant client-side gate in checkWorkoutStreakMedals; RPC's longest_streak check is now the sole gate — fixed & verified 25 Jun (see Section 14)

**HIGH PRIORITY:**
- Swap Workout Days feature

**MEDIUM PRIORITY:**
- Subscription Reminder H-3
- XP Reward System
- Admin Report Charts verify

**LOW PRIORITY / PENDING:**
- FCM Migration (Android Doze fix for Web Push)
- Weight Tracking full feature
- Social Sharing
- SEO optimization
- Workout Timer
- Add regression tests covering the 19 Jun date-window fix cluster (Section 6a) — not yet implemented, consider batching into one test-writing prompt rather than one per bug
- bump_longest_streak client-trusted value and unlimited XP via increment_user_xp — both accepted risks, deprioritized (see Security Memory doc for full reasoning)



