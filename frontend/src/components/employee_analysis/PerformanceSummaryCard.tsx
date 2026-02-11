// frontend/src/components/employee_analysis/PerformanceSummaryCard.tsx
import React from "react";
import { useTranslation } from "react-i18next";
import { DateFilter, CustomDateRange } from "../../hooks/useDateRangeParams";

interface SummaryMetric {
  title: string;
  value: number;
  unit: string;
}

interface PerformanceSummaryCardProps {
  title: string;
  dateFilter: DateFilter;
  setDateFilter: (filter: DateFilter) => void;
  customDateRange: CustomDateRange;
  setCustomDateRange: (range: CustomDateRange) => void;
  summaryData: SummaryMetric[];
  isLoading: boolean;
}

const PerformanceSummaryCard: React.FC<PerformanceSummaryCardProps> = ({
  title,
  dateFilter,
  setDateFilter,
  customDateRange,
  setCustomDateRange,
  summaryData,
  isLoading,
}) => {
  const { t } = useTranslation();

  const filterButtons: { label: string; value: DateFilter }[] = [
    { label: "today", value: "today" },
    { label: "last7Days", value: "7days" },
    { label: "last30Days", value: "month" },
    { label: "customRange", value: "custom" },
  ];

  return (
    <div className="bg-card rounded-2xl p-6 shadow-sm border border-border h-full">
      <h3 className="text-lg font-semibold text-foreground mb-4">{t(title)}</h3>

      {/* Date Filter Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-center mb-4">
        <div className="flex items-center space-x-1 bg-muted rounded-lg p-1 rtl:space-x-reverse">
          {filterButtons.map((btn) => (
            <button
              key={btn.value}
              onClick={() => setDateFilter(btn.value)}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                dateFilter === btn.value
                  ? "bg-card text-primary shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t(btn.label)}
            </button>
          ))}
        </div>
      </div>

      {/* Custom Date Inputs */}
      {dateFilter === "custom" && (
        <div className="flex items-center space-x-2 mb-4 rtl:space-x-reverse">
          <input
            type="date"
            value={customDateRange.start}
            onChange={(e) =>
              setCustomDateRange({ ...customDateRange, start: e.target.value })
            }
            className="px-3 py-1 border border-input rounded-lg text-sm bg-background text-foreground"
          />
          <span className="text-muted-foreground text-sm">{t("to")}</span>
          <input
            type="date"
            value={customDateRange.end}
            onChange={(e) =>
              setCustomDateRange({ ...customDateRange, end: e.target.value })
            }
            className="px-3 py-1 border border-input rounded-lg text-sm bg-background text-foreground"
          />
        </div>
      )}

      {/* Metrics List */}
      {isLoading ? (
        <div className="space-y-3 mt-4">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="h-8 bg-muted rounded animate-pulse w-full"
            />
          ))}
        </div>
      ) : (
        <table className="w-full mt-4">
          <tbody>
            {summaryData.map((metric) => (
              <tr
                key={metric.title}
                className="border-b last:border-b-0 border-border"
              >
                <td className="py-3 text-base font-medium text-muted-foreground">
                  {metric.title}
                </td>
                <td className="py-3 text-2xl font-bold text-foreground text-right">
                  {metric.value.toLocaleString()}
                  {metric.unit && (
                    <span className="text-sm font-normal text-muted-foreground ml-1 mr-1">
                      {metric.unit}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default PerformanceSummaryCard;
