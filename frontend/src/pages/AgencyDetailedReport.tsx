// frontend/src/pages/AgencyDetailedReport.tsx
import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ChevronLeft,
  Package,
  Calendar,
  ConciergeBell,
  FileText,
  MapPin,
  RefreshCcw,
} from "lucide-react";
import * as api from "../services/api";
import DashboardSkeleton from "../components/skeletons/DashboardSkeleton";
import {
  subDays,
  startOfDay,
  endOfDay,
  format,
  subMonths,
  subYears,
} from "date-fns";

// Define the detailed report structure based on the backend controller
interface DetailedReport {
  agencyName: string;
  programsCount: number;
  programsList: string[];
  bookingsCount: number;
  dailyServicesCount: number;
  facturesCount: number;
  dateRange: {
    startDate?: string;
    endDate?: string;
  };
}

type DateFilter = "all" | "today" | "7days" | "month" | "year" | "custom";

// 1. Defined Interface to fix "Unexpected any"
interface FilterButtonProps {
  label: string;
  value: DateFilter;
  currentFilter: DateFilter;
  onClick: (value: DateFilter) => void;
}

const FilterButton = ({
  label,
  value,
  currentFilter,
  onClick,
}: FilterButtonProps) => (
  <button
    onClick={() => onClick(value)}
    className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
      currentFilter === value
        ? "bg-white text-blue-600 shadow-sm dark:bg-gray-900 dark:text-white"
        : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700/50"
    }`}
  >
    {label}
  </button>
);

const DateRangeDisplay = ({
  startDate,
  endDate,
}: {
  startDate?: string;
  endDate?: string;
}) => {
  if (!startDate && !endDate) return null;

  const formatDisplayDate = (dateStr?: string) => {
    if (!dateStr) return "";
    try {
      return new Date(dateStr).toLocaleDateString();
    } catch {
      return dateStr;
    }
  };

  if (startDate === endDate && startDate) {
    return (
      <span className="text-sm font-medium text-indigo-600 dark:text-indigo-400">
        {" "}
        ({formatDisplayDate(startDate)})
      </span>
    );
  }

  if (startDate && endDate) {
    return (
      <span className="text-sm font-medium text-indigo-600 dark:text-indigo-400">
        (من {formatDisplayDate(startDate)} إلى {formatDisplayDate(endDate)})
      </span>
    );
  }
  return null;
};

export default function AgencyDetailedReport() {
  const { adminId } = useParams<{ adminId: string }>();
  const navigate = useNavigate();
  // 2. Removed unused `t` and `useTranslation` hook to fix ESLint error

  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [customDateRange, setCustomDateRange] = useState({
    start: "",
    end: "",
  });

  // Calculate date parameters based on the current filter
  const dateParams = useMemo(() => {
    const now = new Date();
    let startDate: Date | undefined;
    const endDate: Date = endOfDay(now);

    switch (dateFilter) {
      case "today":
        startDate = startOfDay(now);
        break;
      case "7days":
        startDate = startOfDay(subDays(now, 7));
        break;
      case "month":
        startDate = startOfDay(subMonths(now, 1));
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
      case "all":
      default:
        return { startDate: undefined, endDate: undefined };
    }
    return {
      startDate: format(startDate, "yyyy-MM-dd"),
      endDate: format(endDate, "yyyy-MM-dd"),
    };
  }, [dateFilter, customDateRange]);

  const {
    data: report,
    isLoading,
    refetch,
  } = useQuery<DetailedReport>({
    queryKey: [
      "agencyDetailedReport",
      adminId,
      dateParams.startDate,
      dateParams.endDate,
    ],
    queryFn: () =>
      api.getAgencyDetailedReport(
        adminId!,
        dateParams.startDate,
        dateParams.endDate,
      ),
    enabled: !!adminId,
  });

  const statCards = useMemo(() => {
    // If report is not loaded yet, return empty or safe defaults to prevent errors in render if called
    if (!report) return [];

    return [
      {
        title: "إجمالي البرامج",
        value: report.programsCount || 0,
        icon: Package,
        color: "bg-blue-500",
      },
      {
        title: "إجمالي الحجوزات",
        value: report.bookingsCount || 0,
        icon: Calendar,
        color: "bg-emerald-500",
      },
      {
        title: "إجمالي الخدمات اليومية",
        value: report.dailyServicesCount || 0,
        icon: ConciergeBell,
        color: "bg-orange-500",
      },
      {
        title: "إجمالي الفواتير",
        value: report.facturesCount || 0,
        icon: FileText,
        color: "bg-purple-500",
      },
    ];
  }, [report]);

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (!report) {
    return (
      <div className="text-center py-10">
        <h2 className="text-xl font-semibold text-red-600">
          تعذر تحميل تقرير الوكالة.
        </h2>
        <button
          onClick={() => navigate("/owner")}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg"
        >
          العودة لإدارة الوكالات
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/owner/reports")}
            className="p-2 bg-gray-100 dark:bg-gray-700 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600"
          >
            <ChevronLeft className="w-6 h-6 text-gray-700 dark:text-gray-300" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              تقرير الوكالة: {report.agencyName}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              عرض شامل لأداء الوكالة ({report.agencyName})
              <DateRangeDisplay
                startDate={dateParams.startDate}
                endDate={dateParams.endDate}
              />
            </p>
          </div>
        </div>
        <button
          onClick={() => refetch()}
          className="p-2 bg-gray-100 dark:bg-gray-700 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600"
          aria-label="Refetch Data"
        >
          <RefreshCcw className="w-5 h-5 text-gray-700 dark:text-gray-300" />
        </button>
      </div>

      {/* Date Filtering Panel */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          تصفية التقرير حسب التاريخ
        </h3>
        <div className="flex flex-wrap items-center gap-2">
          <FilterButton
            label="الكل"
            value="all"
            currentFilter={dateFilter}
            onClick={setDateFilter}
          />
          <FilterButton
            label="اليوم"
            value="today"
            currentFilter={dateFilter}
            onClick={setDateFilter}
          />
          <FilterButton
            label="آخر 7 أيام"
            value="7days"
            currentFilter={dateFilter}
            onClick={setDateFilter}
          />
          <FilterButton
            label="آخر 30 يوم"
            value="month"
            currentFilter={dateFilter}
            onClick={setDateFilter}
          />
          <FilterButton
            label="آخر سنة"
            value="year"
            currentFilter={dateFilter}
            onClick={setDateFilter}
          />
          <FilterButton
            label="تاريخ محدد"
            value="custom"
            currentFilter={dateFilter}
            onClick={setDateFilter}
          />
        </div>
        {dateFilter === "custom" && (
          <div className="flex items-center space-x-2 space-x-reverse">
            <label className="text-sm text-gray-600 dark:text-gray-400">
              من:
            </label>
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
            <label className="text-sm text-gray-600 dark:text-gray-400">
              إلى:
            </label>
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

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div
              key={index}
              className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    {stat.title}
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-2">
                    {stat.value.toLocaleString()}
                  </p>
                </div>
                <div
                  className={`w-12 h-12 ${stat.color} rounded-xl flex items-center justify-center`}
                >
                  <Icon className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Programs List Card */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
          <Package className="w-5 h-5 ml-2 text-blue-500" />
          أسماء البرامج المنجزة ({report.programsCount.toLocaleString()})
        </h3>
        <div className="max-h-60 overflow-y-auto space-y-2">
          {report.programsCount > 0 ? (
            report.programsList.map((programName, index) => (
              <div
                key={index}
                className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg flex items-center justify-between"
              >
                <span className="text-gray-700 dark:text-gray-300 text-sm font-medium">
                  {programName}
                </span>
                <MapPin className="w-4 h-4 text-gray-400 dark:text-gray-500" />
              </div>
            ))
          ) : (
            <p className="text-gray-500 dark:text-gray-400 text-center py-4">
              لم يتم إنجاز برامج في الفترة المحددة.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
