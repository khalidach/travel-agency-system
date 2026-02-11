// frontend/src/pages/ProgramCostingList.tsx
import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { DollarSign, ChevronRight } from "lucide-react";
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
        "costing",
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

  // Uses semantic colors defined in index.css (Info, Success, Warning)
  const getTypeColor = (type: string) => {
    switch (type) {
      case "Hajj":
        return "bg-info/10 text-info border border-info/20";
      case "Umrah":
        return "bg-success/10 text-success border border-success/20";
      case "Tourism":
        return "bg-warning/10 text-warning border border-warning/20";
      default:
        return "bg-secondary text-secondary-foreground";
    }
  };

  if (isLoadingPrograms) {
    return <BookingSkeleton />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            {t("programCosting")}
          </h1>
          <p className="text-muted-foreground mt-2">
            {t("programCostingListSubtitle")}
          </p>
        </div>
      </div>

      <div className="bg-card text-card-foreground rounded-2xl p-6 shadow-sm border border-border">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder={t("searchProgramsPlaceholder") as string}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              className="w-full px-4 py-2 border border-input bg-background text-foreground rounded-lg focus:ring-2 focus:ring-ring focus:border-input placeholder:text-muted-foreground"
            />
          </div>
          <select
            value={filterType}
            onChange={(e) => handleFilterChange(e.target.value)}
            className="px-4 py-2 border border-input bg-background text-foreground rounded-lg focus:ring-2 focus:ring-ring focus:border-input"
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
            className="group bg-card text-card-foreground rounded-2xl p-6 shadow-sm border border-border hover:shadow-lg hover:border-primary transition-all duration-300 cursor-pointer flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-foreground">
                    {program.name}
                  </h3>
                  <span
                    className={`inline-block px-3 py-1 text-xs font-medium rounded-full mt-2 ${getTypeColor(
                      program.type,
                    )}`}
                  >
                    {program.type}
                  </span>
                </div>
              </div>

              {/* --- COST DETAILS SECTION --- */}
              <div className="space-y-2 text-sm text-muted-foreground mb-4">
                {program.costs && program.costs.totalCost > 0 ? (
                  <>
                    <div className="flex justify-between">
                      <span>{t("totalFlightTicketsCost")}:</span>
                      <span className="font-medium text-foreground">
                        {program.costs.costs?.flightTickets?.toLocaleString() ||
                          0}{" "}
                        {t("mad")}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>{t("totalVisaCost")}:</span>
                      <span className="font-medium text-foreground">
                        {program.costs.costs?.visa?.toLocaleString() || 0}{" "}
                        {t("mad")}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>{t("transportFees")}:</span>
                      <span className="font-medium text-foreground">
                        {program.costs.costs?.transport?.toLocaleString() || 0}{" "}
                        {t("mad")}
                      </span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-border mt-2">
                      <span className="font-semibold text-base text-foreground">
                        {t("totalProgramCost")}:
                      </span>
                      <span className="font-bold text-base text-primary">
                        {program.costs.totalCost?.toLocaleString() || 0}{" "}
                        {t("mad")}
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-4">
                    <span className="text-muted-foreground italic">
                      {t("noPricingSet")}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-border flex items-center justify-end text-primary font-medium group-hover:text-primary/80 transition-colors">
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
        <div className="col-span-full text-center py-12 bg-card rounded-2xl border border-border">
          <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
            <DollarSign className="w-12 h-12 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium text-foreground mb-2">
            {t("noProgramsCosting")}
          </h3>
          <p className="text-muted-foreground">{t("noProgramsCostingLead")}</p>
        </div>
      )}
    </div>
  );
}
