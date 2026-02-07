import React, { useMemo, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import { useForm } from "react-hook-form";

// Components
import BookingSummary from "../components/booking/BookingSummary";
import BookingFilters from "../components/booking/BookingFilters";
import BookingTable from "../components/booking/BookingTable";
import BookingSkeleton from "../components/skeletons/BookingSkeleton";
import BookingPageHeader from "../components/booking/BookingPageHeader";
import PaginationControls from "../components/booking/PaginationControls";
import BookingPageModals from "../components/booking/BookingPageModals";
import BookingSelectionBanner from "../components/booking/BookingSelectionBanner";
import BookingEmptyState from "../components/booking/BookingEmptyState";

// Hooks
import { usePagination } from "../hooks/usePagination";
import { useAuthContext } from "../context/AuthContext";
import { useDebounce } from "../hooks/useDebounce";
import { useBookingStore } from "../store/bookingStore";
import { useBookingOperations } from "../hooks/useBookingOperations";

// Types and API
import type {
  Booking,
  Program,
  Employee,
  BookingSummaryStats,
} from "../context/models";
import * as api from "../services/api";

interface FilterFormData {
  searchTerm: string;
  sortOrder: string;
  statusFilter: string;
  employeeFilter: string;
  variationFilter: string;
}

interface BookingResponse {
  data: Booking[];
  pagination: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
  };
  summary: BookingSummaryStats;
}

export default function BookingPage() {
  const queryClient = useQueryClient();
  const { programId } = useParams<{ programId: string }>();
  const { state: authState } = useAuthContext();
  const userRole = authState.user?.role;
  const userId = authState.user?.id;
  const user = authState.user;

  // Zustand Store
  const {
    isExporting,
    importFile,
    currentPage,
    selectedBookingIds,
    isSelectAllAcrossPages,
    openBookingModal,
    setSelectedForPayment,
    setBookingToDelete,
    setImportFile,
    setCurrentPage,
    setSelectedBookingIds,
    toggleIdSelection,
    clearSelection,
    setIsSelectAllAcrossPages,
    openExportModal,
    setBookingToDelete: setStoreBookingToDelete,
  } = useBookingStore();

  const bookingsPerPage = 10;

  // Filters Form
  const { register, watch } = useForm<FilterFormData>({
    defaultValues: {
      searchTerm: "",
      sortOrder: "newest",
      statusFilter: "all",
      employeeFilter: "all",
      variationFilter: "all",
    },
  });

  const searchTerm = watch("searchTerm");
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  const sortOrder = watch("sortOrder");
  const statusFilter = watch("statusFilter");
  const employeeFilter = watch("employeeFilter");
  const variationFilter = watch("variationFilter");

  // Reset pagination on filter change
  useEffect(() => {
    setCurrentPage(1);
    clearSelection();
  }, [
    debouncedSearchTerm,
    sortOrder,
    statusFilter,
    employeeFilter,
    variationFilter,
    setCurrentPage,
    clearSelection,
  ]);

  // --- Data Fetching ---

  const { data: bookingResponse, isLoading: isLoadingBookings } =
    useQuery<BookingResponse>({
      queryKey: [
        "bookingsByProgram",
        programId,
        currentPage,
        debouncedSearchTerm,
        sortOrder,
        statusFilter,
        employeeFilter,
        variationFilter,
      ],
      queryFn: () =>
        api.getBookingsByProgram(programId!, {
          page: currentPage,
          limit: bookingsPerPage,
          searchTerm: debouncedSearchTerm,
          sortOrder,
          statusFilter,
          employeeFilter,
          variationFilter,
        }),
      enabled: !!programId,
      placeholderData: (prev) => prev,
    });

  const allBookings = bookingResponse?.data ?? [];
  const summaryStats = bookingResponse?.summary;
  const pagination = bookingResponse?.pagination;

  const { data: program, isLoading: isLoadingProgram } = useQuery<Program>({
    queryKey: ["program", programId],
    queryFn: () => api.getProgramById(programId!),
    enabled: !!programId,
    staleTime: 10 * 60 * 1000,
  });
  const programs = program ? [program] : [];
  const programVariations = program?.variations || [];

  const { data: employeesData, isLoading: isLoadingEmployees } = useQuery<{
    employees: Employee[];
  }>({
    queryKey: ["employees"],
    queryFn: api.getEmployees,
    enabled: userRole === "admin" || userRole === "manager",
    staleTime: 15 * 60 * 1000,
  });
  const employees = employeesData?.employees ?? [];

  // --- Operations Hook ---

  const {
    isImporting,
    importBookings,
    handleSaveBooking,
    handleSavePayment,
    handleUpdatePayment,
    handleDeletePayment,
    confirmDeleteAction,
    handleNormalExport,
    handleFlightListExport,
    handleExportTemplate,
  } = useBookingOperations({
    programId,
    program,
    filters: {
      searchTerm: debouncedSearchTerm,
      statusFilter,
      employeeFilter,
      variationFilter,
    },
  });

  // --- Derived Logic ---

  const hasFlightListExportAccess = useMemo(() => {
    if (!user) return false;
    if (typeof user.limits?.flightListExport === "boolean") {
      return user.limits.flightListExport;
    }
    if (typeof user.tierLimits?.flightListExport === "boolean") {
      return user.tierLimits.flightListExport;
    }
    return false;
  }, [user]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImportFile(e.target.files[0]);
    }
  };

  const handleImport = () => {
    if (importFile && programId) {
      importBookings(importFile);
    }
  };

  const handleExport = () => {
    if (hasFlightListExportAccess) {
      openExportModal();
    } else {
      handleNormalExport();
    }
  };

  // Selection Logic
  const selectableBookingIdsOnPage = useMemo(() => {
    if (userRole === "admin") {
      return allBookings.map((b) => b.id);
    }
    return allBookings.filter((b) => b.employeeId === userId).map((b) => b.id);
  }, [allBookings, userRole, userId]);

  const isPageSelected = useMemo(() => {
    if (selectableBookingIdsOnPage.length === 0) return false;
    return selectableBookingIdsOnPage.every((id) =>
      selectedBookingIds.includes(id),
    );
  }, [selectableBookingIdsOnPage, selectedBookingIds]);

  const isHeaderCheckboxChecked = isPageSelected || isSelectAllAcrossPages;

  const handleSelectAllMatching = async () => {
    try {
      const data = await queryClient.fetchQuery<{ ids: number[] }>({
        queryKey: [
          "allBookingIds",
          programId,
          debouncedSearchTerm,
          statusFilter,
          employeeFilter,
          variationFilter,
        ],
        queryFn: () =>
          api.getBookingIdsByProgram(programId!, {
            searchTerm: debouncedSearchTerm,
            statusFilter,
            employeeFilter,
            variationFilter,
          }),
        staleTime: 1000 * 60 * 5,
      });

      if (data && data.ids) {
        setSelectedBookingIds(data.ids);
        setIsSelectAllAcrossPages(true);
      }
    } catch (_error) {
      // ESLint: 'error' renamed to '_error' to indicate it is unused
      toast.error("Could not fetch all bookings.");
    }
  };

  const handleSelectionChange = (id: number) => {
    if (userRole === "manager" || userRole === "employee") {
      const booking = allBookings.find((b) => b.id === id);
      if (booking && booking.employeeId !== userId) {
        toast.error("You have not made this booking.");
        return;
      }
    }
    toggleIdSelection(id);
  };

  const handleSelectAllToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      if (selectableBookingIdsOnPage.length === 0) {
        toast.error("There are no bookings you have made on this page.");
        e.target.checked = false;
        return;
      }
      const newSelectedIds = [
        ...new Set([...selectedBookingIds, ...selectableBookingIdsOnPage]),
      ];
      setSelectedBookingIds(newSelectedIds);
    } else {
      clearSelection();
    }
  };

  const handleDeleteSelected = () => {
    setStoreBookingToDelete(-999);
  };

  const paginationRange = usePagination({
    currentPage,
    totalCount: pagination?.totalCount ?? 0,
    pageSize: bookingsPerPage,
  });

  if (isLoadingProgram || isLoadingEmployees) {
    return <BookingSkeleton />;
  }

  const showSelectAllBar =
    isPageSelected &&
    !isSelectAllAcrossPages &&
    pagination &&
    pagination.totalCount > allBookings.length;

  return (
    <div className="space-y-6">
      <BookingPageHeader
        program={program}
        onAddBooking={() => openBookingModal()}
        onExportTemplate={handleExportTemplate}
        onFileSelect={handleFileSelect}
        onImport={handleImport}
        isImporting={isImporting}
        importFile={importFile}
      />

      {summaryStats && !isLoadingBookings ? (
        <BookingSummary stats={summaryStats} />
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="bg-white p-4 rounded-xl shadow-sm border animate-pulse"
            >
              <div className="h-4 bg-gray-200 rounded w-20 mx-auto" />
              <div className="h-7 bg-gray-200 rounded w-24 mx-auto mt-2" />
            </div>
          ))}
        </div>
      )}

      <BookingFilters
        register={register}
        handleExport={handleExport}
        isExporting={isExporting}
        employees={employees}
        onSearchKeyDown={() => {}}
        selectedCount={selectedBookingIds.length}
        onDeleteSelected={handleDeleteSelected}
        programVariations={programVariations}
      />

      {(showSelectAllBar || isSelectAllAcrossPages) && pagination && (
        <BookingSelectionBanner
          totalCount={pagination.totalCount}
          onSelectAllMatching={handleSelectAllMatching}
        />
      )}

      {isLoadingBookings && !bookingResponse ? (
        <BookingSkeleton />
      ) : (
        <>
          <BookingTable
            bookings={allBookings}
            programs={programs}
            selectedIds={selectedBookingIds}
            onSelectionChange={handleSelectionChange}
            onSelectAllToggle={handleSelectAllToggle}
            isSelectAllOnPage={isHeaderCheckboxChecked}
            onEditBooking={(booking) => openBookingModal(booking)}
            onDeleteBooking={(id) => setBookingToDelete(id)}
            onManagePayments={(booking) => setSelectedForPayment(booking)}
          />

          {pagination && pagination.totalPages > 1 && (
            <PaginationControls
              currentPage={currentPage}
              totalPages={pagination.totalPages}
              onPageChange={(page) => setCurrentPage(page)}
              paginationRange={paginationRange}
            />
          )}

          {allBookings.length === 0 && <BookingEmptyState />}
        </>
      )}

      <BookingPageModals
        programs={programs}
        programId={programId}
        onSaveBooking={handleSaveBooking}
        onSavePayment={handleSavePayment}
        onUpdatePayment={handleUpdatePayment}
        onDeletePayment={handleDeletePayment}
        onConfirmDelete={confirmDeleteAction}
        onExportFlightList={handleFlightListExport}
        onExportNormalList={handleNormalExport}
      />
    </div>
  );
}
