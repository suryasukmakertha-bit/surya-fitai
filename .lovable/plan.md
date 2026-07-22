This turn was a read-only investigation as requested. Raw evidence for all 4 items is reported in the chat above:

1. H1 source: `ProgramForm.tsx:114-115, 321` resolves `customTitle` via i18n; EN value in `LanguageContext.tsx:58` = `"New Program"`.
2. Rendered H1 per lang on `/program/custom`: EN `New Program`, ID `Program Baru`, ZH `新计划`.
3. AppHeader Program button (visible only at ≥lg width) navigates to `/program/custom`, H1 `New Program`. At <lg widths (including current 406px preview), the header button is CSS-hidden and the drawer contains no Program item.
4. Legacy `/programs` still returns 200 and renders `Programs.tsx` (`Choose Your Program`) — route not yet removed, per the prior prompt's explicit instruction to keep it as fallback.

No code changes proposed. Awaiting the next prompt (expected: remove `/programs` route + `Programs.tsx` + `ProgramCard.tsx`) before drafting an implementation plan.
