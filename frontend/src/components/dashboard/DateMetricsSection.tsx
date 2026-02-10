// frontend/src/components/dashboard/DateMetricsSection.tsx
import { useTranslation } from "react-i18next";
import { Users, DollarSign, FileText, ConciergeBell } from "lucide-react";
import { useAuthContext } from "../../context/AuthContext";
import type { DashboardStats } from "../../context/models";

interface DateMetricsSectionProps {
  dateFilter: string;
  setDateFilter: (filter: string) => void;
  customDateRange: { start: string; end: string };
  setCustomDateRange: (range: { start: string; end: string }) => void;
  dateFilteredStats: DashboardStats["dateFilteredStats"];
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

  const employeeMetrics = [...adminManagerMetrics];

  const metrics = userRole === "admin" ? adminManagerMetrics : employeeMetrics;

  return (
    <div className="bg-card text-card-foreground rounded-2xl p-6 shadow-sm border border-border">
      <div className="pb-4 border-b border-border">
        <div className="flex items-center flex-wrap gap-2">
          <div className="flex items-center space-x-1 bg-muted rounded-lg p-1">
            {filters.map((f) => (
              <button
                key={f.key}
                onClick={() => setDateFilter(f.key)}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  dateFilter === f.key
                    ? "bg-background text-primary shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-background/50"
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
              // Added dark:[color-scheme:dark] to fix the icon color
              className="px-3 py-1 border border-input rounded-lg bg-background text-foreground focus:ring-1 focus:ring-ring dark:[color-scheme:dark]"
            />
            <span className="text-muted-foreground">to</span>
            <input
              type="date"
              value={customDateRange.end}
              onChange={(e) =>
                setCustomDateRange({ ...customDateRange, end: e.target.value })
              }
              // Added dark:[color-scheme:dark] to fix the icon color
              className="px-3 py-1 border border-input rounded-lg bg-background text-foreground focus:ring-1 focus:ring-ring dark:[color-scheme:dark]"
            />
          </div>
        )}
      </div>
      <table className="w-full mt-4">
        <tbody>
          {metrics.map((metric) => {
            const Icon = metric.icon;
            return (
              <tr
                key={metric.title}
                className="border-b last:border-b-0 border-border"
              >
                <td className="py-3 text-base font-medium text-muted-foreground flex items-center gap-2">
                  <Icon className="w-4 h-4" />
                  {metric.title}
                </td>
                <td className="py-3 text-2xl font-bold text-foreground text-right">
                  {metric.value}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
