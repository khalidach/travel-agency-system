import { useTranslation } from "react-i18next";
import { Users, DollarSign, FileText, ConciergeBell } from "lucide-react";
import { useAuthContext } from "../../context/AuthContext";

interface DateMetricsSectionProps {
  dateFilter: string;
  setDateFilter: (filter: string) => void;
  customDateRange: { start: string; end: string };
  setCustomDateRange: (range: { start: string; end: string }) => void;
  dateFilteredStats: any;
}

export default function DateMetricsSection({
  dateFilter,
  setDateFilter,
  customDateRange,
  setCustomDateRange,
  dateFilteredStats,
}: DateMetricsSectionProps) {
  const { t } = useTranslation();
  const { state } = useAuthContext();
  const userRole = state.user?.role;

  const filters = [
    { key: "today", label: t("today") },
    { key: "7days", label: t("last7Days") },
    { key: "month", label: t("last30Days") },
    { key: "year", label: t("lastYear") },
    { key: "custom", label: t("customRange") },
  ];

  const adminManagerMetrics = [
    {
      title: t("totalBookings"),
      value: dateFilteredStats.totalBookings,
      icon: Users,
    },
    {
      title: t("totalServicesPerformed"),
      value: dateFilteredStats.totalDailyServices,
      icon: ConciergeBell,
    },
    {
      title: t("facturationTitle"),
      value: dateFilteredStats.totalFactures,
      icon: FileText,
    },
    {
      title: t("totalRevenue"),
      value: `${(dateFilteredStats.totalRevenue || 0).toLocaleString()} ${t("mad")}`,
      icon: DollarSign,
    },
  ];

  const employeeMetrics = [...adminManagerMetrics]; // Currently identical structure in original code

  const metrics = userRole === "admin" ? adminManagerMetrics : employeeMetrics;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
      <div className="pb-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center flex-wrap gap-2">
          <div className="flex items-center space-x-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
            {filters.map((f) => (
              <button
                key={f.key}
                onClick={() => setDateFilter(f.key)}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  dateFilter === f.key
                    ? "bg-white text-blue-600 shadow-sm dark:bg-gray-900 dark:text-white"
                    : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
        {dateFilter === "custom" && (
          <div className="flex items-center space-x-2 mt-4">
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
            <span className="dark:text-gray-400">to</span>
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
      <table className="w-full mt-4">
        <tbody>
          {metrics.map((metric) => (
            <tr
              key={metric.title}
              className="border-b last:border-b-0 border-gray-100 dark:border-gray-700"
            >
              <td className="py-3 text-base font-medium text-gray-600 dark:text-gray-400">
                {metric.title}
              </td>
              <td className="py-3 text-2xl font-bold text-gray-900 dark:text-gray-100 text-right">
                {metric.value}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
