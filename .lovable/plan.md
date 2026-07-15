# Plan: Redesign `limitations` field as canonical multi-select

## Goal

Replace the free-text `limitations` Textarea in `ProgramForm.tsx` with a 9-option multi-select whose payload is a comma-joined string of the canonical English tokens that `parseLimitations` in the edge function already recognizes. **Zero backend changes.** Allergies stays as-is this prompt.

## Why this shape

Investigation confirmed:
- Edge function's `parseLimitations` (lines 386–400) is a case-insensitive substring matcher over English keywords only: `knee`, `lower back` / `lower_back` / `back pain`, `shoulder`, `wrist`, `ankle`, `hip`, `elbow`, `pregnan`, `none`.
- ID/ZH free-text ("sakit lutut", "肩膀痛") currently parses to `[]` → exclusion is dead for non-English users.
- Engine consumes `WLimitation[]` = `'knee' | 'lower_back' | 'shoulder' | 'wrist' | 'ankle' | 'hip' | 'elbow' | 'pregnancy' | 'none'` via `excludedByLimitations` in `filterPool` / `filterCardioPool` + a pregnancy safety-note branch.

By emitting a joined string of the exact English keywords, every user (any UI language) produces the correct `WLimitation[]` after backend parse — no parser edit, no risk to Layer B.

## Changes (frontend only)

### 1. `src/pages/ProgramForm.tsx`

**State**
- Keep `limitations` as `string` in the form state (still sent as a string to `generate-plan`, unchanged payload key/type).
- Add a derived UI helper: an array of selected canonical tokens, e.g. `limitationTokens: string[]`, either stored as a second state field or derived by splitting `form.limitations`. Prefer a dedicated `Set<string>` state (`selectedLimitations`) whose serialized form is written into `form.limitations` on every toggle — clearest source of truth.
- **Mutual exclusion:** selecting `None` clears all others; selecting any injury clears `None`. If nothing is selected, default the string to `"None"` before submit so the parser returns `['none']` (matches current empty-string behavior).

**JSX (replaces the current `limitations` Textarea block, ~lines 587–590)**
- Section heading (localized): "Physical limitations" / "Batasan fisik" / "身体限制".
- Helper text (localized): "Select any that apply — exercises stressing these areas will be excluded."
- 9 checkbox chips (or shadcn `Toggle` / `Checkbox` inside a responsive grid), one per canonical value. Label rendered via i18n; value written to state is the canonical English token.

| Canonical token   | EN label      | ID label         | ZH label |
|-------------------|---------------|------------------|----------|
| `knee`            | Knee          | Lutut            | 膝盖     |
| `lower back`      | Lower Back    | Punggung bawah   | 下背部   |
| `shoulder`        | Shoulder      | Bahu             | 肩膀     |
| `wrist`           | Wrist         | Pergelangan tangan | 手腕   |
| `ankle`           | Ankle         | Pergelangan kaki | 脚踝     |
| `hip`             | Hip           | Pinggul          | 髋部     |
| `elbow`           | Elbow         | Siku             | 肘部     |
| `pregnancy`       | Pregnancy     | Kehamilan        | 怀孕     |
| `none`            | None          | Tidak ada        | 无       |

Note: the token written into state must be one that `parseLimitations` matches — `"lower back"` (with space) triggers the `s.includes('lower back')` branch. `"pregnancy"` triggers `pregnan`. All others are single-word substring matches.

**Serialization**
- On every toggle: `form.limitations = Array.from(selected).join(', ')`.
- If `selected` is empty → write `"None"` (defensive; parser also treats empty as `['none']`, but explicit is clearer for debugging and for the payload log).

**Payload**
- No change: `limitations: form.limitations` (string). Backend receives e.g. `"shoulder, lower back"` → parser returns `['shoulder','lower_back']`.

### 2. `src/contexts/LanguageContext.tsx`

Add localized strings for the section heading, helper text, and the 9 chip labels across `en`, `id`, `zh`. Keep the token→label mapping table-driven (single `LIMITATION_OPTIONS` const in `ProgramForm.tsx`) so JSX stays compact.

## Out of scope

- `parseLimitations` and any edge-function code — untouched.
- Allergies field — remains free-text this prompt.
- Any other form field, i18n key, or component.
- No new tests; existing Layer B unit tests still exercise the engine directly with `WLimitation[]`.

## Verification

1. `bun run build` succeeds.
2. Manual: switch UI language, tick two limitations, submit — inspect `generate-plan` request body: `limitations` is the comma-joined English tokens; other 4 languages of the UI show translated labels but payload is unchanged.
3. Regression: default state (no boxes ticked) submits `"None"` → engine sees `['none']` → no exclusions, same as today's empty-textarea case.
4. Pregnancy tick still produces the safety note (engine line 762 branch).
