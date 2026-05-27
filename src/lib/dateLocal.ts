/**
 * Local-timezone date helpers.
 *
 * The entire app must derive "today" from the user's device timezone — never
 * from UTC. `new Date().toISOString().slice(0,10)` is UTC and can be off by
 * ±1 day across the date line; do not use it for user-facing "today" logic.
 */

/** YYYY-MM-DD in the user's local IANA timezone. */
export function getTodayLocal(): string {
  const tz = (() => {
    try { return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"; }
    catch { return "UTC"; }
  })();
  // 'en-CA' yields YYYY-MM-DD.
  return new Date().toLocaleDateString("en-CA", { timeZone: tz });
}

/** YYYY-MM-DD for an arbitrary Date in local time (no UTC drift). */
export function fmtLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** IANA timezone of the device. Falls back to 'UTC'. */
export function getLocalTimezone(): string {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"; }
  catch { return "UTC"; }
}