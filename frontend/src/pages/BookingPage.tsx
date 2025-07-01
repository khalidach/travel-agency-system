// frontend/src/pages/BookingPage.tsx
import React, { useState, useMemo, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import {
  Plus,
  CreditCard,
  Edit2,
  Trash2,
  Download,
  Upload,
  ChevronLeft,
  ChevronRight,
  Calendar,
} from "lucide-react";

// Components and Hooks
import Modal from "../components/Modal";
import ConfirmationModal from "../components/modals/ConfirmationModal";
import BookingForm, { BookingFormData } from "../components/BookingForm";
import PaymentForm from "../components/PaymentForm";
import BookingSummary from "../components/booking/BookingSummary";
import BookingFilters from "../components/booking/BookingFilters";
import BookingTable from "../components/booking/BookingTable";
import { usePagination } from "../hooks/usePagination";
import BookingSkeleton from "../components/skeletons/BookingSkeleton";
import { useAuthContext } from "../context/AuthContext";

// Types and API
import type { Booking, Payment, Program, Employee } from "../context/models";
import * as api from "../services/api";
import { toast } from "react-hot-toast";

type FilterFormData = {
  searchTerm: string;
  sortOrder: string;
  statusFilter: string;
  employeeFilter: string;
};

type ConfirmationState = {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
};

// The API response for bookings is now simpler
interface BookingResponse {
  data: Booking[];
  pagination: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
  };
}

// NEW type for the stats response
interface BookingStatsResponse {
  totalBookings: number;
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
  totalPaid: number;
  totalRemaining: number;
}

export default function BookingPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { programId } = useParams<{ programId: string }>();
  const navigate = useNavigate();
  const { state: authState } = useAuthContext();
  const userRole = authState.user?.role;

  // State Management
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [editingPayment, setEditingPayment] = useState<{
    bookingId: number;
    payment: Payment;
  } | null>(null);
  const [selectedBookingForPayment, setSelectedBookingForPayment] =
    useState<Booking | null>(null);
  const [confirmationState, setConfirmationState] =
    useState<ConfirmationState | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const bookingsPerPage = 10;

  const { register, watch, getValues } = useForm<FilterFormData>({
    defaultValues: {
      searchTerm: "",
      sortOrder: "newest",
      statusFilter: "all",
      employeeFilter: "all",
    },
  });

  const [submittedSearchTerm, setSubmittedSearchTerm] = useState("");
  const sortOrder = watch("sortOrder");
  const statusFilter = watch("statusFilter");
  const employeeFilter = watch("employeeFilter");

  useEffect(() => {
    setCurrentPage(1);
  }, [submittedSearchTerm, sortOrder, statusFilter, employeeFilter]);

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      setSubmittedSearchTerm(getValues("searchTerm"));
    }
  };

  // --- Data Fetching ---

  // Query 1: Fetches bookings. If sorting by family, it fetches all bookings to process relationships correctly.
  // Otherwise, it fetches a paginated list.
  const { data: bookingResponse, isLoading: isLoadingBookings } =
    useQuery<BookingResponse>({
      queryKey: [
        "bookings",
        programId,
        sortOrder === "family" ? "all" : currentPage, // Change query key for family sort
        submittedSearchTerm,
        sortOrder,
        statusFilter,
        employeeFilter,
      ],
      queryFn: () =>
        api.getBookingsByProgram(programId!, {
          page: sortOrder === "family" ? 1 : currentPage,
          limit: sortOrder === "family" ? 9999 : bookingsPerPage, // Fetch all for family sort
          searchTerm: submittedSearchTerm,
          sortOrder,
          statusFilter,
          employeeFilter,
        }),
      enabled: !!programId,
    });

  // Query 2: Fetches the summary statistics. This might be slower but runs in parallel.
  const { data: summaryStats, isLoading: isLoadingStats } =
    useQuery<BookingStatsResponse>({
      queryKey: [
        "bookingStats",
        programId,
        submittedSearchTerm,
        statusFilter,
        employeeFilter,
      ],
      queryFn: () =>
        api.getBookingStatsByProgram(programId!, {
          searchTerm: submittedSearchTerm,
          statusFilter,
          employeeFilter,
        }),
      enabled: !!programId,
    });

  const allBookings = bookingResponse?.data ?? [];
  const totalBookingCount =
    sortOrder === "family"
      ? allBookings.length
      : bookingResponse?.pagination?.totalCount ?? 0;
  const totalPages = Math.ceil(totalBookingCount / bookingsPerPage);

  // Process bookings for family grouping and apply pagination
  const processedBookings = useMemo(() => {
    const bookingsToProcess = allBookings;

    if (sortOrder !== "family" || bookingsToProcess.length === 0) {
      // For non-family sort, the API handles pagination.
      // Just ensure the isRelated flag is set to false.
      return bookingsToProcess.map((b) => ({ ...b, isRelated: false }));
    }

    // For family sort, we have all bookings. We process them and then paginate on the client-side.
    const bookingsMap = new Map(bookingsToProcess.map((b) => [b.id, b]));
    const memberIds = new Set<number>();

    // First, identify all bookings that are members of a family across all data
    bookingsToProcess.forEach((booking) => {
      if (booking.relatedPersons && booking.relatedPersons.length > 0) {
        booking.relatedPersons.forEach((person) => {
          memberIds.add(person.ID);
        });
      }
    });

    // The backend sorts by phoneNumber, which groups families.
    // This frontend logic re-orders to ensure the leader is always first, which is more robust.
    const leadersAndIndividuals = bookingsToProcess.filter(
      (booking) => !memberIds.has(booking.id)
    );

    const finalList: (Booking & { isRelated?: boolean })[] = [];

    leadersAndIndividuals.forEach((leader) => {
      finalList.push({ ...leader, isRelated: false });

      if (leader.relatedPersons && leader.relatedPersons.length > 0) {
        leader.relatedPersons.forEach((person) => {
          const memberBooking = bookingsMap.get(person.ID);
          if (memberBooking) {
            finalList.push({ ...memberBooking, isRelated: true });
          }
        });
      }
    });

    // Manually paginate the fully processed and sorted list
    const start = (currentPage - 1) * bookingsPerPage;
    const end = start + bookingsPerPage;
    return finalList.slice(start, end);
  }, [allBookings, sortOrder, currentPage, bookingsPerPage]);

  const { data: program, isLoading: isLoadingProgram } = useQuery<Program>({
    queryKey: ["program", programId],
    queryFn: () => api.getProgramById(programId!),
    enabled: !!programId,
  });
  const programs = program ? [program] : [];

  const { data: employeesData, isLoading: isLoadingEmployees } = useQuery<{
    employees: Employee[];
  }>({
    queryKey: ["employees"],
    queryFn: api.getEmployees,
    enabled: userRole === "admin" || userRole === "manager",
  });
  const employees = employeesData?.employees ?? [];

  // Mutations
  const { mutate: createBooking } = useMutation({
    mutationFn: (data: {
      bookingData: BookingFormData;
      initialPayments: Payment[];
    }) =>
      api.createBooking({
        ...data.bookingData,
        advancePayments: data.initialPayments,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookings", programId] });
      queryClient.invalidateQueries({ queryKey: ["bookingStats", programId] });
      queryClient.invalidateQueries({ queryKey: ["programs"] });
      queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
      queryClient.invalidateQueries({ queryKey: ["profitReport"] });
      toast.success("Booking created!");
      setIsBookingModalOpen(false);
    },
    onError: (error: Error) =>
      toast.error(error.message || "Failed to create booking."),
  });

  const { mutate: updateBooking } = useMutation({
    mutationFn: (data: {
      bookingId: number;
      bookingData: BookingFormData;
      initialPayments: Payment[];
    }) =>
      api.updateBooking(data.bookingId, {
        ...data.bookingData,
        advancePayments: data.initialPayments,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookings", programId] });
      queryClient.invalidateQueries({ queryKey: ["bookingStats", programId] });
      queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
      queryClient.invalidateQueries({ queryKey: ["profitReport"] });
      toast.success("Booking updated!");
      setIsBookingModalOpen(false);
      setEditingBooking(null);
    },
    onError: (error: Error) =>
      toast.error(error.message || "Failed to update booking."),
  });

  const { mutate: deleteBooking } = useMutation({
    mutationFn: api.deleteBooking,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookings", programId] });
      queryClient.invalidateQueries({ queryKey: ["bookingStats", programId] });
      queryClient.invalidateQueries({ queryKey: ["programs"] });
      queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
      queryClient.invalidateQueries({ queryKey: ["profitReport"] });
      toast.success("Booking deleted!");
    },
    onError: (error: Error) =>
      toast.error(error.message || "Failed to delete booking."),
  });

  const { mutate: addPayment } = useMutation({
    mutationFn: (data: {
      bookingId: number;
      payment: Omit<Payment, "_id" | "id">;
    }) => api.addPayment(data.bookingId, data.payment),
    onSuccess: (updatedBooking) => {
      queryClient.invalidateQueries({ queryKey: ["bookings", programId] });
      queryClient.invalidateQueries({ queryKey: ["bookingStats", programId] });
      queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
      queryClient.invalidateQueries({ queryKey: ["profitReport"] });
      setSelectedBookingForPayment(updatedBooking);
      toast.success("Payment added!");
      setIsPaymentModalOpen(false);
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
      queryClient.invalidateQueries({ queryKey: ["bookings", programId] });
      queryClient.invalidateQueries({ queryKey: ["bookingStats", programId] });
      queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
      queryClient.invalidateQueries({ queryKey: ["profitReport"] });
      setSelectedBookingForPayment(updatedBooking);
      toast.success("Payment updated!");
      setIsPaymentModalOpen(false);
      setEditingPayment(null);
    },
    onError: (error: Error) =>
      toast.error(error.message || "Failed to update payment."),
  });

  const { mutate: deletePayment } = useMutation({
    mutationFn: (data: { bookingId: number; paymentId: string }) =>
      api.deletePayment(data.bookingId, data.paymentId),
    onSuccess: (updatedBooking) => {
      queryClient.invalidateQueries({ queryKey: ["bookings", programId] });
      queryClient.invalidateQueries({ queryKey: ["bookingStats", programId] });
      queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
      queryClient.invalidateQueries({ queryKey: ["profitReport"] });
      setSelectedBookingForPayment(updatedBooking);
      toast.success("Payment deleted!");
    },
    onError: (error: Error) =>
      toast.error(error.message || "Failed to delete payment."),
  });

  const { mutate: importBookings, isPending: isImporting } = useMutation({
    mutationFn: (file: File) => api.importBookings(file, programId!),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["bookings", programId] });
      queryClient.invalidateQueries({ queryKey: ["bookingStats", programId] });
      queryClient.invalidateQueries({ queryKey: ["programs"] });
      queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
      queryClient.invalidateQueries({ queryKey: ["profitReport"] });
      toast.success(result.message);
    },
    onError: (error: Error) => toast.error(error.message || "Import failed."),
    onSettled: () => {
      setImportFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
  });

  const paginationRange = usePagination({
    currentPage,
    totalCount: totalBookingCount,
    pageSize: bookingsPerPage,
  });

  const handleAddBooking = () => {
    setEditingBooking(null);
    setIsBookingModalOpen(true);
  };

  const handleEditBooking = (booking: Booking) => {
    setEditingBooking(booking);
    setIsBookingModalOpen(true);
  };

  const handleDeleteBooking = (bookingId: number) => {
    setConfirmationState({
      isOpen: true,
      title: "Delete Booking",
      message:
        "Are you sure you want to delete this booking? This action cannot be undone.",
      onConfirm: () => deleteBooking(bookingId),
    });
  };

  const handleSaveBooking = (
    bookingData: BookingFormData,
    initialPayments: Payment[]
  ) => {
    if (editingBooking) {
      updateBooking({
        bookingId: editingBooking.id,
        bookingData,
        initialPayments,
      });
    } else {
      createBooking({ bookingData, initialPayments });
    }
  };

  const handleManagePayments = (booking: Booking) => {
    setSelectedBookingForPayment(booking);
  };

  const handleAddPayment = (booking: Booking) => {
    setSelectedBookingForPayment(booking);
    setEditingPayment(null);
    setIsPaymentModalOpen(true);
  };

  const handleEditPayment = (booking: Booking, payment: Payment) => {
    setSelectedBookingForPayment(booking);
    setEditingPayment({ bookingId: booking.id, payment });
    setIsPaymentModalOpen(true);
  };

  const handleSavePayment = (payment: Omit<Payment, "_id" | "id">) => {
    if (selectedBookingForPayment) {
      if (editingPayment) {
        updatePayment({
          bookingId: selectedBookingForPayment.id,
          paymentId: editingPayment.payment._id,
          payment,
        });
      } else {
        addPayment({ bookingId: selectedBookingForPayment.id, payment });
      }
    }
  };

  const handleDeletePayment = (bookingId: number, paymentId: string) => {
    setConfirmationState({
      isOpen: true,
      title: "Delete Payment",
      message:
        "Are you sure you want to delete this payment? This action cannot be undone.",
      onConfirm: () => deletePayment({ bookingId, paymentId }),
    });
  };

  const handleExport = async () => {
    if (!programId || isExporting) {
      toast.error("A program must be selected for export.");
      return;
    }
    setIsExporting(true);
    toast.loading("Exporting to Excel...");
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
      toast.success("Export successful!");
    } catch (error) {
      toast.dismiss();
      toast.error((error as Error).message || "Failed to export.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportTemplate = async () => {
    if (!programId) {
      toast.error("A program must be selected to download a template.");
      return;
    }
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
    if (!importFile) {
      toast.error("Please select a file to import.");
      return;
    }
    if (!programId) {
      toast.error("A program must be selected for import.");
      return;
    }
    importBookings(importFile);
  };

  if (
    isLoadingBookings ||
    isLoadingProgram ||
    (userRole !== "employee" && isLoadingEmployees)
  ) {
    return <BookingSkeleton />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/booking")}
            className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-gray-700" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {program?.name || "Bookings"}
            </h1>
            <p className="text-gray-600 mt-1">
              Manage all customer bookings and payments for this program.
            </p>
          </div>
        </div>
        <div className="mt-4 sm:mt-0 flex items-center gap-x-3">
          <button
            onClick={handleExportTemplate}
            className="inline-flex items-center px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors shadow-sm"
          >
            <Download className="w-5 h-5 mr-2" />
            Download Template
          </button>
          <input
            type="file"
            accept=".xlsx"
            ref={fileInputRef}
            onChange={handleFileSelect}
            style={{ display: "none" }}
          />
          {importFile ? (
            <button
              onClick={handleImport}
              disabled={isImporting}
              className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors shadow-sm disabled:bg-gray-400"
            >
              <Upload className="w-5 h-5 mr-2" />
              {isImporting ? "Uploading..." : "Upload File"}
            </button>
          ) : (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors shadow-sm"
            >
              <Upload className="w-5 h-5 mr-2" />
              Import
            </button>
          )}
          <button
            onClick={handleAddBooking}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Plus className="w-5 h-5 mr-2" />
            {t("addBooking")}
          </button>
        </div>
      </div>

      {summaryStats && !isLoadingStats ? (
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
        onSearchKeyDown={handleSearchKeyDown}
      />

      <BookingTable
        bookings={processedBookings}
        programs={programs}
        onEditBooking={handleEditBooking}
        onDeleteBooking={handleDeleteBooking}
        onManagePayments={handleManagePayments}
      />

      {totalBookingCount > 0 && totalPages > 1 && (
        <div className="flex justify-between items-center py-3 px-6 border-t border-gray-200 bg-white rounded-b-2xl">
          <button
            onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
            disabled={currentPage === 1}
            className="inline-flex items-center px-3 py-1 text-sm bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Previous
          </button>
          <div className="flex items-center space-x-1">
            {paginationRange.map((page, i) =>
              typeof page === "string" ? (
                <span key={i} className="px-3 py-1 text-sm text-gray-400">
                  ...
                </span>
              ) : (
                <button
                  key={i}
                  onClick={() => setCurrentPage(page)}
                  className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                    currentPage === page
                      ? "bg-blue-600 text-white font-bold shadow-sm"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {page}
                </button>
              )
            )}
          </div>
          <button
            onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="inline-flex items-center px-3 py-1 text-sm bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
            <ChevronRight className="w-4 h-4 ml-1" />
          </button>
        </div>
      )}

      {allBookings.length === 0 && !isLoadingBookings && (
        <div className="text-center py-12 bg-white rounded-2xl">
          <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Calendar className="w-12 h-12 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No bookings found for this program
          </h3>
          <p className="text-gray-500 mb-6">
            Get started by creating the first booking.
          </p>
          <button
            onClick={handleAddBooking}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-5 h-5 mr-2" />
            {t("addBooking")}
          </button>
        </div>
      )}
      <Modal
        isOpen={isBookingModalOpen}
        onClose={() => {
          setIsBookingModalOpen(false);
          setEditingBooking(null);
        }}
        title={editingBooking ? "Edit Booking" : t("addBooking")}
        size="xl"
      >
        <BookingForm
          booking={editingBooking}
          programs={programs}
          onSave={handleSaveBooking}
          onCancel={() => {
            setIsBookingModalOpen(false);
            setEditingBooking(null);
          }}
          programId={programId}
        />
      </Modal>
      <Modal
        isOpen={isPaymentModalOpen}
        onClose={() => {
          setIsPaymentModalOpen(false);
          setEditingPayment(null);
        }}
        title={editingPayment ? t("editPayment") : t("addPayment")}
        size="md"
        level={1}
      >
        {selectedBookingForPayment && (
          <PaymentForm
            payment={editingPayment?.payment}
            onSave={handleSavePayment}
            onCancel={() => {
              setIsPaymentModalOpen(false);
              setEditingPayment(null);
            }}
            remainingBalance={selectedBookingForPayment.remainingBalance || 0}
          />
        )}
      </Modal>
      <Modal
        isOpen={!!selectedBookingForPayment && !isPaymentModalOpen}
        onClose={() => setSelectedBookingForPayment(null)}
        title={t("managePayments")}
        size="xl"
        level={0}
      >
        {selectedBookingForPayment && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900">
                {selectedBookingForPayment.clientNameFr}
              </h3>
              <button
                onClick={() => handleAddPayment(selectedBookingForPayment)}
                className="inline-flex items-center px-3 py-1 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
              >
                <CreditCard className="w-4 h-4 mr-2" />
                {t("addPayment")}
              </button>
            </div>
            <div
              className="space-y-3"
              key={(selectedBookingForPayment.advancePayments || []).length}
            >
              {(selectedBookingForPayment.advancePayments || []).map(
                (payment) => (
                  <div
                    key={`${payment._id}-${payment.amount}`}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div>
                      <div className="flex items-center">
                        <span className="text-sm text-gray-900">
                          {Number(payment.amount).toLocaleString()} MAD
                        </span>
                        <span className="mx-2 text-gray-400">•</span>
                        <span className="text-sm text-gray-600 capitalize">
                          {payment.method}
                        </span>
                        <span className="mx-2 text-gray-400">•</span>
                        <span className="text-sm text-gray-600">
                          {new Date(payment.date).toLocaleDateString()}
                        </span>
                      </div>
                      {payment.method === "cheque" && payment.chequeNumber && (
                        <div className="text-sm text-gray-500 mt-1">
                          <span className="font-medium">
                            Check #{payment.chequeNumber}
                          </span>
                          {payment.bankName && (
                            <span> • {payment.bankName}</span>
                          )}
                          {payment.chequeCashingDate && (
                            <span>
                              {" "}
                              • Cashing:{" "}
                              {new Date(
                                payment.chequeCashingDate
                              ).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() =>
                          handleEditPayment(selectedBookingForPayment, payment)
                        }
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() =>
                          handleDeletePayment(
                            selectedBookingForPayment.id,
                            payment._id
                          )
                        }
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )
              )}
              {(!selectedBookingForPayment.advancePayments ||
                selectedBookingForPayment.advancePayments.length === 0) && (
                <div className="text-center py-8 text-gray-500">
                  No payments recorded yet
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {confirmationState?.isOpen && (
        <ConfirmationModal
          isOpen={confirmationState.isOpen}
          onClose={() => setConfirmationState(null)}
          onConfirm={confirmationState.onConfirm}
          title={confirmationState.title}
          message={confirmationState.message}
        />
      )}
    </div>
  );
}
