import React from "react";
import { useTranslation } from "react-i18next";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { useTheme } from "../../context/ThemeContext";
import { DetailedPerformanceDay, BookingSourceBreakdown } from "../../context/models";

interface PerformanceChartsProps {
  performanceData: DetailedPerformanceDay[];
  sourceData: BookingSourceBreakdown[];
  isLoading: boolean;
}

const THEME_COLORS = {
  light: {
    revenue: "#3b82f6", // Blue-500
    profit: "#10b981",  // Emerald-500
    sources: ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#6b7280"],
  },
  dark: {
    revenue: "#60a5fa", // Blue-400
    profit: "#34d399",  // Emerald-400
    sources: ["#60a5fa", "#34d399", "#fb923c", "#a78bfa", "#f472b6", "#9ca3af"],
  },
};

const PerformanceCharts: React.FC<PerformanceChartsProps> = ({
  performanceData,
  sourceData,
  isLoading,
}) => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const isRtl = document.documentElement.dir === "rtl";

  const colors = theme === "dark" ? THEME_COLORS.dark : THEME_COLORS.light;

  // Format performance data for chart
  const trendData = (performanceData || []).map((day) => {
    const totalRevenue = day.bookingsRevenue + day.servicesRevenue;
    
    // Format date beautifully (e.g. "May 28")
    let formattedDate = day.date;
    try {
      const dateObj = new Date(day.date);
      formattedDate = dateObj.toLocaleDateString(
        document.documentElement.lang || "fr",
        { month: "short", day: "numeric" }
      );
    } catch (e) {
      // Fallback
    }

    return {
      date: formattedDate,
      rawDate: day.date,
      [t("revenue")]: totalRevenue,
    };
  });

  // Format booking source breakdown data
  const pieData = (sourceData || []).map((item) => ({
    name: t(item.source.toLowerCase()) || item.source,
    value: item.count,
    revenue: item.revenue,
  }));

  const totalSourceCount = pieData.reduce((acc, curr) => acc + curr.value, 0);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-card rounded-2xl p-6 shadow-sm border border-border h-96 animate-pulse" />
        <div className="bg-card rounded-2xl p-6 shadow-sm border border-border h-96 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Revenue Area Chart */}
      <div className="lg:col-span-2 bg-card text-card-foreground rounded-2xl p-6 shadow-sm border border-border transition-all hover:shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
          <div>
            <h3 className="text-lg font-semibold">{t("revenueTrend")}</h3>
            <p className="text-sm text-muted-foreground">{t("trendsSubText")}</p>
          </div>
        </div>

        <div className="w-full h-80">
          {trendData.length === 0 ? (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
              {t("noDataAvailable")}
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={trendData}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={colors.revenue} stopOpacity={0.2} />
                    <stop offset="95%" stopColor={colors.revenue} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                  orientation={isRtl ? "right" : "left"}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    borderColor: "hsl(var(--border))",
                    borderRadius: "12px",
                    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
                    color: "hsl(var(--foreground))",
                  }}
                  itemStyle={{ fontSize: "13px" }}
                  labelStyle={{ fontWeight: "bold", marginBottom: "4px" }}
                />
                <Legend verticalAlign="top" height={36} iconType="circle" iconSize={8} />
                <Area
                  type="monotone"
                  dataKey={t("revenue")}
                  stroke={colors.revenue}
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorRevenue)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Booking Source Donut Chart */}
      <div className="bg-card text-card-foreground rounded-2xl p-6 shadow-sm border border-border transition-all hover:shadow-md flex flex-col justify-between">
        <div>
          <h3 className="text-lg font-semibold mb-1">{t("bookingSources")}</h3>
          <p className="text-sm text-muted-foreground mb-6">{t("sourcesSubText")}</p>
        </div>

        <div className="w-full h-56 relative flex items-center justify-center">
          {pieData.length === 0 ? (
            <div className="text-muted-foreground">{t("noDataAvailable")}</div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieData.map((_entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={colors.sources[index % colors.sources.length]}
                        stroke="hsl(var(--card))"
                        strokeWidth={2}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number, name: string, props: any) => [
                      `${value} (${((value / totalSourceCount) * 100).toFixed(0)}%)`,
                      name,
                    ]}
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      borderColor: "hsl(var(--border))",
                      borderRadius: "12px",
                      boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              {/* Inner Label for Donut Chart */}
              <div className="absolute flex flex-col items-center justify-center">
                <span className="text-2xl font-extrabold text-foreground">{totalSourceCount}</span>
                <span className="text-xs text-muted-foreground uppercase tracking-wide">
                  {t("bookings")}
                </span>
              </div>
            </>
          )}
        </div>

        {/* Legend */}
        {pieData.length > 0 && (
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-4 text-xs">
            {pieData.map((item, index) => (
              <div key={index} className="flex items-center">
                <div
                  className="w-2.5 h-2.5 rounded-full mr-1.5 ml-1.5 flex-shrink-0"
                  style={{
                    backgroundColor: colors.sources[index % colors.sources.length],
                  }}
                />
                <span className="text-muted-foreground truncate w-full" title={item.name}>
                  {item.name}: <strong className="text-foreground">{item.value}</strong>
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PerformanceCharts;
