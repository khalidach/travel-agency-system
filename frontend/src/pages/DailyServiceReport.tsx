import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { subDays, startOfDay, endOfDay, format, subMonths } from "date-fns";
import * as api from "../services/api";
import DashboardSkeleton from "../components/skeletons/DashboardSkeleton";
import { DollarSign, TrendingUp, Hash, Percent } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface SummaryStats {
  totalSalesCount: string;
  totalRevenue: string;
  totalCost: string;
  totalProfit: string;
}

interface ReportData {
  lifetimeSummary: SummaryStats;
  dateFilteredSummary: SummaryStats;
  byType: {
    type: string;
    count: string;
    totalOriginalPrice: string;
    totalSalePrice: string;
    totalCommission: string;
    totalProfit: string;
  }[];
  monthlyTrend: {
    month: string;
    profit: number;
  }[];
}

export default function DailyServiceReport() {
  const { t } = useTranslation();
  const [dateFilter, setDateFilter] = useState("month");
  const [customDateRange, setCustomDateRange] = useState({
    start: "",
    end: "",
  });

  const dateRangeParams = useMemo(() => {
    if (dateFilter === "custom") {
      if (customDateRange.start && customDateRange.end) {
        return {
          startDate: customDateRange.start,
          endDate: customDateRange.end,
        };
      }
      return { startDate: undefined, endDate: undefined };
    }

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
        startDate = startOfDay(subMonths(now, 12));
        break;
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
    data: reportData,
    isLoading,
    isError,
  } = useQuery<ReportData>({
    queryKey: ["dailyServiceReport", dateRangeParams],
    queryFn: () =>
      api.getDailyServiceReport(
        dateRangeParams.startDate,
        dateRangeParams.endDate,
      ),
  });

  if (isLoading) return <DashboardSkeleton />;
  if (isError || !reportData) return <div>{t("errorLoadingDashboard")}</div>;

  const { lifetimeSummary, dateFilteredSummary, byType, monthlyTrend } =
    reportData;

  const totalLifetimeRevenue = Number(lifetimeSummary.totalRevenue || 0);
  const totalLifetimeProfit = Number(lifetimeSummary.totalProfit || 0);
  const lifetimeProfitMargin =
    totalLifetimeRevenue > 0
      ? (totalLifetimeProfit / totalLifetimeRevenue) * 100
      : 0;

  const statCards = [
    {
      title: t("totalSalesCount"),
      value: Number(lifetimeSummary.totalSalesCount || 0).toLocaleString(),
      icon: Hash,
      color: "bg-blue-500", // Keep these as they are specific brand colors for stats
    },
    {
      title: t("totalRevenue"),
      value: `${totalLifetimeRevenue.toLocaleString()} ${t("mad")}`,
      icon: DollarSign,
      color: "bg-emerald-500",
    },
    {
      title: t("totalProfit"),
      value: `${totalLifetimeProfit.toLocaleString()} ${t("mad")}`,
      icon: TrendingUp,
      color: "bg-orange-500",
    },
    {
      title: t("profitMargin"),
      value: `${lifetimeProfitMargin.toFixed(1)}%`,
      icon: Percent,
      color: "bg-purple-500",
    },
  ];

  const dateFilteredMetrics = [
    {
      title: t("totalSalesCount"),
      value: `${Number(
        dateFilteredSummary.totalSalesCount || 0,
      ).toLocaleString()}`,
    },
    {
      title: t("totalRevenue"),
      value: `${Number(dateFilteredSummary.totalRevenue).toLocaleString()} ${t(
        "mad",
      )}`,
    },
    {
      title: t("totalCost"),
      value: `${Number(dateFilteredSummary.totalCost).toLocaleString()} ${t(
        "mad",
      )}`,
    },
    {
      title: t("totalProfit"),
      value: `${Number(dateFilteredSummary.totalProfit).toLocaleString()} ${t(
        "mad",
      )}`,
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">
          {t("dailyServiceReportTitle")}
        </h1>
        <p className="text-muted-foreground mt-2">
          {t("dailyServiceReportSubtitle")}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <div
              key={index}
              className="bg-card rounded-2xl p-6 shadow-sm border border-border"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    {card.title}
                  </p>
                  <p className="text-2xl font-bold text-foreground mt-2">
                    {card.value}
                  </p>
                </div>
                <div
                  className={`w-12 h-12 ${card.color} rounded-xl flex items-center justify-center shadow-lg`}
                >
                  <Icon className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-card rounded-2xl p-6 shadow-sm border border-border">
          <div className="pb-4 border-b border-border">
            <h3 className="text-lg font-semibold text-foreground mb-4">
              {t("filterPerformance")}
            </h3>
            <div className="flex items-center flex-wrap gap-2">
              <div className="flex items-center space-x-1 bg-muted rounded-lg p-1">
                {["today", "7days", "month", "year", "custom"].map(
                  (filterKey) => (
                    <button
                      key={filterKey}
                      onClick={() => setDateFilter(filterKey)}
                      className={`px-3 py-1.5 text-sm rounded-md transition-all ${
                        dateFilter === filterKey
                          ? "bg-card text-primary shadow-sm font-medium"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {t(
                        filterKey === "month"
                          ? "last30Days"
                          : filterKey === "7days"
                            ? "last7Days"
                            : filterKey === "year"
                              ? "lastYear"
                              : filterKey === "today"
                                ? "today"
                                : "customRange",
                      )}
                    </button>
                  ),
                )}
              </div>
              {dateFilter === "custom" && (
                <div className="flex items-center space-x-2 mt-4 sm:mt-0">
                  <input
                    type="date"
                    value={customDateRange.start}
                    onChange={(e) =>
                      setCustomDateRange({
                        ...customDateRange,
                        start: e.target.value,
                      })
                    }
                    className="px-3 py-1 border border-input bg-background rounded-lg text-foreground focus:ring-2 focus:ring-ring"
                  />
                  <span className="text-muted-foreground">to</span>
                  <input
                    type="date"
                    value={customDateRange.end}
                    onChange={(e) =>
                      setCustomDateRange({
                        ...customDateRange,
                        end: e.target.value,
                      })
                    }
                    className="px-3 py-1 border border-input bg-background rounded-lg text-foreground focus:ring-2 focus:ring-ring"
                  />
                </div>
              )}
            </div>
          </div>
          <table className="w-full mt-4">
            <tbody>
              {dateFilteredMetrics.map((metric) => (
                <tr
                  key={metric.title}
                  className="border-b last:border-b-0 border-border"
                >
                  <td className="py-3 text-base font-medium text-muted-foreground">
                    {metric.title}
                  </td>
                  <td className="py-3 text-2xl font-bold text-foreground text-right">
                    {metric.value}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="bg-card rounded-2xl p-6 shadow-sm border border-border">
          <h3 className="text-lg font-semibold text-foreground mb-6">
            {t("monthlyProfitTrend")}
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={monthlyTrend}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="hsl(var(--muted-foreground) / 0.2)"
              />
              <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" />
              <YAxis stroke="hsl(var(--muted-foreground))" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  borderColor: "hsl(var(--border))",
                  color: "hsl(var(--card-foreground))",
                }}
                formatter={(value: number) => [
                  `${value.toLocaleString()} ${t("mad")}`,
                  t("totalProfit"),
                ]}
              />
              <Line
                type="monotone"
                dataKey="profit"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={{ fill: "hsl(var(--primary))" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden">
        <div className="p-6 border-b border-border">
          <h3 className="text-lg font-semibold text-foreground">
            {t("detailedProgramPerformance")}
          </h3>
        </div>
        <table className="w-full">
          <thead className="bg-muted/50">
            <tr>
              {[
                "serviceType",
                "totalSalesCount",
                "originalPrice",
                "totalPrice",
                "commission",
                "profit",
                "profitMargin",
              ].map((h) => (
                <th
                  key={h}
                  className="px-6 py-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider"
                >
                  {t(h)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-card divide-y divide-border">
            {byType.map((item) => {
              const itemTotalRevenue = Number(item.totalSalePrice);
              const itemTotalProfit = Number(item.totalProfit);
              const itemProfitMargin =
                itemTotalRevenue > 0
                  ? (itemTotalProfit / itemTotalRevenue) * 100
                  : 0;

              return (
                <tr
                  key={item.type}
                  className="hover:bg-muted/50 transition-colors"
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">
                    {t(item.type)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                    {Number(item.count).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                    {Number(item.totalOriginalPrice).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-foreground">
                    {Number(item.totalSalePrice).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                    {Number(item.totalCommission).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-success">
                    {itemTotalProfit.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-info">
                    {itemProfitMargin.toFixed(1)}%
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
