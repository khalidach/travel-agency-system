import { useTranslation } from "react-i18next";
import { Users, DollarSign, TrendingUp, Package } from "lucide-react";
import { useAuthContext } from "../../context/AuthContext";

interface StatsGridProps {
  allTimeStats: {
    totalBookings: number;
    totalRevenue: number;
    totalProfit: number;
    activePrograms: number;
  };
}

export default function StatsGrid({ allTimeStats }: StatsGridProps) {
  const { t } = useTranslation();
  const { state } = useAuthContext();
  const userRole = state.user?.role;

  const topStats = [
    {
      title: t("totalBookings"),
      value: allTimeStats.totalBookings,
      icon: Users,
      color: "bg-blue-500",
      roles: ["admin", "manager", "employee"],
    },
    {
      title: t("totalRevenue"),
      value: `${(allTimeStats.totalRevenue || 0).toLocaleString()} ${t("mad")}`,
      icon: DollarSign,
      color: "bg-emerald-500",
      roles: ["admin"],
    },
    {
      title: t("totalProfit"),
      value: `${(allTimeStats.totalProfit || 0).toLocaleString()} ${t("mad")}`,
      icon: TrendingUp,
      color: "bg-orange-500",
      roles: ["admin"],
    },
    {
      title: t("activePrograms"),
      value: allTimeStats.activePrograms,
      icon: Package,
      color: "bg-purple-500",
      roles: ["admin", "manager", "employee"],
    },
  ];

  const visibleTopStats = topStats.filter((stat) =>
    stat.roles.includes(userRole || ""),
  );

  const gridCols =
    userRole === "employee" || userRole === "manager"
      ? "lg:grid-cols-2"
      : "lg:grid-cols-4";

  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 gap-6 ${gridCols}`}>
      {visibleTopStats.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <div
            key={index}
            className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-all duration-200"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {stat.title}
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-2">
                  {stat.value}
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
  );
}
