// frontend/src/pages/ProgramCostingList.tsx
import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { DollarSign, ChevronRight } from "lucide-react"; // Import ChevronRight
import BookingSkeleton from "../components/skeletons/BookingSkeleton";
import { usePagination } from "../hooks/usePagination";
import type { Program, PaginatedResponse } from "../context/models";
import * as api from "../services/api";
import PaginationControls from "../components/booking/PaginationControls";

export default function ProgramCostingList() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [submittedSearchTerm, setSubmittedSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const programsPerPage = 6;

  useEffect(() => {
    setCurrentPage(1);
  }, [submittedSearchTerm, filterType]);

  const { data: programResponse, isLoading: isLoadingPrograms } = useQuery<
    PaginatedResponse<Program>
  >({
    queryKey: [
      "programsForCosting",
      currentPage,
      submittedSearchTerm,
      filterType,
    ],
    queryFn: () =>
      api.getPrograms(
        currentPage,
        programsPerPage,
        submittedSearchTerm,
        filterType,
        "costing" // Use the new view to filter out commission-based programs
      ),
  });

  const programs = programResponse?.data ?? [];
  const pagination = programResponse?.pagination;

  const paginationRange = usePagination({
    currentPage,
    totalCount: pagination?.totalCount ?? 0,
    pageSize: programsPerPage,
  });

  const handleProgramSelect = (pId: number) => {
    navigate(`/program-costing/${pId}`);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      setSubmittedSearchTerm(searchTerm);
    }
  };

  const handleFilterChange = (newFilterType: string) => {
    setFilterType(newFilterType);
    setSubmittedSearchTerm(searchTerm);
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "Hajj":
        return "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300";
      case "Umrah":
        return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300";
      case "Tourism":
        return "bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300";
      default:
        return "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300";
    }
  };

  if (isLoadingPrograms) {
    return <BookingSkeleton />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            {t("programCosting")}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            {t("programCostingListSubtitle")}
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder={t("searchProgramsPlaceholder") as string}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              className="w-full px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>
          <select
            value={filterType}
            onChange={(e) => handleFilterChange(e.target.value)}
            className="px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          >
            <option value="all">{t("allTypes")}</option>
            <option value="Hajj">Hajj</option>
            <option value="Umrah">Umrah</option>
            <option value="Tourism">Tourism</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {programs.map((program) => (
          <div
            key={program.id}
            onClick={() => handleProgramSelect(program.id)}
            className="group bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-600 transition-all duration-300 cursor-pointer flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    {program.name}
                  </h3>
                  <span
                    className={`inline-block px-3 py-1 text-xs font-medium rounded-full mt-2 ${getTypeColor(
                      program.type
                    )}`}
                  >
                    {program.type}
                  </span>
                </div>
              </div>

              {/* --- NEW COST DETAILS SECTION --- */}
              <div className="space-y-2 text-sm text-gray-700 dark:text-gray-300 mb-4">
                {program.costs && program.costs.totalCost > 0 ? (
                  <>
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">
                        {t("totalFlightTicketsCost")}:
                      </span>
                      <span className="font-medium">
                        {program.costs.costs?.flightTickets?.toLocaleString() ||
                          0}{" "}
                        {t("mad")}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">
                        {t("totalVisaCost")}:
                      </span>
                      <span className="font-medium">
                        {program.costs.costs?.visa?.toLocaleString() || 0}{" "}
                        {t("mad")}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">
                        {t("transportFees")}:
                      </span>
                      <span className="font-medium">
                        {program.costs.costs?.transport?.toLocaleString() || 0}{" "}
                        {t("mad")}
                      </span>
                    </div>
                    <div className="flex justify-between pt-2 border-t dark:border-gray-600 mt-2">
                      <span className="font-semibold text-base text-gray-800 dark:text-gray-100">
                        {t("totalProgramCost")}:
                      </span>
                      <span className="font-bold text-base text-blue-600 dark:text-blue-400">
                        {program.costs.totalCost?.toLocaleString() || 0}{" "}
                        {t("mad")}
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-4">
                    <span className="text-gray-400 dark:text-gray-500 italic">
                      {t("noPricingSet")}
                    </span>
                  </div>
                )}
              </div>
              {/* --- END NEW COST DETAILS SECTION --- */}
            </div>

            <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-700 flex items-center justify-end text-blue-600 dark:text-blue-400 font-medium group-hover:text-blue-700 dark:group-hover:text-blue-300 transition-colors">
              {t("enterCosts")}
              <ChevronRight className="w-4 h-4 ml-1 transition-transform group-hover:translate-x-1" />
            </div>
          </div>
        ))}
      </div>

      {pagination && pagination.totalPages > 1 && (
        <PaginationControls
          currentPage={currentPage}
          totalPages={pagination.totalPages}
          onPageChange={setCurrentPage}
          paginationRange={paginationRange}
        />
      )}

      {programs.length === 0 && !isLoadingPrograms && (
        <div className="col-span-full text-center py-12 bg-white dark:bg-gray-800 rounded-2xl">
          <div className="w-24 h-24 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
            <DollarSign className="w-12 h-12 text-gray-400 dark:text-gray-500" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            {t("noProgramsCosting")}
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            {t("noProgramsCostingLead")}
          </p>
        </div>
      )}
    </div>
  );
}
