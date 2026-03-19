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
