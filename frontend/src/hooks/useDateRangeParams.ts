import { useMemo } from "react";
import { startOfDay, endOfDay, subDays, format } from "date-fns";

export type DateFilter = "today" | "7days" | "month" | "custom";

export interface CustomDateRange {
  start: string;
  end: string;
}

export function useDateRangeParams(
  filter: DateFilter,
  customRange: CustomDateRange,
) {
  return useMemo(() => {
    const now = new Date();
    let startDate: Date;
    const endDate: Date = endOfDay(now);

    switch (filter) {
      case "today":
        startDate = startOfDay(now);
        break;
      case "7days":
        startDate = startOfDay(subDays(now, 7));
        break;
      case "month":
        startDate = startOfDay(subDays(now, 30));
        break;
      case "custom":
        if (customRange.start && customRange.end) {
          return {
            startDate: customRange.start,
            endDate: customRange.end,
          };
        }
        // Fallback or empty if custom range is incomplete
        return { startDate: undefined, endDate: undefined };
      default:
        startDate = startOfDay(subDays(now, 7));
    }

    return {
      startDate: format(startDate, "yyyy-MM-dd"),
      endDate: format(endDate, "yyyy-MM-dd"),
    };
  }, [filter, customRange]);
}
