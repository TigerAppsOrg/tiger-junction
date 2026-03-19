// MCP response helpers — convert DB-encoded values to human-readable strings

const DAY_BITS: [number, string][] = [
  [1, "M"],
  [2, "T"],
  [4, "W"],
  [8, "Th"],
  [16, "F"],
];

const NULL_TIME = -420;

/**
 * Convert a bitmask day value to an array of day abbreviations.
 * M=1, T=2, W=4, Th=8, F=16
 */
export function valueToDays(value: number): string[] {
  return DAY_BITS.filter(([bit]) => (value & bit) !== 0).map(([, day]) => day);
}

/**
 * Convert a minutes-since-8AM time value to a 12-hour time string.
 * NULL_TIME (-420) returns "TBA".
 */
export function valueToTime(value: number): string {
  if (value === NULL_TIME) return "TBA";
  const totalMinutes = value + 480; // offset to minutes since midnight
  const hour24 = Math.floor(totalMinutes / 60);
  const minute = totalMinutes % 60;
  const hour12 = hour24 % 12 || 12;
  const ampm = hour24 >= 12 ? "PM" : "AM";
  return `${hour12}:${minute.toString().padStart(2, "0")} ${ampm}`;
}

/**
 * Convert a term code to a human-readable name.
 * e.g., 1264 → "Spring 2026", 1252 → "Fall 2024"
 * Pattern: last digit 2=Fall, 4=Spring. The year is derived from the code.
 */
export function termCodeToName(code: number | string): string {
  const num = typeof code === "string" ? parseInt(code, 10) : code;
  const semester = num % 10 === 2 ? "Fall" : "Spring";
  // Term 1232 = Fall 2022. The hundreds digit cycles: 12x = 202x decade.
  // 1232→2022, 1242→2023, 1252→2024, 1262→2025, 1272→2026
  const tens = Math.floor((num % 100) / 10); // e.g., 1264 → 6
  const baseYear = 2010 + tens; // 6 → 2016... but 1232 = Fall 2022
  // More precisely: 1232 = Fall 2022. 123x → x=2 → Fall, tens=3 → year = 2020 + (3-1) = 2022
  // 1242 = Fall 2023. tens=4 → 2020 + (4-1) = 2023
  // 1264 = Spring 2026. tens=6 → 2020 + (6-1) = 2025... but spring bumps +1
  // Actually: Fall = 2019 + tens, Spring = 2019 + tens
  // 1232: tens=3, Fall → 2019+3 = 2022 ✓
  // 1234: tens=3, Spring → 2019+3+1 = 2023 ✓
  // 1264: tens=6, Spring → 2019+6+1 = 2026 ✓
  const year = 2019 + tens + (semester === "Spring" ? 1 : 0);
  return `${semester} ${year}`;
}

/**
 * Convert day abbreviations to a bitmask.
 * e.g., ["M", "W", "F"] → 21 (1+4+16)
 */
export function daysToBitmask(days: string[]): number {
  const dayMap: Record<string, number> = { M: 1, T: 2, W: 4, Th: 8, F: 16 };
  return days.reduce((mask, d) => mask | (dayMap[d] ?? 0), 0);
}

/**
 * Convert a 12-hour time string to the internal minutes-since-8AM value.
 * e.g., "10:00 AM" → 120, "1:30 PM" → 330
 * Inverse of valueToTime.
 */
export function timeToValue(time: string): number {
  const match = time.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return NULL_TIME;
  let hour = parseInt(match[1], 10);
  const minute = parseInt(match[2], 10);
  const ampm = match[3].toUpperCase();
  if (ampm === "PM" && hour !== 12) hour += 12;
  if (ampm === "AM" && hour === 12) hour = 0;
  const totalMinutes = hour * 60 + minute;
  return totalMinutes - 480; // convert to minutes-since-8AM
}

/**
 * Convert a raw section record's encoded days/times to human-readable fields,
 * preserving all other fields on the object.
 */
export function formatSection<T extends { days: number; startTime: number; endTime: number }>(
  section: T
): Omit<T, "days" | "startTime" | "endTime"> & {
  days: string[];
  startTime: string;
  endTime: string;
} {
  const { days, startTime, endTime, ...rest } = section;
  return {
    ...rest,
    days: valueToDays(days),
    startTime: valueToTime(startTime),
    endTime: valueToTime(endTime),
  };
}
