// frontend/src/components/dashboard/ServiceProfitChart.tsx
import { useTranslation } from "react-i18next";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { useTheme } from "../../context/ThemeContext";

interface ServiceProfitChartProps {
  data: { type: string; totalProfit: number }[];
}

// Define palettes for both modes
const THEME_COLORS = {
  light: ["#3b82f6", "#059669", "#ea580c", "#8b5cf6"], // Original (Blue-500, Emerald-600, Orange-600, Violet-500)
  dark: ["#60a5fa", "#34d399", "#fb923c", "#a78bfa"], // Brighter (Blue-400, Emerald-400, Orange-400, Violet-400)
};

export default function ServiceProfitChart({ data }: ServiceProfitChartProps) {
  const { t } = useTranslation();
  const { theme } = useTheme();

  // Select the appropriate array based on the current theme
  const currentColors =
    theme === "dark" ? THEME_COLORS.dark : THEME_COLORS.light;

  const chartData = (data || []).map((item) => ({
    name: t(item.type),
    value: item.totalProfit,
  }));

  return (
    <div className="bg-card text-card-foreground rounded-2xl p-6 shadow-sm border border-border">
      <h3 className="text-lg font-semibold mb-6">{t("profitByServiceType")}</h3>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={120}
            paddingAngle={5}
            dataKey="value"
            nameKey="name"
          >
            {chartData.map((_entry, index) => (
              <Cell
                key={`cell-${index}`}
                // Use the dynamic currentColors array
                fill={currentColors[index % currentColors.length]}
                stroke="hsl(var(--card))"
                strokeWidth={2}
              />
            ))}
          </Pie>
          <Tooltip
            formatter={(value: number) =>
              `${value.toLocaleString()} ${t("mad")}`
            }
            contentStyle={{
              backgroundColor: theme === "dark" ? "#020817" : "#ffffff",
              borderColor: theme === "dark" ? "#1e293b" : "#e5e7eb",
              borderRadius: "0.5rem",
              color: theme === "dark" ? "#f8fafc" : "#0f172a",
            }}
            itemStyle={{
              color: theme === "dark" ? "#f8fafc" : "#0f172a",
            }}
          />
        </PieChart>
      </ResponsiveContainer>

      {/* Legend Section */}
      <div className="flex justify-center flex-wrap gap-x-6 gap-y-2 mt-4">
        {chartData.map((item, index) => (
          <div key={index} className="flex items-center">
            <div
              className={`w-3 h-3 rounded-full mr-2`}
              style={{
                // Use the same dynamic color for the legend
                backgroundColor: currentColors[index % currentColors.length],
              }}
            ></div>
            <span className="text-sm text-muted-foreground">{item.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
