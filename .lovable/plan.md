Read-only investigation. No code changes. Classification applies the locked rule: `programType` retained only for (a) title, (b) Beginner lock, (c) analytics.

## 1. FULL REFERENCE MAP

### A. `/programs` route + Programs.tsx + ProgramCard.tsx
- `src/App.tsx:51` — `<Route path="/programs" element={<Programs />} />`
- `src/pages/Programs.tsx:2` — imports `ProgramCard`
- `src/pages/Programs.tsx:47` — `<Navigate to="/auth" state={{ redirectTo: "/programs" }} replace />`
- `src/pages/Programs.tsx:65` — `<ProgramCard />` render
- `src/components/ProgramCard.tsx:27` — component definition (exports both `default` and `programs` array)
- `src/pages/ProgramForm.tsx:16` — `import { programs } from "@/components/ProgramCard"` (used at L105 for `program?.title` title fallback)

### B. `/programs` navigation targets (deep links / redirects)
- `src/pages/SavedPlans.tsx:157` — `navigate("/programs")` (empty-state CTA)
- `src/pages/SavedPlans.tsx:228` — `<Button onClick={() => navigate("/programs")}>{t.generateFirst}</Button>`
- `src/pages/Results.tsx:801` — `navigate("/programs")` (post-completion)
- `src/pages/Results.tsx:1113` — `<button onClick={() => navigate("/programs")}>` (error fallback link)
- `src/pages/Index.tsx:623` — `navigate("/programs")`
- `src/pages/Index.tsx:625` — `navigate("/auth", { state: { redirectTo: "/programs" } })`
- `src/pages/Index.tsx:659` — `onGenerate={() => navigate("/programs")}`
- `src/pages/Index.tsx:661` — `onOpenPrograms={() => navigate("/programs")}`

### C. `programType` client-side (variable/prop/route-param/state)
- `src/pages/ProgramForm.tsx:62-83` — `programTypeToGoal(type)` helper
- `src/pages/ProgramForm.tsx:101` — `const { type } = useParams<{ type: string }>()`
- `src/pages/ProgramForm.tsx:105` — `programs.find((p) => p.id === type)` (title fallback)
- `src/pages/ProgramForm.tsx:114` — `titleKey = \`${type}Title\`` (page title)
- `src/pages/ProgramForm.tsx:128` — `goal: programTypeToGoal(type)` (initial Goal seed)
- `src/pages/ProgramForm.tsx:209` — `effectiveExperience = type === 'beginner' ? 'Beginner' : form.experience` (Beginner lock)
- `src/pages/ProgramForm.tsx:218` — `programType: type` in generate-plan payload
- `src/pages/ProgramForm.tsx:305` — `navigate("/results", { state: { …, programType: type } })`
- `src/pages/ProgramForm.tsx:391` — `type === 'beginner' ? 'grid-cols-1' : …` (Beginner UI lock)
- `src/pages/ProgramForm.tsx:392` — `{type !== 'beginner' && (…)}` (hide Experience select for Beginner)
- `src/pages/ProgramForm.tsx:421` — `DAYS_BY_EXPERIENCE[type === 'beginner' ? 'Beginner' : form.experience]` (training-days lock)
- `src/pages/Results.tsx:361` — `stateProgramType = location.state?.programType`
- `src/pages/Results.tsx:368` — `useState(stateProgramType)`
- `src/pages/Results.tsx:405` — `setProgramType(parsed.programType)` (draft restore)
- `src/pages/Results.tsx:417,420` — persist/deps for draft
- `src/pages/Results.tsx:692,701` — pass `programType` to extend-month generate-plan call
- `src/pages/Results.tsx:723` — extend-month plan name string
- `src/pages/Results.tsx:788` — nav state on extend
- `src/pages/Results.tsx:1146` — save plan name string
- `src/pages/Results.tsx:1161` — `program_type: programType || "custom"` (DB insert)
- `src/pages/Results.tsx:1188` — nav state after save
- `src/pages/Results.tsx:1209-1210` — subtitle `t.heyUser` / `t.hereCustom` templating with `{type}`
- `src/pages/Results.tsx:1235` — `exportPlanToPDF(plan, programType, …)`
- `src/pages/Results.tsx:1697` — `programName={programType || "Fitness"}` (PNG card)
- `src/pages/SavedPlans.tsx:18` — TS type field `program_type: string`
- `src/pages/SavedPlans.tsx:125` — `editName` fallback string uses `plan.program_type`
- `src/pages/SavedPlans.tsx:146` — `navigate("/results", { state: { …, programType: plan.program_type } })`
- `src/pages/SavedPlans.tsx:264` — list-item label fallback `p.program_type`
- `src/pages/SavedPlans.tsx:329` — locked-modal `planName` fallback
- `src/pages/Index.tsx:90,124` — SELECT includes `program_type` column
- `src/pages/Index.tsx:348` — nav state `programType: activePlan.program_type`
- `src/pages/Index.tsx:409,411` — active plan card title/subtitle fallback
- `src/pages/Index.tsx:585,588` — plan list fallback rows
- `src/pages/Index.tsx:667` — nav state `programType: plan.program_type`
- `src/lib/exportPdf.ts:96` — signature `programType?: string`
- `src/lib/exportPdf.ts:155` — `pType = (programType || "Custom")…` (cover header)
- `src/lib/exportPdf.ts:453` — `doc.save(\`Surya-FitAi-${(programType || "plan")}-plan.pdf\`)`
- `src/lib/fitnessCalculations.ts:56,60` — comments referencing prior programType branching (no runtime use)
- `src/components/FeedbackModal.tsx:58,63` — `select("program_type")` then `planGoal = plan?.program_type` for feedback log

### D. `programType` edge function
- `supabase/functions/generate-plan/index.ts:122,127` — `calculateMacros(..., _programType?)` (unused param)
- `supabase/functions/generate-plan/index.ts:785,792-793` — `normalizeGoal(raw, programType)` legacy fallback branch
- `supabase/functions/generate-plan/index.ts:1266` — destructure `programType` from payload
- `supabase/functions/generate-plan/index.ts:1443-1444` — pass to `normalizeGoal` / `calculateMacros`

### E. `program_type` DB / server
- `supabase/migrations/20260214072330_*.sql:53` — `program_type TEXT NOT NULL` column on `saved_plans`
- `src/integrations/supabase/types.ts:421,438,455` — generated types (Row/Insert/Update)
- `supabase/functions/admin-report/index.ts:52` — select `program_type` from `saved_plans`
- `supabase/functions/admin-report/index.ts:145` — `const t = p.program_type ?? "unknown"` (distribution grouping)

### F. i18n strings mentioning "Programs"
- `src/contexts/LanguageContext.tsx:9,665,1312` — `backToPrograms`
- `src/contexts/LanguageContext.tsx:160,816,1463` — `goBackPrograms`

---

## 2. CLASSIFICATION PER LOCATION

**SAFE TO REMOVE (Programs-page UI/flow):**
- `App.tsx:51` (route), `Programs.tsx` (all lines), `ProgramCard.tsx` (component + `programs` array — but see UNCLEAR for `ProgramForm.tsx:16,105` consumer)
- All 8 `/programs` navigation targets in section 1.B (SavedPlans ×2, Results ×2, Index ×4) — replace with `/program/custom`
- `LanguageContext.tsx` `backToPrograms` / `goBackPrograms` keys (only consumers are the removable nav links)
- `ProgramForm.tsx:62-83` `programTypeToGoal` helper + `:128` seed call — Goal is now an independent Select

**MUST RETAIN — page title:**
- `ProgramForm.tsx:114` (`${type}Title` key lookup)
- `SavedPlans.tsx:18,125,264,329`; `Index.tsx:409,411,585,588` — plan-name display fallbacks (persisted DB value drives historical titles)
- `Results.tsx:723,1146,1209-1210,1235,1697` — displayed subtitle / PDF / PNG use the saved `programType` as a label
- `exportPdf.ts:96,155,453` — PDF header + filename
- `LanguageContext.tsx` `heyUser` / `hereCustom` templates (consumed by Results.tsx:1209-1210)

**MUST RETAIN — Beginner lock logic:**
- `ProgramForm.tsx:101` (read `type`), `:209` (effectiveExperience), `:391` (grid layout), `:392` (hide Experience), `:421` (DAYS_BY_EXPERIENCE)

**MUST RETAIN — analytics metadata:**
- `ProgramForm.tsx:218` payload `programType: type`
- `Results.tsx:1161` DB insert `program_type: programType || "custom"`
- `Results.tsx:361,368,405,417,420` (state plumbing that carries the value to insert)
- `Results.tsx:692,701,788,1188`; `SavedPlans.tsx:146`; `Index.tsx:348,667`; `ProgramForm.tsx:305` — nav-state plumbing that preserves it
- `Index.tsx:90,124` SELECT includes `program_type`
- `integrations/supabase/types.ts:421,438,455`
- `migrations/20260214072330_*.sql:53` (DB column)
- `admin-report/index.ts:52,145` (grouping)
- `FeedbackModal.tsx:58,63` (attaches `program_type` as `planGoal` to feedback records)
- `generate-plan/index.ts:1266` (destructure); `:785,792-793` (`normalizeGoal` fallback — retained per current spec as safety net for legacy/absent Goal); `:127,1444` `_programType` unused param

**UNCLEAR (flag explicitly):**
- `ProgramForm.tsx:16` `import { programs } from "@/components/ProgramCard"` + `:105` `programs.find((p) => p.id === type)` used as `program?.title` fallback at `:115`. If `ProgramCard.tsx` is deleted, this import breaks; the `programs` array is used purely for a title fallback that only fires when the `${type}Title` i18n key is missing. Decision needed: move the `programs` array into `ProgramForm.tsx` (or a shared const), delete the fallback and rely solely on i18n, or keep `ProgramCard.tsx` alive for the array export only.
- `Results.tsx:801` `navigate("/programs")` post-completion — semantically "start a new plan"; unclear whether to retarget `/program/custom` or a different post-completion destination.
- `Index.tsx:659,661` `onGenerate` / `onOpenPrograms` — same "start new plan" semantic; retarget vs. change UX copy needs a product decision (component prop is literally named `onOpenPrograms`).
- `fitnessCalculations.ts:56,60` — comment-only references; harmless but stale, unclear whether to keep for historical context or scrub.
- `generate-plan/index.ts:785,792-793` `normalizeGoal` `programType` fallback branch — locked rule says "analytics metadata only", which implies this fallback is a candidate for removal, but Goal-field seed was only added recently; unclear whether legacy saved plans / in-flight sessions could still submit without `goal`.

---

## 3. ROUTE & NAV AUDIT (destinations still pointing at `/programs`)

Excluding BottomNav/AppHeader (already changed):
- `src/App.tsx:51` — route definition still mounted
- `src/pages/Programs.tsx:47` — self-referencing auth redirect
- `src/pages/SavedPlans.tsx:157, 228`
- `src/pages/Results.tsx:801, 1113`
- `src/pages/Index.tsx:623, 625, 659, 661`

**Total: 9 `/programs` link/redirect sites across 5 files (plus the route definition itself).**

## 4. DOWNSTREAM CONSUMERS reading `programType` / `program_type`

- **Edge function `generate-plan`** (`supabase/functions/generate-plan/index.ts`): destructured at L1266; passed to `normalizeGoal(goal, programType)` at L1443 (fallback branch L785,792-793); passed as unused `_programType` to `calculateMacros` at L1444.
- **Edge function `admin-report`** (`supabase/functions/admin-report/index.ts:52,145`): SELECTs `program_type` and groups occurrence counts.
- **DB column** `saved_plans.program_type` — NOT NULL (`migrations/20260214072330_*.sql:53`). Any INSERT must provide a value; `Results.tsx:1161` supplies `"custom"` fallback.
- **PNG share card**: `Results.tsx:1697` passes `programName={programType || "Fitness"}` to the download card component (renders "Fitness" if empty).
- **PDF export**: `lib/exportPdf.ts:155` cover, `:453` filename.
- **Feedback log**: `FeedbackModal.tsx:58,63` reads `program_type` from `saved_plans` and stores it as `plan_goal` on the feedback record.
- **No Supabase RPCs or triggers** reference `program_type` (only the direct SELECTs listed above).
- **No realtime channels** filter on it.

## 5. COUNT CHECK

Prior estimate was "8 codebase locations". Actual distinct locations touching `programType` / `program_type` / `/programs` / `Programs.tsx` / `ProgramCard.tsx`:

- Client files: 8 (`App.tsx`, `Index.tsx`, `SavedPlans.tsx`, `Results.tsx`, `ProgramForm.tsx`, `Programs.tsx`, `ProgramCard.tsx`, `FeedbackModal.tsx`)
- Client libs / contexts: 3 (`exportPdf.ts`, `fitnessCalculations.ts` comments, `LanguageContext.tsx` i18n strings)
- Generated / integration: 1 (`integrations/supabase/types.ts`)
- Edge functions: 2 (`generate-plan/index.ts`, `admin-report/index.ts`)
- Migrations: 1 (`20260214072330_*.sql`)

**Actual = 15 files.** Prior "8" likely counted only client pages/components with active runtime references and omitted (a) `App.tsx` route, (b) generated types, (c) migration, (d) edge functions, (e) `exportPdf.ts`, (f) `FeedbackModal.tsx`, (g) `fitnessCalculations.ts` comments. The count grew because this audit widened scope to server, DB, generated types, and i18n strings.

---

No file changes, no removal proposal. Awaiting next prompt to design the removal sequence.
