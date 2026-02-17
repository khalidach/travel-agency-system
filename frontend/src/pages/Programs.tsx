// frontend/src/pages/Programs.tsx
import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Edit2,
  Trash2,
  Users,
  Package,
  ChevronLeft,
  ChevronRight,
  Clock,
  HelpCircle,
} from "lucide-react";
import Modal from "../components/Modal";
import ProgramForm from "../components/ProgramForm";
import ProgramsSkeleton from "../components/skeletons/ProgramsSkeleton";
import type { Program, PaginatedResponse } from "../context/models";
import * as api from "../services/api";
import { toast } from "react-hot-toast";
import { usePagination } from "../hooks/usePagination";
import { useAuthContext } from "../context/AuthContext";
import ConfirmationModal from "../components/modals/ConfirmationModal";
import VideoHelpModal from "../components/VideoHelpModal";

export default function Programs() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { state } = useAuthContext();
  const currentUser = state.user;
  const [currentPage, setCurrentPage] = useState(1);
  const programsPerPage = 6;

  // Modal States
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingProgram, setEditingProgram] = useState<Program | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [programToDelete, setProgramToDelete] = useState<number | null>(null);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);

  // Search and Filter States
  const [searchTerm, setSearchTerm] = useState("");
  const [submittedSearchTerm, setSubmittedSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("all");

  useEffect(() => {
    setCurrentPage(1);
  }, [submittedSearchTerm, filterType]);

  const {
    data: programResponse,
    isLoading,
    isError,
  } = useQuery<PaginatedResponse<Program>>({
    queryKey: ["programs", currentPage, submittedSearchTerm, filterType],
    queryFn: () =>
      api.getPrograms(
        currentPage,
        programsPerPage,
        submittedSearchTerm,
        filterType,
      ),
  });

  const invalidateRelatedQueries = (updatedProgramId?: number) => {
    queryClient.invalidateQueries({ queryKey: ["programs"] });
    queryClient.invalidateQueries({ queryKey: ["bookingsByProgram"] });
    queryClient.invalidateQueries({ queryKey: ["programsForBooking"] });
    queryClient.invalidateQueries({ queryKey: ["programsWithPricing"] });
    queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
    queryClient.invalidateQueries({ queryKey: ["profitReport"] });
    queryClient.invalidateQueries({ queryKey: ["rooms"] });
    queryClient.invalidateQueries({ queryKey: ["programsForRoomManagement"] });

    if (updatedProgramId) {
      queryClient.invalidateQueries({
        queryKey: ["program", String(updatedProgramId)],
      });
    }
  };

  const programs = programResponse?.data ?? [];
  const pagination = programResponse?.pagination;

  const { mutate: createProgram, isPending: isCreating } = useMutation({
    mutationFn: (data: Program) => api.createProgram(data),
    onSuccess: () => {
      invalidateRelatedQueries();
      toast.success(t("serviceCreatedSuccessfully"));
      setIsFormModalOpen(false);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create program.");
    },
  });

  const { mutate: updateProgram, isPending: isUpdating } = useMutation({
    mutationFn: (program: Program) => api.updateProgram(program.id, program),
    onSuccess: (_, variables) => {
      invalidateRelatedQueries(variables.id);
      toast.success(t("serviceUpdatedSuccessfully"));
      setIsFormModalOpen(false);
      setEditingProgram(null);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update program.");
    },
  });

  const { mutate: deleteProgram } = useMutation({
    mutationFn: (id: number) => api.deleteProgram(id),
    onSuccess: () => {
      invalidateRelatedQueries();
      toast.success(t("serviceDeletedSuccessfully"));
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete program.");
    },
  });

  const paginationRange = usePagination({
    currentPage,
    totalCount: pagination?.totalCount ?? 0,
    pageSize: programsPerPage,
  });

  const handleAddProgram = () => {
    setEditingProgram(null);
    setIsFormModalOpen(true);
  };

  const handleEditProgram = (program: Program) => {
    setEditingProgram(program);
    setIsFormModalOpen(true);
  };

  const handleDeleteProgram = (programId: number) => {
    setProgramToDelete(programId);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = () => {
    if (programToDelete !== null) {
      deleteProgram(programToDelete);
      setIsDeleteModalOpen(false);
      setProgramToDelete(null);
    }
  };

  const handleSaveProgram = (program: Program) => {
    if (editingProgram) {
      updateProgram(program);
    } else {
      createProgram(program);
    }
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

  // Kept specific colors for badges as they represent data types,
  // but ensured they look good in dark mode.
  const getTypeColor = (type: string) => {
    switch (type) {
      case "Hajj":
        return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300";
      case "Umrah":
        return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300";
      case "Tourism":
        return "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300";
      case "Ramadan":
        return "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300";
      default:
        return "bg-secondary text-secondary-foreground";
    }
  };

  if (isLoading) {
    return <ProgramsSkeleton />;
  }

  if (isError) {
    return <div>{t("errorLoadingDashboard")}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            {t("programsTitle")}
          </h1>
          <p className="text-muted-foreground mt-2">{t("programsSubtitle")}</p>
        </div>
        <div className="flex items-center gap-4 mt-4 sm:mt-0">
          <button
            onClick={() => setIsHelpModalOpen(true)}
            className="p-2 text-muted-foreground bg-muted rounded-full hover:bg-muted/80 hover:text-foreground transition-colors"
            aria-label="Help"
          >
            <HelpCircle className="w-6 h-6" />
          </button>
          <button
            onClick={handleAddProgram}
            className="inline-flex items-center px-4 py-2 bg-primary text-white rounded-xl hover:bg-primary/90 transition-colors shadow-sm"
          >
            <Plus className={`w-5 h-5 text-white mr-2`} />
            {t("addProgram")}
          </button>
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
              className="w-full px-4 py-2 border border-input rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent bg-background text-foreground placeholder:text-muted-foreground"
            />
          </div>
          <select
            value={filterType}
            onChange={(e) => handleFilterChange(e.target.value)}
            className="px-4 py-2 border border-input rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent bg-background text-foreground"
          >
            <option value="all">{t("allTypes")}</option>
            <option value="Hajj">Hajj</option>
            <option value="Umrah">Umrah</option>
            <option value="Tourism">Tourism</option>
            <option value="Ramadan">Ramadan</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {programs.map((program) => {
          const canModify =
            currentUser?.role === "admin" ||
            currentUser?.id === program.employeeId;
          const packageCount = (program.packages ?? []).length;
          return (
            <div
              key={program.id}
              className="bg-card text-card-foreground rounded-2xl p-6 shadow-sm border border-border hover:shadow-md transition-all duration-200"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-card-foreground">
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
                {canModify && (
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleEditProgram(program)}
                      className="p-2 text-muted-foreground hover:text-primary hover:bg-secondary rounded-lg transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteProgram(program.id)}
                      className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
              <div className="space-y-3">
                <div className="flex items-center text-sm text-muted-foreground">
                  <Clock className={`w-4 h-4 text-muted-foreground mr-2`} />
                  <span>
                    {t("durations")}:{" "}
                    {(program.variations || [])
                      .map((v) => `${v.duration} ${t("days")}`)
                      .join(", ")}
                  </span>
                </div>
                <div className="flex items-center text-sm text-muted-foreground">
                  <Package className={`w-4 h-4 text-muted-foreground mr-2`} />
                  <span>
                    {packageCount} {t("package", { count: packageCount })}
                  </span>
                </div>
                <div className="flex items-center text-sm text-muted-foreground">
                  <Users className={`w-4 h-4 text-muted-foreground mr-2`} />
                  <span>
                    {t("totalBookings")}: {program.totalBookings || 0}
                    {program.maxBookings !== undefined && (
                      <span className="ml-1">
                        / {program.maxBookings || t("unlimited")}
                      </span>
                    )}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {pagination && pagination.totalPages > 1 && (
        <div className="flex justify-between items-center py-3 px-6 border-t border-border bg-card rounded-b-2xl">
          <button
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className="inline-flex items-center px-3 py-1 text-sm bg-muted text-muted-foreground rounded-lg hover:bg-muted/80 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            {t("previous")}
          </button>
          <div className="flex items-center space-x-1">
            {paginationRange.map((pageNumber, index) => {
              if (typeof pageNumber === "string") {
                return (
                  <span
                    key={index}
                    className="px-3 py-1 text-sm text-muted-foreground"
                  >
                    ...
                  </span>
                );
              }
              return (
                <button
                  key={index}
                  onClick={() => setCurrentPage(pageNumber)}
                  className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                    currentPage === pageNumber
                      ? "bg-primary text-primary-foreground font-bold shadow-sm"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {pageNumber}
                </button>
              );
            })}
          </div>
          <button
            onClick={() =>
              setCurrentPage((prev) =>
                Math.min(prev + 1, pagination.totalPages),
              )
            }
            disabled={currentPage === pagination.totalPages}
            className="inline-flex items-center px-3 py-1 text-sm bg-muted text-muted-foreground rounded-lg hover:bg-muted/80 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t("next")}
            <ChevronRight className="w-4 h-4 ml-1" />
          </button>
        </div>
      )}

      {programs.length === 0 && !isLoading && (
        <div className="text-center py-12 bg-card rounded-2xl border border-border">
          <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
            <Package className="w-12 h-12 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium text-foreground mb-2">
            {t("noProgramsFound")}
          </h3>
          <p className="text-muted-foreground mb-6">{t("noProgramsLead")}</p>
        </div>
      )}

      <Modal
        isOpen={isFormModalOpen}
        onClose={() => {
          setIsFormModalOpen(false);
          setEditingProgram(null);
        }}
        title={editingProgram ? t("editProgram") : t("addProgram")}
        size="xl"
      >
        <ProgramForm
          program={editingProgram}
          onSave={handleSaveProgram}
          onCancel={() => {
            setIsFormModalOpen(false);
            setEditingProgram(null);
          }}
          isSaving={isCreating || isUpdating}
        />
      </Modal>

      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title={t("deleteProgramTitle")}
        message={t("deleteProgramMessage")}
      />
      <VideoHelpModal
        isOpen={isHelpModalOpen}
        onClose={() => setIsHelpModalOpen(false)}
        videoId="RzZ8a0b9ymY"
        title={t("programsManagementHelp")}
      />
    </div>
  );
}
