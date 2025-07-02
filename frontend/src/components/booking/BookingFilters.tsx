import React from "react";
import { useTranslation } from "react-i18next";
import { Download } from "lucide-react";
import { UseFormRegister } from "react-hook-form";
import type { Employee } from "../../context/models";
import { useAuthContext } from "../../context/AuthContext"; // Import the Auth Context

interface BookingFiltersProps {
  register: UseFormRegister<any>;
  handleExport: () => void;
  isExporting: boolean;
  employees: Employee[];
  onSearchKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

export default function BookingFilters({
  register,
  handleExport,
  isExporting,
  employees,
  onSearchKeyDown,
}: BookingFiltersProps) {
  const { t } = useTranslation();
  const { state: authState } = useAuthContext(); // Get the user's auth state
  const userRole = authState.user?.role; // Get the user's role

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder={t("searchBookingsPlaceholder") as string}
            {...register("searchTerm")}
            onKeyDown={onSearchKeyDown}
            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <select
          {...register("sortOrder")}
          className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="newest">{t("sortByNewest")}</option>
          <option value="oldest">{t("sortByOldest")}</option>
          <option value="family">{t("sortByFamily")}</option>
        </select>
        <select
          {...register("statusFilter")}
          className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="all">{t("allStatus")}</option>
          <option value="paid">{t("fullyPaid")}</option>
          <option value="pending">{t("pending")}</option>
        </select>

        {/* --- Conditionally render the employee filter --- */}
        {(userRole === "admin" || userRole === "manager") && (
          <select
            {...register("employeeFilter")}
            className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">{t("allEmployees")}</option>
            {employees.map((employee) => (
              <option key={employee.id} value={employee.id}>
                {employee.username}
              </option>
            ))}
          </select>
        )}

        <button
          onClick={handleExport}
          disabled={isExporting}
          className="inline-flex items-center px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors shadow-sm disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          <Download className="w-4 h-4 mr-2" />
          {isExporting ? t("exporting") : t("exportToExcel")}
        </button>
      </div>
    </div>
  );
}
