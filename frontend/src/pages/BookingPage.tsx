// frontend/src/pages/BookingPage.tsx
import React, { useMemo, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Calendar, Plus, File, List } from "lucide-react";

// Components and Hooks
import Modal from "../components/Modal";
import ConfirmationModal from "../components/modals/ConfirmationModal";
import BookingForm, { BookingFormData } from "../components/BookingForm";
import BookingSummary from "../components/booking/BookingSummary";
import BookingFilters from "../components/booking/BookingFilters";
import BookingTable from "../components/booking/BookingTable";
import { usePagination } from "../hooks/usePagination";
import BookingSkeleton from "../components/skeletons/BookingSkeleton";
import { useAuthContext } from "../context/AuthContext";
import BookingPageHeader from "../components/booking/BookingPageHeader";
import PaymentManagementModal from "../components/booking/PaymentManagementModal";
import PaginationControls from "../components/booking/PaginationControls";
import { useDebounce } from "../hooks/useDebounce";
import { useBookingStore } from "../store/bookingStore"; // Import the new store

// Types and API
import type {
  Booking,
  Payment,
  Program,
  Employee,
  BookingSummaryStats,
} from "../context/models";
import * as api from "../services/api";
import { toast } from "react-hot-toast";
import { useForm } from "react-hook-form";

interface FilterFormData {
  searchTerm: string;
  sortOrder: string;
  statusFilter: string;
  employeeFilter: string;
  // <NEW CODE>
  variationFilter: string;
  // </NEW CODE>
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
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { programId } = useParams<{ programId: string }>();
  const { state: authState } = useAuthContext();
  const userRole = authState.user?.role;
  const userId = authState.user?.id;
  const user = authState.user;

  // Use the Zustand store for state management
  const {
    isBookingModalOpen,
    editingBooking,
    selectedBookingForPayment,
    bookingToDelete,
    isExporting,
    importFile,
    currentPage,
    selectedBookingIds,
    isSelectAllAcrossPages,
    isExportModalOpen,
    openBookingModal,
    closeBookingModal,
    setSelectedForPayment,
    setBookingToDelete,
    setIsExporting,
    setImportFile,
    setCurrentPage,
    setSelectedBookingIds,
    toggleIdSelection,
    clearSelection,
    setIsSelectAllAcrossPages,
    openExportModal,
    closeExportModal,
  } = useBookingStore();

  const bookingsPerPage = 10;

  const { register, watch } = useForm<FilterFormData>({
    defaultValues: {
      searchTerm: "",
      sortOrder: "newest",
      statusFilter: "all",
      employeeFilter: "all",
      // <NEW CODE>
      variationFilter: "all",
      // </NEW CODE>
    },
  });

  const searchTerm = watch("searchTerm");
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  const sortOrder = watch("sortOrder");
  const statusFilter = watch("statusFilter");
  const employeeFilter = watch("employeeFilter");
  // <NEW CODE>
  const variationFilter = watch("variationFilter");
  // </NEW CODE>

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

  useEffect(() => {
    setCurrentPage(1);
    clearSelection();
  }, [
    debouncedSearchTerm,
    sortOrder,
    statusFilter,
    employeeFilter,
    // <NEW CODE>
    variationFilter,
    // </NEW CODE>
    setCurrentPage,
    clearSelection,
  ]);

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
        // <NEW CODE>
        variationFilter,
        // </NEW CODE>
      ],
      queryFn: () =>
        api.getBookingsByProgram(programId!, {
          page: currentPage,
          limit: bookingsPerPage,
          searchTerm: debouncedSearchTerm,
          sortOrder,
          statusFilter,
          employeeFilter,
          // <NEW CODE>
          variationFilter,
          // </NEW CODE>
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
  // <NEW CODE>
  const programVariations = program?.variations || [];
  // </NEW CODE>

  const { data: employeesData, isLoading: isLoadingEmployees } = useQuery<{
    employees: Employee[];
  }>({
    queryKey: ["employees"],
    queryFn: api.getEmployees,
    enabled: userRole === "admin" || userRole === "manager",
    staleTime: 15 * 60 * 1000,
  });
  const employees = employeesData?.employees ?? [];

  const invalidateAllQueries = () => {
    queryClient.invalidateQueries({ queryKey: ["bookingsByProgram"] });
    queryClient.invalidateQueries({ queryKey: ["allBookingIds"] });
    queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
    queryClient.invalidateQueries({ queryKey: ["profitReport"] });
    queryClient.invalidateQueries({ queryKey: ["programs"] });
    queryClient.invalidateQueries({ queryKey: ["rooms"] });
    queryClient.invalidateQueries({ queryKey: ["unassignedOccupantsSearch"] });
    queryClient.invalidateQueries({ queryKey: ["programsForBooking"] });
    queryClient.invalidateQueries({ queryKey: ["programsForRoomManagement"] });
  };

  const { mutate: createBooking } = useMutation({
    mutationFn: (data: any) => api.createBooking(data),
    onSuccess: (result) => {
      invalidateAllQueries();
      toast.success(result.message || "Booking created!");
      closeBookingModal();
    },
    onError: (error: Error) =>
      toast.error(error.message || "Failed to create booking."),
  });

  const { mutate: updateBooking } = useMutation({
    mutationFn: (data: {
      bookingId: number;
      bookingData: any;
      initialPayments: Payment[];
    }) =>
      api.updateBooking(data.bookingId, {
        ...data.bookingData,
        advancePayments: data.initialPayments,
      }),
    onSuccess: () => {
      invalidateAllQueries();
      toast.success("Booking updated!");
      closeBookingModal();
    },
    onError: (error: Error) =>
      toast.error(error.message || "Failed to update booking."),
  });

  const { mutate: deleteBooking } = useMutation({
    mutationFn: api.deleteBooking,
    onSuccess: () => {
      invalidateAllQueries();
      toast.success("Booking deleted!");
    },
    onError: (error: Error) =>
      toast.error(error.message || "Failed to delete booking."),
  });

  const { mutate: deleteMultipleBookings } = useMutation({
    mutationFn: (data: {
      bookingIds?: number[];
      filters?: api.BookingFilters;
    }) => api.deleteMultipleBookings(data),
    onSuccess: (result) => {
      invalidateAllQueries();
      toast.success(result.message || "Bookings deleted successfully!");
      clearSelection();
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete bookings.");
    },
  });

  const { mutate: addPayment } = useMutation({
    mutationFn: (data: {
      bookingId: number;
      payment: Omit<Payment, "_id" | "id">;
    }) => api.addPayment(data.bookingId, data.payment),
    onSuccess: (updatedBooking) => {
      invalidateAllQueries();
      setSelectedForPayment(updatedBooking);
      toast.success("Payment added!");
    },
    onError: (error: Error) =>
      toast.error(error.message || "Failed to add payment."),
  });

  const { mutate: updatePayment } = useMutation({
    mutationFn: (data: {
      bookingId: number;
      paymentId: string;
      payment: Omit<Payment, "_id" | "id">;
    }) => api.updatePayment(data.bookingId, data.paymentId, data.payment),
    onSuccess: (updatedBooking) => {
      invalidateAllQueries();
      setSelectedForPayment(updatedBooking);
      toast.success("Payment updated!");
    },
    onError: (error: Error) =>
      toast.error(error.message || "Failed to update payment."),
  });

  const { mutate: deletePayment } = useMutation({
    mutationFn: (data: { bookingId: number; paymentId: string }) =>
      api.deletePayment(data.bookingId, data.paymentId),
    onSuccess: (updatedBooking) => {
      invalidateAllQueries();
      setSelectedForPayment(updatedBooking);
      toast.success("Payment deleted!");
    },
    onError: (error: Error) =>
      toast.error(error.message || "Failed to delete payment."),
  });

  const { mutate: importBookings, isPending: isImporting } = useMutation({
    mutationFn: (file: File) => api.importBookings(file, programId!),
    onSuccess: (result) => {
      invalidateAllQueries();
      toast.success(result.message);
    },
    onError: (error: Error) => toast.error(error.message || "Import failed."),
    onSettled: () => setImportFile(null),
  });

  const paginationRange = usePagination({
    currentPage,
    totalCount: pagination?.totalCount ?? 0,
    pageSize: bookingsPerPage,
  });

  const handleSaveBooking = (bookingData: any, initialPayments: Payment[]) => {
    if (editingBooking) {
      const { clients, ...restOfData } = bookingData;
      const singleClientData = clients && clients.length > 0 ? clients[0] : {};
      updateBooking({
        bookingId: editingBooking.id,
        bookingData: { ...singleClientData, ...restOfData },
        initialPayments,
      });
    } else {
      createBooking(bookingData);
    }
  };

  const handleSavePayment = (payment: Omit<Payment, "_id" | "id">) => {
    if (selectedBookingForPayment) {
      addPayment({ bookingId: selectedBookingForPayment.id, payment });
    }
  };

  const handleUpdatePayment = (
    paymentId: string,
    payment: Omit<Payment, "_id" | "id">
  ) => {
    if (selectedBookingForPayment) {
      updatePayment({
        bookingId: selectedBookingForPayment.id,
        paymentId,
        payment,
      });
    }
  };

  const handleDeletePayment = (paymentId: string) => {
    if (selectedBookingForPayment) {
      deletePayment({ bookingId: selectedBookingForPayment.id, paymentId });
    }
  };

  const handleNormalExport = async () => {
    if (!programId || isExporting) return;
    setIsExporting(true);
    closeExportModal();
    toast.loading("Exporting Normal List...");
    try {
      const blob = await api.exportBookingsToExcel(programId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = program
        ? `${program.name.replace(/\s/g, "_")}_bookings.xlsx`
        : "bookings.xlsx";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.dismiss();
      toast.success("Normal List export successful!");
    } catch (error) {
      toast.dismiss();
      toast.error((error as Error).message || "Failed to export.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleFlightListExport = async () => {
    if (!programId || isExporting) return;
    setIsExporting(true);
    closeExportModal();
    toast.loading("Exporting Flight List...");
    try {
      const blob = await api.exportFlightListToExcel(programId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = program
        ? `${program.name.replace(/\s/g, "_")}_flight_list.xlsx`
        : "flight_list.xlsx";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.dismiss();
      toast.success("Flight List export successful!");
    } catch (error) {
      toast.dismiss();
      toast.error((error as Error).message || "Failed to export.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleExport = () => {
    if (hasFlightListExportAccess) {
      openExportModal();
    } else {
      handleNormalExport();
    }
  };

  const handleExportTemplate = async () => {
    if (!programId) return;
    toast.loading("Generating template...");
    try {
      const blob = await api.exportBookingTemplateForProgram(programId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = program
        ? `${program.name.replace(/\s/g, "_")}_Template.xlsx`
        : "Booking_Template.xlsx";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.dismiss();
      toast.success("Template downloaded!");
    } catch (error) {
      toast.dismiss();
      toast.error("Failed to download template.");
    }
  };

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

  const selectableBookingIdsOnPage = useMemo(() => {
    if (userRole === "admin") {
      return allBookings.map((b) => b.id);
    }
    return allBookings.filter((b) => b.employeeId === userId).map((b) => b.id);
  }, [allBookings, userRole, userId]);

  const isPageSelected = useMemo(() => {
    if (selectableBookingIdsOnPage.length === 0) {
      return false;
    }
    return selectableBookingIdsOnPage.every((id) =>
      selectedBookingIds.includes(id)
    );
  }, [selectableBookingIdsOnPage, selectedBookingIds]);

  const isHeaderCheckboxChecked = isPageSelected || isSelectAllAcrossPages;

  const handleClearAllSelection = () => {
    clearSelection();
  };

  const handleSelectAllMatching = async () => {
    const queryKey = [
      "allBookingIds",
      programId,
      debouncedSearchTerm,
      statusFilter,
      employeeFilter,
      // <NEW CODE>
      variationFilter,
      // </NEW CODE>
    ];
    try {
      const data = await queryClient.fetchQuery<{ ids: number[] }>({
        queryKey,
        queryFn: () =>
          api.getBookingIdsByProgram(programId!, {
            searchTerm: debouncedSearchTerm,
            statusFilter,
            employeeFilter,
            // <NEW CODE>
            variationFilter,
            // </NEW CODE>
          }),
        staleTime: 1000 * 60 * 5, // Cache for 5 minutes
      });

      if (data && data.ids) {
        setSelectedBookingIds(data.ids);
        setIsSelectAllAcrossPages(true);
      }
    } catch (error) {
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
      handleClearAllSelection();
    }
  };

  const handleDeleteSelected = () => {
    setBookingToDelete(-999);
  };

  const confirmDeleteAction = () => {
    if (isSelectAllAcrossPages) {
      deleteMultipleBookings({
        filters: {
          programId: programId!,
          searchTerm: debouncedSearchTerm,
          statusFilter,
          employeeFilter,
          // <NEW CODE>
          variationFilter,
          // </NEW CODE>
        },
      });
    } else if (selectedBookingIds.length > 0) {
      deleteMultipleBookings({ bookingIds: selectedBookingIds });
    } else if (bookingToDelete) {
      deleteBooking(bookingToDelete);
    }
    setBookingToDelete(null);
    setIsSelectAllAcrossPages(false);
  };

  if (isLoadingProgram || isLoadingEmployees) {
    return <BookingSkeleton />;
  }

  const selectedCount = selectedBookingIds.length;
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
        selectedCount={selectedCount}
        onDeleteSelected={handleDeleteSelected}
        // <NEW CODE>
        programVariations={programVariations}
        // </NEW CODE>
      />

      {(showSelectAllBar || isSelectAllAcrossPages) && pagination ? (
        <div
          className="bg-blue-100 border-l-4 border-blue-500 text-blue-800 p-4 my-4 rounded-r-lg"
          role="alert"
        >
          {isSelectAllAcrossPages ? (
            <p>
              {t("allSelectedNotification", { count: selectedCount })}
              <button
                onClick={handleClearAllSelection}
                className="font-bold underline ml-2 hover:text-blue-900"
              >
                {t("clearSelection")}
              </button>
            </p>
          ) : (
            <p>
              {t("pageSelectionNotification", { count: selectedCount })}
              <button
                onClick={handleSelectAllMatching}
                className="font-bold underline ml-2 hover:text-blue-900"
              >
                {t("selectAllMatching", { total: pagination.totalCount })}
              </button>
            </p>
          )}
        </div>
      ) : null}

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

          {allBookings.length === 0 && (
            <div className="text-center py-12 bg-white rounded-2xl">
              <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Calendar className="w-12 h-12 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {t("noBookingsFound")}
              </h3>
              <p className="text-gray-500 mb-6">{t("noBookingsLead")}</p>
              <button
                onClick={() => openBookingModal()}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
              >
                <Plus
                  className={`w-5 h-5 ${
                    document.documentElement.dir === "rtl" ? "ml-2" : "mr-2"
                  }`}
                />
                {t("addBooking")}
              </button>
            </div>
          )}
        </>
      )}

      <Modal
        isOpen={isBookingModalOpen}
        onClose={() => closeBookingModal()}
        title={editingBooking ? t("editBooking") : t("addBooking")}
        size="xl"
      >
        <BookingForm
          booking={editingBooking}
          programs={programs}
          onSave={handleSaveBooking}
          onCancel={() => closeBookingModal()}
          programId={programId}
        />
      </Modal>

      <PaymentManagementModal
        booking={selectedBookingForPayment}
        isOpen={!!selectedBookingForPayment}
        onClose={() => setSelectedForPayment(null)}
        onSavePayment={handleSavePayment}
        onUpdatePayment={handleUpdatePayment}
        onDeletePayment={handleDeletePayment}
      />

      <ConfirmationModal
        isOpen={!!bookingToDelete}
        onClose={() => setBookingToDelete(null)}
        onConfirm={confirmDeleteAction}
        title={
          selectedCount > 1
            ? "Delete Selected Bookings"
            : t("deleteBookingTitle")
        }
        message={
          selectedCount > 1
            ? `Are you sure you want to delete ${selectedCount} booking(s)? This action cannot be undone.`
            : t("deleteBookingMessage")
        }
      />

      <Modal
        isOpen={isExportModalOpen}
        onClose={() => closeExportModal()}
        title="Choose Export Format"
        size="sm"
      >
        <div className="space-y-4">
          <button
            onClick={handleFlightListExport}
            className="w-full inline-flex items-center justify-center px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors shadow-sm"
          >
            <File className="mr-2 h-5 w-5" />
            Flight List
          </button>
          <button
            onClick={handleNormalExport}
            className="w-full inline-flex items-center justify-center px-4 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors shadow-sm"
          >
            <List className="mr-2 h-5 w-5" />
            Normal List
          </button>
        </div>
      </Modal>
    </div>
  );
}
