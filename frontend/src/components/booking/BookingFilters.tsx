// frontend/src/components/booking/BookingFilters.tsx
import React from "react";
import { useTranslation } from "react-i18next";
import { UseFormRegister } from "react-hook-form";
import type { Employee } from "../../context/models";
import { useAuthContext } from "../../context/AuthContext";

// Define the shape of the form values used in this component
export interface BookingFilterValues {
  searchTerm: string;
  variationFilter: string;
  sortOrder: string;
  statusFilter: string;
  employeeFilter: string;
}

interface BookingFiltersProps {
  register: UseFormRegister<BookingFilterValues>; // Replaced 'any' with explicit type
  employees: Employee[];
  onSearchKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  programVariations: { name: string }[];
}

export default function BookingFilters({
  register,
  employees,
  onSearchKeyDown,
  programVariations,
}: BookingFiltersProps) {
  const { t } = useTranslation();
  const { state: authState } = useAuthContext();
  const userRole = authState.user?.role;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder={t("searchBookingsPlaceholder") as string}
            {...register("searchTerm")}
            onKeyDown={onSearchKeyDown}
            className="w-full px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          />
        </div>

        <select
          {...register("variationFilter")}
          className="px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
        >
          <option value="all">التنويع (الكل)</option>
          {programVariations.map((v) => (
            <option key={v.name} value={v.name}>
              {v.name}
            </option>
          ))}
        </select>

        <select
          {...register("sortOrder")}
          className="px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
        >
          <option value="newest">{t("sortByNewest")}</option>
          <option value="oldest">{t("sortByOldest")}</option>
          <option value="family">{t("sortByFamily")}</option>
        </select>

        <select
          {...register("statusFilter")}
          className="px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
        >
          <option value="all">{t("allStatus")}</option>
          <option value="paid">{t("fullyPaid")}</option>
          <option value="pending">{t("pending")}</option>
          <option value="notPaid">{t("notPaid")}</option>
        </select>

        {(userRole === "admin" || userRole === "manager") && (
          <select
            {...register("employeeFilter")}
            className="px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          >
            <option value="all">{t("allEmployees")}</option>
            {employees.map((employee) => (
              <option key={employee.id} value={employee.id}>
                {employee.username}
              </option>
            ))}
          </select>
        )}

      </div>
    </div>
  );
}
