// frontend/src/pages/DailyServiceReport.tsx
import React, { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { subDays, startOfDay, endOfDay, format, subYears } from "date-fns";
import * as api from "../services/api";
import { DailyService } from "../context/models";
import DashboardSkeleton from "../components/skeletons/DashboardSkeleton";
import { DollarSign, TrendingUp, Hash, Percent } from "lucide-react";

interface ReportData {
  summary: {
    totalSalesCount: string;
    totalRevenue: string;
    totalCost: string;
    totalProfit: string;
  };
  byType: {
    type: string;
    count: string;
    totalOriginalPrice: string;
    totalSalePrice: string;
    totalCommission: string;
    totalProfit: string;
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
    const now = new Date();
    let startDate: Date;
    let endDate: Date = endOfDay(now);

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
    data: reportData,
    isLoading,
    isError,
  } = useQuery<ReportData>({
    queryKey: ["dailyServiceReport", dateRangeParams],
    queryFn: () =>
      api.getDailyServiceReport(
        dateRangeParams.startDate,
        dateRangeParams.endDate
      ),
  });

  if (isLoading) return <DashboardSkeleton />;
  if (isError || !reportData) return <div>{t("errorLoadingDashboard")}</div>;

  const summary = reportData.summary;
  const byType = reportData.byType;

  const totalRevenue = Number(summary.totalRevenue || 0);
  const totalProfit = Number(summary.totalProfit || 0);
  const profitMargin =
    totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

  const statCards = [
    {
      title: t("totalSalesCount"),
      value: Number(summary.totalSalesCount || 0).toLocaleString(),
      icon: Hash,
    },
    {
      title: t("totalRevenue"),
      value: `${totalRevenue.toLocaleString()} ${t("mad")}`,
      icon: DollarSign,
    },
    {
      title: t("totalProfit"),
      value: `${totalProfit.toLocaleString()} ${t("mad")}`,
      icon: TrendingUp,
    },
    {
      title: t("profitMargin"),
      value: `${profitMargin.toFixed(1)}%`,
      icon: Percent,
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          {t("dailyServiceReportTitle")}
        </h1>
        <p className="text-gray-600 mt-2">{t("dailyServiceReportSubtitle")}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <div
              key={index}
              className="bg-white rounded-2xl p-6 shadow-sm border"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    {card.title}
                  </p>
                  <p className="text-2xl font-bold text-gray-900 mt-2">
                    {card.value}
                  </p>
                </div>
                <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center">
                  <Icon className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm border">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setDateFilter("today")}
              className={`px-3 py-1.5 text-sm rounded-md ${
                dateFilter === "today"
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-gray-600"
              }`}
            >
              {t("today")}
            </button>
            <button
              onClick={() => setDateFilter("7days")}
              className={`px-3 py-1.5 text-sm rounded-md ${
                dateFilter === "7days"
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-gray-600"
              }`}
            >
              {t("last7Days")}
            </button>
            <button
              onClick={() => setDateFilter("month")}
              className={`px-3 py-1.5 text-sm rounded-md ${
                dateFilter === "month"
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-gray-600"
              }`}
            >
              {t("last30Days")}
            </button>
            <button
              onClick={() => setDateFilter("year")}
              className={`px-3 py-1.5 text-sm rounded-md ${
                dateFilter === "year"
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-gray-600"
              }`}
            >
              {t("lastYear")}
            </button>
            <button
              onClick={() => setDateFilter("custom")}
              className={`px-3 py-1.5 text-sm rounded-md ${
                dateFilter === "custom"
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-gray-600"
              }`}
            >
              {t("customRange")}
            </button>
          </div>
          {dateFilter === "custom" && (
            <div className="flex items-center space-x-2">
              <input
                type="date"
                value={customDateRange.start}
                onChange={(e) =>
                  setCustomDateRange({
                    ...customDateRange,
                    start: e.target.value,
                  })
                }
                className="px-3 py-1 border rounded-lg"
              />
              <span>to</span>
              <input
                type="date"
                value={customDateRange.end}
                onChange={(e) =>
                  setCustomDateRange({
                    ...customDateRange,
                    end: e.target.value,
                  })
                }
                className="px-3 py-1 border rounded-lg"
              />
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
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
                  className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  {t(h)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {byType.map((item) => {
              const itemTotalRevenue = Number(item.totalSalePrice);
              const itemTotalProfit = Number(item.totalProfit);
              const itemProfitMargin =
                itemTotalRevenue > 0
                  ? (itemTotalProfit / itemTotalRevenue) * 100
                  : 0;

              return (
                <tr key={item.type}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {t(item.type)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {Number(item.count).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {Number(item.totalOriginalPrice).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold">
                    {Number(item.totalSalePrice).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {Number(item.totalCommission).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-emerald-600">
                    {itemTotalProfit.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-blue-600">
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
