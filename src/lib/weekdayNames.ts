/** Single source of truth for localized weekday / month names.
 *  Used by the PNG progress card (dailyProgressDownload.ts) and by the
 *  day-label resolver used across Results / WorkoutChecklist / PDF export.
 *  Do NOT duplicate these arrays anywhere else. */
export type Lang = "en" | "id" | "zh";

export const WEEKDAY_NAMES: Record<Lang, string[]> = {
  en: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
  id: ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"],
  zh: ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"],
};

export const MONTH_NAMES: Record<Lang, string[]> = {
  en: ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],
  id: ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"],
  zh: ["1月","2月","3月","4月","5月","6月","7月","8月","9月","10月","11月","12月"],
};

/** Short (3-letter) English weekday tokens used by weekly_schedule strings. */
export const SHORT_EN_WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** Monday-based index (0 = Mon) -> localized full weekday name. */
export function weekdayFromMondayIndex(idx: number, lang: Lang): string {
  const sundayIdx = (idx + 1) % 7; // Mon(0) -> 1 ... Sun(6) -> 0
  return (WEEKDAY_NAMES[lang] || WEEKDAY_NAMES.en)[sundayIdx];
}

/**
 * Day labels emitted by the engine look like "Week 1 - Monday, 2026-08-02"
 * (optionally suffixed with " — Rest Day"). The raw string stays the
 * completion-tracking key; this helper is DISPLAY-ONLY and swaps just the
 * English weekday name for its localized form. Anything it does not
 * recognize is returned unchanged (backward compat with old saved plans).
 */
export function localizeDayLabel(label: string, lang: Lang): string {
  if (!label || lang === "en") return label;
  const en = WEEKDAY_NAMES.en;
  const target = WEEKDAY_NAMES[lang] || en;
  let out = label;
  en.forEach((name, i) => {
    out = out.replace(new RegExp(`\\b${name}\\b`, "g"), target[i]);
  });
  return out;
}

/** Localize the short weekday prefix of a weekly_schedule line ("Mon: Push"). */
export function localizeScheduleLine(line: string, lang: Lang): string {
  if (!line) return line;
  const m = line.match(/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s*:\s*(.*)$/);
  if (!m) return line;
  const idx = SHORT_EN_WEEKDAYS.indexOf(m[1]);
  return `${weekdayFromMondayIndex(idx, lang)}: ${m[2]}`;
}
