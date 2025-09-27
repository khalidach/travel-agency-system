// frontend/src/pages/AgencyReport.tsx
import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ChevronLeft,
  Package,
  Calendar,
  ConciergeBell,
  FileText,
  User,
} from "lucide-react";
import { subDays, startOfDay, endOfDay, format, subMonths } from "date-fns";
import * as api from "../services/api";
import DashboardSkeleton from "../components/skeletons/DashboardSkeleton";
import { useTheme } from "../context/ThemeContext";

interface AgencyReportData {
  agencyName: string;
  totalPrograms: number;
  totalBookings: number;
  totalDailyServices: number;
  totalFactures: number;
  programNames: string[];
}

type DateFilter = "all" | "today" | "7days" | "month" | "year" | "custom";

const StatCard = ({
  icon: Icon,
  title,
  value,
  color,
}: {
  icon: React.ElementType;
  title: string;
  value: string | number;
  color: string;
}) => (
  <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
          {title}
        </p>
        <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-2">
          {value.toLocaleString()}
        </p>
      </div>
      <div
        className={`w-12 h-12 ${color} rounded-xl flex items-center justify-center`}
      >
        <Icon className="w-6 h-6 text-white" />
      </div>
    </div>
  </div>
);

export default function AgencyReportPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id: adminId } = useParams<{ id: string }>(); // Agency Admin ID
  const { theme } = useTheme();

  const [dateFilter, setDateFilter] = useState<DateFilter>("month");
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
      case "7days":
        startDate = startOfDay(subDays(now, 7));
        break;
      case "month":
        startDate = startOfDay(subDays(now, 30));
        break;
      case "year":
        startDate = startOfDay(subMonths(now, 12));
        break;
      case "custom":
        if (customDateRange.start && customDateRange.end) {
          return {
            startDate: customDateRange.start,
            endDate: customDateRange.end,
          };
        }
        return { startDate: undefined, endDate: undefined };
      case "all":
      default:
        return { startDate: undefined, endDate: undefined };
    }

    return {
      startDate: format(startDate, "yyyy-MM-dd"),
      endDate: format(endDate, "yyyy-MM-dd"),
    };
  }, [dateFilter, customDateRange]);

  const { data: reportData, isLoading } = useQuery<AgencyReportData>({
    queryKey: ["agencyReport", adminId, dateRangeParams],
    queryFn: () =>
      api.getAgencyReport(
        Number(adminId!),
        dateRangeParams.startDate,
        dateRangeParams.endDate
      ),
    enabled: !!adminId,
  });

  if (isLoading || !reportData) {
    return <DashboardSkeleton />;
  }

  const {
    agencyName,
    totalPrograms,
    totalBookings,
    totalDailyServices,
    totalFactures,
    programNames,
  } = reportData;

  const statCards = [
    {
      title: t("totalPrograms"),
      value: totalPrograms,
      icon: Package,
      color: "bg-indigo-500",
    },
    {
      title: t("totalBookings"),
      value: totalBookings,
      icon: Calendar,
      color: "bg-blue-500",
    },
    {
      title: t("totalServicesPerformed"),
      value: totalDailyServices,
      icon: ConciergeBell,
      color: "bg-emerald-500",
    },
    {
      title: t("facturationTitle"),
      value: totalFactures,
      icon: FileText,
      color: "bg-orange-500",
    },
  ];

  return (
    <div className="space-y-8" dir="rtl">
      <div className="flex items-center">
        <button
          onClick={() => navigate("/owner")}
          className={`p-2 bg-gray-100 dark:bg-gray-700 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 ${
            document.documentElement.dir === "rtl" ? "ml-4" : "mr-4"
          }`}
        >
          <ChevronLeft className="w-6 h-6 text-gray-700 dark:text-gray-300" />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            {t("Agency Report")}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            {agencyName} - (Admin ID: {adminId})
          </p>
        </div>
      </div>

      {/* Date Filter Controls */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          {t("filterPerformance")}
        </h3>
        <div className="flex flex-col sm:flex-row gap-4 items-center mb-4">
          <div className="flex items-center space-x-1 space-x-reverse bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
            <button
              onClick={() => setDateFilter("all")}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                dateFilter === "all"
                  ? "bg-white text-blue-600 shadow-sm dark:bg-gray-900 dark:text-white"
                  : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              {t("allTime")}
            </button>
            <button
              onClick={() => setDateFilter("today")}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                dateFilter === "today"
                  ? "bg-white text-blue-600 shadow-sm dark:bg-gray-900 dark:text-white"
                  : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              {t("today")}
            </button>
            <button
              onClick={() => setDateFilter("7days")}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                dateFilter === "7days"
                  ? "bg-white text-blue-600 shadow-sm dark:bg-gray-900 dark:text-white"
                  : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              {t("last7Days")}
            </button>
            <button
              onClick={() => setDateFilter("month")}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                dateFilter === "month"
                  ? "bg-white text-blue-600 shadow-sm dark:bg-gray-900 dark:text-white"
                  : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              {t("last30Days")}
            </button>
            <button
              onClick={() => setDateFilter("year")}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                dateFilter === "year"
                  ? "bg-white text-blue-600 shadow-sm dark:bg-gray-900 dark:text-white"
                  : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              {t("lastYear")}
            </button>
            <button
              onClick={() => setDateFilter("custom")}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                dateFilter === "custom"
                  ? "bg-white text-blue-600 shadow-sm dark:bg-gray-900 dark:text-white"
                  : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              {t("customRange")}
            </button>
          </div>
        </div>
        {dateFilter === "custom" && (
          <div className="flex items-center space-x-2 space-x-reverse mt-4">
            <input
              type="date"
              value={customDateRange.start}
              onChange={(e) =>
                setCustomDateRange({
                  ...customDateRange,
                  start: e.target.value,
                })
              }
              className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200"
            />
            <span className="dark:text-gray-400">إلى</span>
            <input
              type="date"
              value={customDateRange.end}
              onChange={(e) =>
                setCustomDateRange({ ...customDateRange, end: e.target.value })
              }
              className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200"
            />
          </div>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card, index) => (
          <StatCard key={index} {...card} />
        ))}
      </div>

      {/* Detailed Programs List */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {t("Program Names")} ({totalPrograms} {t("programs")})
          </h3>
        </div>
        <div className="p-6">
          {programNames.length > 0 ? (
            <div className="flex flex-wrap gap-3">
              {programNames.map((name, index) => (
                <span
                  key={index}
                  className="px-3 py-1 text-sm font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full"
                >
                  {name}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 dark:text-gray-400">
              {t("No programs found in this period.")}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
