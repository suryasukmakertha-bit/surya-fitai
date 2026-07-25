# Diagnostic Report — Read-Only

No code changes. Evidence only.

---

## PART 1 — EXERCISE_POOL / name field audit

### 1. Type + sample entries (`supabase/functions/generate-plan/index.ts`)

Interface (lines ~195–205):

```ts
interface ExerciseDef {
  name: string;
  muscle: WMuscle;
  equipment: WEquipment;
  difficulty: WDifficulty;
  isCompound: boolean;
  excludedBy: WLimitation[];
}
```

There is **only one naming field: `name` (plain string)**. No `nameKey`, no `id`, no `demoKey`.

Sample entries (lines 209–212):

```ts
{ name: 'Barbell Bench Press',   muscle: 'chest',    equipment: 'gym', difficulty: 'intermediate', isCompound: true,  excludedBy: ['wrist'] },
{ name: 'Lat Pulldown',          muscle: 'back',     equipment: 'gym', difficulty: 'beginner',     isCompound: true,  excludedBy: [] },
{ name: 'Machine Shoulder Press',muscle: 'shoulder', equipment: 'gym', difficulty: 'beginner',     isCompound: true,  excludedBy: ['shoulder'] },
```

### 2. Code path EXERCISE_POOL.name → response `exercises[].name`

`generateWorkout()` (L697) → `selectSessionExercises()` returns `ExerciseDef[]` → `buildExerciseOutput(ex, …)` (L619) constructs:

```ts
const base: ExerciseOutput = {
  name: ex.name,          // ← literal English string copied verbatim
  sets, reps, rest, tempo,
  cues: isCardio ? 'Steady breathing, controlled cadence.' :
        compound ? 'Brace core, controlled eccentric, full range of motion.' :
                   'Slow controlled tempo, squeeze target muscle at peak.',
  …
};
```

No key renaming, no flattening — `ex.name` is a literal English string in the pool and is written straight into the response object.

### 3. Frontend consumer (`src/pages/Results.tsx`)

Workout list render (L1495):

```tsx
<span className="text-foreground font-medium">{ex.name}</span>
```

Coaching cue render (L1501–1502):

```tsx
{ex.cues && (
  <p className="…"><Lightbulb className="w-3 h-3" /> {ex.cues}</p>
)}
```

Both rendered **raw**. No `t(...)`, no `tKey(...)`, no translation lookup.

### 4. Contrast — meal render pipeline (same file)

Meal helpers (L335–345):

```ts
const resolveFoodLine = (raw: string): string => {
  const parts = raw.split(" · ");
  if (!parts.length || !parts[0].startsWith("food.")) return raw;
  const name = tKey(parts[0]);
  return [name, ...parts.slice(1)].join(" · ");
};
const resolveMealName = (raw: string): string =>
  raw && raw.startsWith("meal.") ? tKey(raw) : raw;
```

Meal strings are emitted by the engine as i18n keys (`food.dada_ayam_panggang`, `meal.breakfast`) and resolved through `tKey()` at render. Workout strings are not — no matching helper exists for exercise names/cues.

### 5. Coaching cues, warm-up/cool-down, weekly-split labels

All four are literal English strings baked into the engine.

- **Cues** — L634–636 (see snippet above): three fixed English sentences.
- **warmUp** — L710:
  ```ts
  const warmUp = equipment === 'gym'
    ? '5-7 min: (1) 5 min light cardio (treadmill/bike/marching); (2) Arm circles 10x each direction; …'
    : '5-7 min: (1) Marching/light jumping jacks 2-3 min; …';
  ```
  Rendered raw at Results.tsx L1450: `<p …>{plan.warmUp}</p>`.
- **coolDown** — L714:
  ```ts
  const coolDown = '5 min: (1) Easy walk/march in place 1-2 min, breathing focus; (2) Static hamstring stretch 30s per leg; …';
  ```
  Rendered raw at Results.tsx L1524.
- **weeklySplit** — L689:
  ```ts
  const weeklySplit: string[] = sessionOrder.map((s, i) => `Day ${i + 1}: ${sessionLabel(s)}`);
  ```
  where `sessionLabel()` returns `'Full Body A'`, `'Upper Body A'`, `'Push'`, etc. (L320–330). Rendered raw at L1460 (`plan.weeklySplit.map((split, i) => …)`), no `t()`.
- **weekly_schedule** — L695–702: `${dayNames[d]}: ${sessionLabel(...)}` with `dayNames = ['Mon','Tue',…]`. Rendered raw at L1628.
- **day label** — `formatDayLabel()` L668:
  ```ts
  const weekday = ['Sunday','Monday',…][d.getDay()];
  return `Week ${week} - ${weekday}, ${iso}`;
  ```
  Also English literal.

Zero translation call sites for any of these fields anywhere in `src/`.

### 6. Genuine gap or intended?

**Genuine gap for exercise names.** The prior meal-engine turns established `{key, params}` / `food.*` / `meal.*` as the locked i18n mechanism, and that pattern was applied to the meal engine only. The workout engine was never converted — `EXERCISE_POOL` has no `nameKey` field and no i18n helper exists for it.

Regarding written spec: no verbatim requirement was located in the repo — searches over `KNOWLEDGE.md` and any `WORKOUT_TEMPLATE_LOGIC.md` are not surfaced in the file list provided. **Unconfirmed** whether spec explicitly mandated i18n keys for exercise names; only the meal-side spec was executed via that mechanism. Coaching cues, warm-up, cool-down, weekly-split labels are English literals by current implementation and no prior turn is recorded as converting them.

---

## PART 2 — Tab re-test with unlocked account: blocker

### Subscriptions inventory (raw query result, today = 2026-07-25)

```
email                              | status | trial_end / sub_end        | plans
adiputra.ap353@gmail.com           | trial  | 2026-05-26 (expired)       | 1
projectwebappsurya@gmail.com       | trial  | 2026-05-12 (expired)       | 2
suryadmnstrs@gmail.com             | active | sub_end 2026-04-30 (expired)| 2
riskyjul34@gmail.com               | trial  | 2026-04-21 (expired)       | 1
surya.sukmakertha@gmail.com        | trial  | 2026-04-03 (expired)       | 3
```

**No account in the DB currently has an active trial or paid subscription.** Every row's `trial_end` / `subscription_end` is in the past.

Exception path — `useSubscription.ts` L81:

```ts
if (email?.toLowerCase() === SPECIAL_EMAIL.toLowerCase()) {
  return { …, isUnlimited: true, isSubscriptionActive: true, … };
}
```

`SPECIAL_EMAIL = 'surya.sukmakertha@gmail.com'` (L6) is hardcoded-unlimited regardless of subscription row. This user has 3 saved plans and would bypass all tab locks.

### Status of Part 2 tab inspection

I did not execute Playwright in this turn because plan mode restricts stateful commands, and the injected-session identity in this sandbox is not verified against the SPECIAL_EMAIL account. Two viable paths, need your pick:

**Option A — Use the SPECIAL_EMAIL account** (`surya.sukmakertha@gmail.com`). Purely read: load one of its 3 existing saved plans on `/results` and inspect each tab's DOM. No writes, no new plan generation. Requires confirming that the injected browser session in this sandbox belongs to this account (or accepting whichever account it belongs to and expecting Meals/Grocery/Info tabs to remain locked).

**Option B — Temporarily extend a trial** on the injected-session account by updating `subscriptions.trial_end` to a future date. This is a stateful DB write, disallowed in plan mode; would need explicit approval.

### Which do you want?

- A: read-only tab DOM inspection under SPECIAL_EMAIL (only viable if that session is what's injected — I'll confirm on the first navigation)
- B: approve a one-row trial extension so the currently-injected user unlocks tabs, then inspect and revert
- C: skip Part 2 for now; the Part 1 findings are the actionable output

Reply with A / B / C and I'll proceed accordingly.
