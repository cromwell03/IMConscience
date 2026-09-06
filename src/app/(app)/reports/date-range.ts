import { startOfMonth, endOfMonth, subMonths, startOfYear, subYears, endOfYear } from "date-fns";

export type DateRangePreset = "this-month" | "last-month" | "last-3-months" | "last-6-months" | "ytd" | "last-year" | "custom";

export const DATE_RANGE_PRESETS: { value: DateRangePreset; label: string }[] = [
  { value: "this-month", label: "This Month" },
  { value: "last-month", label: "Last Month" },
  { value: "last-3-months", label: "Last 3 Months" },
  { value: "last-6-months", label: "Last 6 Months" },
  { value: "ytd", label: "Year to Date" },
  { value: "last-year", label: "Last Year" },
  { value: "custom", label: "Custom Range" },
];

export function resolveDateRange(preset: string | undefined, from?: string, to?: string): { start: Date; end: Date } {
  const now = new Date();
  switch (preset) {
    case "last-month": {
      const ref = subMonths(now, 1);
      return { start: startOfMonth(ref), end: endOfMonth(ref) };
    }
    case "last-3-months":
      return { start: startOfMonth(subMonths(now, 2)), end: endOfMonth(now) };
    case "last-6-months":
      return { start: startOfMonth(subMonths(now, 5)), end: endOfMonth(now) };
    case "ytd":
      return { start: startOfYear(now), end: now };
    case "last-year": {
      const ref = subYears(now, 1);
      return { start: startOfYear(ref), end: endOfYear(ref) };
    }
    case "custom":
      return {
        start: from ? new Date(from) : startOfMonth(now),
        end: to ? new Date(to) : now,
      };
    case "this-month":
    default:
      return { start: startOfMonth(now), end: endOfMonth(now) };
  }
}
