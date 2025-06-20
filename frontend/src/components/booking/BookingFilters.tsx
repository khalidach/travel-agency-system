import React from "react";
import { useTranslation } from "react-i18next";
import { Download } from "lucide-react";
import type { Program } from "../../context/models";

interface BookingFiltersProps {
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  sortOrder: string;
  setSortOrder: (value: string) => void;
  statusFilter: string;
  setStatusFilter: (value: string) => void;
  programFilter: string;
  handleProgramFilterChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  programs: Program[];
  handleExport: () => void;
  isExporting: boolean;
}

export default function BookingFilters({
  searchTerm,
  setSearchTerm,
  sortOrder,
  setSortOrder,
  statusFilter,
  setStatusFilter,
  programFilter,
  handleProgramFilterChange,
  programs,
  handleExport,
  isExporting,
}: BookingFiltersProps) {
  const { t } = useTranslation();

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder={`${t("search")} bookings...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <select
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value)}
          className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="newest">Sort by Newest</option>
          <option value="oldest">Sort by Oldest</option>
          <option value="family">Sort by Family</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="all">All Status</option>
          <option value="paid">Fully Paid</option>
          <option value="pending">Pending Payment</option>
        </select>
        <select
          value={programFilter}
          onChange={handleProgramFilterChange}
          className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="all">{t("allPrograms")}</option>
          {programs.map((program) => (
            <option key={program.id} value={program.id}>
              {program.name}
            </option>
          ))}
        </select>
        <button
          onClick={handleExport}
          disabled={programFilter === "all" || isExporting}
          className="inline-flex items-center px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors shadow-sm disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          <Download className="w-4 h-4 mr-2" />
          {isExporting ? "Exporting..." : "Export to Excel"}
        </button>
      </div>
    </div>
  );
}
