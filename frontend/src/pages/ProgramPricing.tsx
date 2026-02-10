// frontend/src/pages/ProgramPricing.tsx
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  Program,
  ProgramPricing,
  PaginatedResponse,
} from "../context/models";
import * as api from "../services/api";
import { toast } from "react-hot-toast";
import { useAuthContext } from "../context/AuthContext";

// Components
import ConfirmationModal from "../components/modals/ConfirmationModal";
import Modal from "../components/Modal";
import ProgramPricingForm from "../components/ProgramPricingForm";
import BookingSkeleton from "../components/skeletons/BookingSkeleton";
import VideoHelpModal from "../components/VideoHelpModal";
import PaginationControls from "../components/ui/PaginationControls";

// Refactored Components
import { PricingHeader } from "../components/program_pricing/PricingHeader";
import { PricingFilters } from "../components/program_pricing/PricingFilters";
import { PricingCard } from "../components/program_pricing/PricingCard";

export default function ProgramPricingPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { state: authState } = useAuthContext();
  const currentUser = authState.user;

  // --- State ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProgram, setSelectedProgram] = useState<Program | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [pricingToDelete, setPricingToDelete] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [submittedSearchTerm, setSubmittedSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);

  const programsPerPage = 6;

  useEffect(() => {
    setCurrentPage(1);
  }, [submittedSearchTerm, filterType]);

  // --- Queries ---
  const { data: programsResponse, isLoading: isLoadingPrograms } = useQuery<
    PaginatedResponse<Program>
  >({
    queryKey: [
      "programsWithPricing",
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
        "pricing",
      ),
  });

  const programs = programsResponse?.data ?? [];
  const pagination = programsResponse?.pagination;

  // --- Mutations ---
  const invalidateRelatedQueries = (programId?: number) => {
    queryClient.invalidateQueries({ queryKey: ["programsWithPricing"] });
    queryClient.invalidateQueries({ queryKey: ["programs"] });
    if (programId) {
      queryClient.invalidateQueries({
        queryKey: ["bookingsByProgram", String(programId)],
      });
    } else {
      queryClient.invalidateQueries({ queryKey: ["bookingsByProgram"] });
    }
    queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
    queryClient.invalidateQueries({ queryKey: ["profitReport"] });
  };

  const { mutate: createPricing, isPending: isCreating } = useMutation({
    // FIX: Replaced 'any' with specific Omit type
    mutationFn: (data: Omit<ProgramPricing, "id">) =>
      api.createProgramPricing(data),
    onSuccess: (_data, variables) => {
      invalidateRelatedQueries(variables.programId);
      toast.success("Pricing saved successfully.");
      setIsModalOpen(false);
    },
    // FIX: Replaced 'any' with 'Error'
    onError: (error: Error) => {
      toast.error(error.message || "Failed to save pricing.");
    },
  });

  const { mutate: updatePricing, isPending: isUpdating } = useMutation({
    mutationFn: (data: ProgramPricing) =>
      api.updateProgramPricing(data.id, data),
    onSuccess: (_data, variables) => {
      invalidateRelatedQueries(variables.programId);
      toast.success("Pricing updated successfully.");
      setIsModalOpen(false);
    },
    // FIX: Replaced 'any' with 'Error'
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update pricing.");
    },
  });

  const { mutate: deletePricing } = useMutation({
    mutationFn: (id: number) => api.deleteProgramPricing(id),
    onSuccess: () => {
      invalidateRelatedQueries();
      toast.success("Pricing deleted successfully.");
    },
    // FIX: Replaced 'any' with 'Error'
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete pricing.");
    },
  });

  // --- Handlers ---
  const handleEditPricing = (program: Program) => {
    setSelectedProgram(program);
    setIsModalOpen(true);
  };

  const handleDeletePricing = (pricingId: number) => {
    setPricingToDelete(pricingId);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = () => {
    if (pricingToDelete) {
      deletePricing(pricingToDelete);
      setIsDeleteModalOpen(false);
    }
  };

  const handleSave = (data: ProgramPricing | Omit<ProgramPricing, "id">) => {
    if ("id" in data) {
      updatePricing(data);
    } else {
      createPricing(data as Omit<ProgramPricing, "id">);
    }
  };

  const handleSearchSubmit = () => {
    setSubmittedSearchTerm(searchTerm);
  };

  const handleFilterChange = (newFilterType: string) => {
    setFilterType(newFilterType);
    setSubmittedSearchTerm(searchTerm);
  };

  if (isLoadingPrograms) {
    return <BookingSkeleton />;
  }

  return (
    <div className="mx-auto p-6 space-y-8">
      {/* Header */}
      <PricingHeader onOpenHelp={() => setIsHelpModalOpen(true)} />

      {/* Filters */}
      <PricingFilters
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        onSearchSubmit={handleSearchSubmit}
        filterType={filterType}
        onFilterChange={handleFilterChange}
      />

      {/* Programs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {programs.map((program) => (
          <PricingCard
            key={program.id}
            program={program}
            currentUser={currentUser}
            onEdit={handleEditPricing}
            onDelete={handleDeletePricing}
          />
        ))}
      </div>

      {/* Pagination Controls */}
      {pagination && pagination.totalPages > 1 && (
        <PaginationControls
          currentPage={currentPage}
          totalPages={pagination.totalPages}
          onPageChange={setCurrentPage}
          // FIX: Added missing props
          totalCount={pagination.totalCount}
          limit={programsPerPage}
        />
      )}

      {/* Modals */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={
          selectedProgram
            ? t("pricingFor", { programName: selectedProgram.name })
            : t("programPricing")
        }
        size="xl"
      >
        {selectedProgram && (
          <ProgramPricingForm
            program={selectedProgram}
            existingPricing={selectedProgram.pricing}
            onSave={handleSave}
            onCancel={() => setIsModalOpen(false)}
            isSaving={isCreating || isUpdating}
          />
        )}
      </Modal>

      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title={t("deletePricingTitle")}
        message={t("deletePricingMessage")}
      />

      <VideoHelpModal
        isOpen={isHelpModalOpen}
        onClose={() => setIsHelpModalOpen(false)}
        videoId="-c4xoeUa3a8"
        title="Program Pricing Management"
      />
    </div>
  );
}
