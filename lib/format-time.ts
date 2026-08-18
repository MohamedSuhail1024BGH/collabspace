/**
 * Deterministic local time formatter producing a 12-hour time with uppercase AM/PM.
 * Uses the runtime's local timezone via Date, but formats manually to avoid Intl differences
 * between Node and browsers that can cause hydration mismatches.
 */
export function formatTimeShort(isoTs: string): string {
  const d = new Date(isoTs);
  const hours = d.getHours();
  const minutes = d.getMinutes();
  const h12 = hours % 12 === 0 ? 12 : hours % 12;
  const hh = String(h12).padStart(2, "0");
  const mm = String(minutes).padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  return `${hh}:${mm} ${ampm}`;
}
