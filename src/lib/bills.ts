import "server-only";
import { addDays, addWeeks, addMonths, addYears } from "date-fns";
import type { BillFrequency } from "@/lib/types";

export function computeNextDueDate(currentDue: Date, frequency: BillFrequency, customIntervalDays?: number | null): Date {
  switch (frequency) {
    case "WEEKLY":
      return addWeeks(currentDue, 1);
    case "MONTHLY":
      return addMonths(currentDue, 1);
    case "QUARTERLY":
      return addMonths(currentDue, 3);
    case "SEMIANNUAL":
      return addMonths(currentDue, 6);
    case "ANNUAL":
      return addYears(currentDue, 1);
    case "CUSTOM":
      return addDays(currentDue, customIntervalDays && customIntervalDays > 0 ? customIntervalDays : 30);
  }
}
