import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuthContext } from "../context/AuthContext";
import {
  BarChart3,
  Package,
  Calendar,
  TrendingUp,
  Plane,
  ShipWheel,
  Users,
  Crown,
  BedDouble,
} from "lucide-react";

const allMenuItems = [
  {
    key: "owner",
    path: "/",
    icon: Crown,
    roles: ["owner"],
  },
  {
    key: "dashboard",
    path: "/",
    icon: BarChart3,
    roles: ["admin", "manager", "employee"],
  },
  {
    key: "programs",
    path: "/programs",
    icon: Package,
    roles: ["admin", "manager", "employee"],
  },
  {
    key: "programPricing",
    path: "/program-pricing",
    icon: ShipWheel,
    roles: ["admin", "manager"],
  },
  {
    key: "booking",
    path: "/booking",
    icon: Calendar,
    roles: ["admin", "manager", "employee"],
  },
  {
    key: "roomManagement",
    path: "/room-management",
    icon: BedDouble,
    roles: ["admin", "manager"],
  },
  {
    key: "profitReport",
    path: "/profit-report",
    icon: TrendingUp,
    roles: ["admin"],
  },
  { key: "employees", path: "/employees", icon: Users, roles: ["admin"] },
];

export default function Sidebar() {
  const { t } = useTranslation();
  const location = useLocation();
  const { state } = useAuthContext();
  const userRole = state.user?.role;

  const menuItems = allMenuItems.filter(
    (item) => userRole && item.roles.includes(userRole)
  );

  return (
    <div className="w-64 bg-white shadow-xl border-r border-gray-100 flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center shadow-lg">
            <Plane className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">TravelPro</h1>
            <p className="text-sm text-gray-500">Management System</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;

            return (
              <li key={item.key}>
                <Link
                  to={item.path}
                  className={`group flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 ${
                    isActive
                      ? "bg-blue-50 text-blue-700 shadow-sm"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  }`}
                >
                  <Icon
                    className={`mx-3 h-5 w-5 transition-colors ${
                      isActive
                        ? "text-blue-600"
                        : "text-gray-400 group-hover:text-gray-600"
                    }`}
                  />
                  {t(item.key)}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-100">
        <div className="text-xs text-gray-500 text-center">
          © 2025 TravelPro System
        </div>
      </div>
    </div>
  );
}
