# Plan: Dependent trainingDaysPerWeek dropdown

## Investigation results (baseline)

### 1. trainingDaysPerWeek Select — `src/pages/ProgramForm.tsx` lines 391–401

```tsx
<div className="space-y-2">
  <Label>{t.trainingFrequency}</Label>
  <Select value={form.trainingDaysPerWeek} onValueChange={(v) => set("trainingDaysPerWeek", v)}>
    <SelectTrigger className="bg-secondary border-border"><SelectValue /></SelectTrigger>
    <SelectContent>
      {[2, 3, 4, 5, 6, 7].map((n) => (
        <SelectItem key={n} value={String(n)}>{(t as any)[`freq${n}`]}</SelectItem>
      ))}
    </SelectContent>
  </Select>
</div>
```

Default value in state (line 121): `trainingDaysPerWeek: "4"`. Also read at lines 152–153 (BMR/TDEE memo), 198 (rest-day compute), 218 (payload).

### 2. Experience Select — lines 380–388

```tsx
<Label>{t.experienceLevel}</Label>
<Select value={form.experience} onValueChange={(v) => set("experience", v)}>
  <SelectTrigger className="bg-secondary border-border"><SelectValue /></SelectTrigger>
  <SelectContent>
    <SelectItem value="Beginner">{t.beginner}</SelectItem>
    <SelectItem value="Intermediate">{t.intermediate}</SelectItem>
    <SelectItem value="Advanced">{t.advanced}</SelectItem>
  </SelectContent>
</Select>
```

Default (line 118): `experience: "Beginner"`. `onValueChange` is the generic `set("experience", v)` — no side effects, no clamping of trainingDaysPerWeek today. This block is only rendered when the program type is not `beginner` (Beginner program forces experience internally via `effectiveExperience` at line 204).

### 3. Engine behavior on out-of-spec combos — `supabase/functions/generate-plan/index.ts`

- Validator (line 32–34): only enforces experience ∈ {Beginner, Intermediate, Advanced} and days ∈ [2,7]. No cross-field check.
- Split Selector `pickSessionOrder(days, exp)` (lines 282–297): fully defined for every (days, exp) pair — no crash. Out-of-spec combos silently map:
  - Beginner + 6 → 6× PPL (Push/Pull/Legs × 2) — spec forbids advanced PPL for beginners.
  - Beginner + 7 → 6× PPL + WEAKPOINT — same issue.
  - Intermediate + 7 → same as Advanced 7.
  - Beginner + 3 → FB (correct); Advanced + 3 → PPL (correct).
- Behavior: silent fallback to a valid-looking but off-spec split; no error surfaced.

### 4. Existing DB rows (saved_plans.user_info)

```
Advanced      / 5  → 1
Beginner      / 3  → 2
Beginner      / 4  → 3
Beginner      / null → 2   (legacy, no field)
Intermediate  / 3  → 1
Intermediate  / 5  → 2
```

Zero out-of-spec rows. No user is currently in a Beginner+6/7 or Intermediate+7 state — Extend Month is not at risk from historical data.

### 5. Other readers of the [2,3,4,5,6,7] list in ProgramForm.tsx

None. `rg` shows the literal array only at line 397. `parseInt(form.trainingDaysPerWeek) || 4` at lines 152 and 198 defensively falls back to 4 for any non-numeric value — safe against clamping.

## Change (frontend only, minimum diff)

### `src/pages/ProgramForm.tsx`

1. Add a small const above the JSX (near other option consts):
   ```ts
   const DAYS_BY_EXPERIENCE: Record<string, number[]> = {
     Beginner:     [2, 3, 4, 5],
     Intermediate: [2, 3, 4, 5, 6],
     Advanced:     [2, 3, 4, 5, 6, 7],
   };
   ```
2. Compute the allowed list from `effectiveExperience` (already derived at line 204 for the payload; lift the same expression for the JSX: `const uiExperience = type === 'beginner' ? 'Beginner' : form.experience;`). This guarantees the Beginner program (which hides the experience Select) still gets the Beginner cap of 5.
3. In the trainingDaysPerWeek Select, replace `[2,3,4,5,6,7]` with `DAYS_BY_EXPERIENCE[uiExperience] ?? [2,3,4,5,6,7]`.
4. Clamp on experience change: wrap the experience `onValueChange` so that after `set("experience", v)`, if the current `form.trainingDaysPerWeek` exceeds the new max, snap it down to the new max (e.g. Intermediate+7 → Intermediate+6 when switching from Advanced). Never snap up — user's lower choice is preserved.
5. No changes to state defaults (`"Beginner" / "4"` are inside every allowed set).

### Out of scope

- Edge function validator, Split Selector, or any Layer A/B/C code — untouched. The frontend restriction is now the single guarantee.
- No migration for historical rows (all are already valid).
- No i18n changes — `freq2..freq7` keys already exist and are reused as-is.
- Allergies, limitations, and all other form fields — untouched.

## Verification

1. Build passes.
2. Manual: pick Advanced + 7, then switch to Intermediate → dropdown value snaps to 6, list shows 2–6. Switch to Beginner → snaps to 5, list shows 2–5. Switch back to Advanced → list re-expands to 2–7, value stays at 5 (no snap-up).
3. Beginner program type (experience Select hidden) → days list is capped to 2–5 via `uiExperience`.
4. Submit Beginner + 5 → payload `experience:"Beginner", trainingDaysPerWeek:"5"` → engine `pickSessionOrder(5,"Beginner")` returns the UL+FB 5-day split (spec-correct). No engine change required.
