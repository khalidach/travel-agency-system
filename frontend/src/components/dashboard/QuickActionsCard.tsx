import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Calendar, Package, TrendingUp } from "lucide-react";
import { useAuthContext } from "../../context/AuthContext";

export default function QuickActionsCard() {
  const { t } = useTranslation();
  const { state } = useAuthContext();
  const userRole = state.user?.role;

  const linkClass = `w-full flex items-center p-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg transition-colors ${
    document.documentElement.dir === "rtl" ? "text-right" : "text-left"
  }`;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
        {t("quickActions")}
      </h3>
      <div className="space-y-3">
        <Link to="/booking" className={linkClass}>
          <Calendar className="w-5 h-5 text-blue-500 mx-3" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {t("newBooking")}
          </span>
        </Link>
        <Link to="/programs" className={linkClass}>
          <Package className="w-5 h-5 text-emerald-500 mx-3" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {t("addProgram")}
          </span>
        </Link>
        {(userRole === "admin" || userRole === "manager") && (
          <Link to="/profit-report" className={linkClass}>
            <TrendingUp className="w-5 h-5 text-orange-500 mx-3" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {t("viewReports")}
            </span>
          </Link>
        )}
      </div>
    </div>
  );
}
