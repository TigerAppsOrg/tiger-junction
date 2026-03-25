/**
 * Converts a Princeton term code to a human-readable name.
 * Base: 1232 = Spring 2018. Terms increment by 2.
 * Even offsets from base = Spring, odd offsets = Fall.
 *
 * Examples: 1232 → "Spring 2018", 1262 → "Fall 2025", 1264 → "Spring 2026"
 */
export function termCodeToName(code: number | string): string {
  const n = typeof code === "string" ? parseInt(code, 10) : code;
  if (isNaN(n)) return String(code);
  const offset = (n - 1232) / 2;
  if (!Number.isInteger(offset) || offset < 0) return String(code);
  const year = 2018 + Math.floor(offset / 2);
  const season = offset % 2 === 0 ? "Spring" : "Fall";
  return `${season} ${year}`;
}
