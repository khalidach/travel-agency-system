// frontend/src/hooks/useDashboardData.ts
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { subDays, startOfDay, endOfDay, format, subYears } from "date-fns";
import * as api from "../services/api";
import { DashboardStats } from "../context/models";

export function useDashboardData() {
  const [dateFilter, setDateFilter] = useState("month");
  const [customDateRange, setCustomDateRange] = useState({
    start: "",
    end: "",
  });

  const dateRangeParams = useMemo(() => {
    const now = new Date();
    let startDate: Date;
    const endDate: Date = endOfDay(now);

    switch (dateFilter) {
      case "today":
        startDate = startOfDay(now);
        break;
      case "month":
        startDate = startOfDay(subDays(now, 30));
        break;
      case "year":
        startDate = startOfDay(subYears(now, 1));
        break;
      case "custom":
        if (customDateRange.start && customDateRange.end) {
          return {
            startDate: customDateRange.start,
            endDate: customDateRange.end,
          };
        }
        return { startDate: undefined, endDate: undefined };
      case "7days":
      default:
        startDate = startOfDay(subDays(now, 7));
        break;
    }
    return {
      startDate: format(startDate, "yyyy-MM-dd"),
      endDate: format(endDate, "yyyy-MM-dd"),
    };
  }, [dateFilter, customDateRange]);

  const {
    data: dashboardData,
    isLoading,
    isError,
  } = useQuery<DashboardStats>({
    queryKey: ["dashboardStats", dateRangeParams],
    queryFn: () =>
      api.getDashboardStats(dateRangeParams.startDate, dateRangeParams.endDate),
  });

  const stats = useMemo(
    () =>
      dashboardData || {
        allTimeStats: {
          totalBookings: 0,
          totalRevenue: 0,
          totalProfit: 0,
          activePrograms: 0,
        },
        dateFilteredStats: {
          totalBookings: 0,
          totalDailyServices: 0,
          totalFactures: 0,
          totalRevenue: 0,
          totalCost: 0,
          totalProfit: 0,
          totalPaid: 0,
          totalRemaining: 0,
        },
        dailyServiceProfitData: [],
        paymentStatus: { fullyPaid: 0, pending: 0 },
        recentBookings: [],
      },
    [dashboardData],
  );

  return {
    stats,
    isLoading,
    isError,
    dateFilter,
    setDateFilter,
    customDateRange,
    setCustomDateRange,
  };
}
