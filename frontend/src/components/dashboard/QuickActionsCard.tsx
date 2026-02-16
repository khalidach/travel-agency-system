import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Calendar, Package, TrendingUp } from "lucide-react";
import { useAuthContext } from "../../context/AuthContext";

export default function QuickActionsCard() {
  const { t } = useTranslation();
  const { state } = useAuthContext();
  const userRole = state.user?.role;

  const linkClass = `w-full flex items-center p-3 hover:bg-accent hover:text-accent-foreground rounded-lg transition-colors text-left`;

  return (
    <div className="bg-card text-card-foreground rounded-2xl p-6 shadow-sm border border-border">
      <h3 className="text-lg font-semibold mb-4">{t("quickActions")}</h3>
      <div className="space-y-3">
        <Link to="/booking" className={linkClass}>
          <Calendar className="w-5 h-5 text-blue-500 mx-3" />
          <span className="text-sm font-medium">{t("newBooking")}</span>
        </Link>
        <Link to="/programs" className={linkClass}>
          <Package className="w-5 h-5 text-emerald-500 mx-3" />
          <span className="text-sm font-medium">{t("addProgram")}</span>
        </Link>
        {(userRole === "admin" || userRole === "manager") && (
          <Link to="/profit-report" className={linkClass}>
            <TrendingUp className="w-5 h-5 text-orange-500 mx-3" />
            <span className="text-sm font-medium">{t("viewReports")}</span>
          </Link>
        )}
      </div>
    </div>
  );
}
