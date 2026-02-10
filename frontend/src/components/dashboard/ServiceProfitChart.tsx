import { useTranslation } from "react-i18next";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { useTheme } from "../../context/ThemeContext";

interface ServiceProfitChartProps {
  data: { type: string; totalProfit: number }[];
}

const COLORS = ["#3b82f6", "#059669", "#ea580c", "#8b5cf6"];

export default function ServiceProfitChart({ data }: ServiceProfitChartProps) {
  const { t } = useTranslation();
  const { theme } = useTheme();

  const chartData = (data || []).map((item) => ({
    name: t(item.type),
    value: item.totalProfit,
  }));

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-6">
        {t("profitByServiceType")}
      </h3>
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
                fill={COLORS[index % COLORS.length]}
              />
            ))}
          </Pie>
          <Tooltip
            formatter={(value: number) =>
              `${value.toLocaleString()} ${t("mad")}`
            }
            contentStyle={{
              backgroundColor: theme === "dark" ? "#1f2937" : "#ffffff",
              borderColor: theme === "dark" ? "#4b5563" : "#e5e7eb",
            }}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="flex justify-center flex-wrap gap-x-6 gap-y-2 mt-4">
        {chartData.map((item, index) => (
          <div key={index} className="flex items-center">
            <div
              className={`w-3 h-3 rounded-full ${
                document.documentElement.dir === "rtl" ? "ml-2" : "mr-2"
              }`}
              style={{ backgroundColor: COLORS[index % COLORS.length] }}
            ></div>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {item.name}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
