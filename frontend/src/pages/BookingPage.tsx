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
import BookingForm, { BookingFormData } from "../components/BookingForm";
import PaymentForm from "../components/PaymentForm";
import BookingSummary from "../components/booking/BookingSummary";
import BookingFilters from "../components/booking/BookingFilters";
import BookingTable from "../components/booking/BookingTable";
import { usePagination } from "../hooks/usePagination";
import BookingSkeleton from "../components/skeletons/BookingSkeleton";

// Types and API
import type {
  Booking,
  Payment,
  Program,
  PaginatedResponse,
} from "../context/models";
import * as api from "../services/api";
import { toast } from "react-hot-toast";

type FilterFormData = {
  searchTerm: string;
  sortOrder: string;
  statusFilter: string;
};

export default function BookingPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { programId } = useParams<{ programId: string }>();
  const navigate = useNavigate();

  const { register, watch } = useForm<FilterFormData>({
    defaultValues: {
      searchTerm: "",
      sortOrder: "newest",
      statusFilter: "all",
    },
  });

  const filters = watch();
  const [currentPage, setCurrentPage] = useState(1);
  const bookingsPerPage = 10;

  // Data Fetching
  const { data: bookingResponse, isLoading: isLoadingBookings } = useQuery<
    PaginatedResponse<Booking>
  >({
    queryKey: ["bookings", programId],
    queryFn: () => api.getBookingsByProgram(programId!),
    enabled: !!programId,
  });
  const allBookings = bookingResponse?.data ?? [];

  const { data: programResponse, isLoading: isLoadingPrograms } = useQuery<
    PaginatedResponse<Program>
  >({
    queryKey: ["programs", "all"],
    queryFn: () => api.getPrograms(1, 1000),
  });
  const programs = programResponse?.data ?? [];

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
      queryClient.invalidateQueries({ queryKey: ["programs"] });
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
      queryClient.invalidateQueries({ queryKey: ["programs"] });
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
      setSelectedBookingForPayment(updatedBooking);
      toast.success("Payment deleted!");
    },
    onError: (error: Error) =>
      toast.error(error.message || "Failed to delete payment."),
  });

  const { mutate: importBookings, isPending: isImporting } = useMutation({
    mutationFn: api.importBookings,
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["bookings", programId] });
      queryClient.invalidateQueries({ queryKey: ["programs"] });
      toast.success(result.message);
    },
    onError: (error: Error) => toast.error(error.message || "Import failed."),
    onSettled: () => {
      setImportFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
  });

  // UI State
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [editingPayment, setEditingPayment] = useState<{
    bookingId: number;
    payment: Payment;
  } | null>(null);
  const [selectedBookingForPayment, setSelectedBookingForPayment] =
    useState<Booking | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setCurrentPage(1);
  }, [filters.searchTerm, filters.sortOrder, filters.statusFilter]);

  const filteredBookings = useMemo(() => {
    return allBookings.filter((booking) => {
      const lowerSearchTerm = filters.searchTerm.toLowerCase();
      const matchesSearch =
        booking.clientNameFr.toLowerCase().includes(lowerSearchTerm) ||
        (booking.clientNameAr || "").includes(filters.searchTerm) ||
        booking.passportNumber.toLowerCase().includes(lowerSearchTerm);

      const matchesStatus =
        filters.statusFilter === "all" ||
        (filters.statusFilter === "paid" && booking.isFullyPaid) ||
        (filters.statusFilter === "pending" && !booking.isFullyPaid);

      return matchesSearch && matchesStatus;
    });
  }, [allBookings, filters.searchTerm, filters.statusFilter]);

  const sortedBookings = useMemo(() => {
    const bookingsCopy = [...filteredBookings];
    if (filters.sortOrder === "family") {
      const bookingsMap = new Map(bookingsCopy.map((b) => [b.id, b]));
      const result: (Booking & { isRelated?: boolean })[] = [];
      const processed = new Set<number>();
      bookingsCopy.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      bookingsCopy.forEach((booking) => {
        if (processed.has(booking.id)) return;
        if (booking.relatedPersons && booking.relatedPersons.length > 0) {
          result.push(booking);
          processed.add(booking.id);
          booking.relatedPersons.forEach((relatedInfo) => {
            const relatedBooking = bookingsMap.get(relatedInfo.ID);
            if (relatedBooking && !processed.has(relatedBooking.id)) {
              result.push({ ...relatedBooking, isRelated: true });
              processed.add(relatedBooking.id);
            }
          });
        }
      });
      bookingsCopy.forEach((booking) => {
        if (!processed.has(booking.id)) {
          result.push(booking);
          processed.add(booking.id);
        }
      });
      return result;
    } else if (filters.sortOrder === "oldest") {
      return bookingsCopy.sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
    }
    return bookingsCopy.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [filteredBookings, filters.sortOrder]);

  const currentBookings = useMemo(
    () =>
      sortedBookings.slice(
        (currentPage - 1) * bookingsPerPage,
        currentPage * bookingsPerPage
      ),
    [sortedBookings, currentPage]
  );
  const totalPages = Math.ceil(sortedBookings.length / bookingsPerPage);
  const paginationRange = usePagination({
    currentPage,
    totalCount: sortedBookings.length,
    pageSize: bookingsPerPage,
  });
  const summaryStats = useMemo(() => {
    const stats = {
      totalBookings: filteredBookings.length,
      totalRevenue: 0,
      totalCost: 0,
      totalPaid: 0,
    };
    for (const booking of filteredBookings) {
      stats.totalRevenue += Number(booking.sellingPrice);
      stats.totalCost += Number(booking.basePrice);
      stats.totalPaid += (booking.advancePayments || []).reduce(
        (sum, p) => sum + Number(p.amount),
        0
      );
    }
    return {
      ...stats,
      totalProfit: stats.totalRevenue - stats.totalCost,
      totalRemaining: stats.totalRevenue - stats.totalPaid,
    };
  }, [filteredBookings]);

  // Handlers
  const handleAddBooking = () => {
    setEditingBooking(null);
    setIsBookingModalOpen(true);
  };

  const handleEditBooking = (booking: Booking) => {
    setEditingBooking(booking);
    setIsBookingModalOpen(true);
  };

  const handleDeleteBooking = (bookingId: number) => {
    if (window.confirm("Are you sure you want to delete this booking?")) {
      deleteBooking(bookingId);
    }
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
    if (window.confirm("Are you sure you want to delete this payment?")) {
      deletePayment({ bookingId, paymentId });
    }
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
      const program = programs.find((p) => p.id.toString() === programId);
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
    toast.loading("Generating template...");
    try {
      const blob = await api.exportBookingTemplate();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "Booking_Template.xlsx";
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
    importBookings(importFile);
  };

  if (isLoadingBookings || isLoadingPrograms) {
    return <BookingSkeleton />;
  }

  const selectedProgramDetails = programs.find(
    (p) => p.id.toString() === programId
  );

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
              {selectedProgramDetails?.name || "Bookings"}
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

      {filteredBookings.length > 0 && <BookingSummary stats={summaryStats} />}

      <BookingFilters
        register={register}
        programFilter={programId || "all"}
        handleProgramFilterChange={() => {}} // Not used here, filtering is by URL
        programs={programs.filter((p) => p.id.toString() === programId)} // Only show current
        handleExport={handleExport}
        isExporting={isExporting}
      />

      <BookingTable
        bookings={currentBookings}
        programs={programs}
        onEditBooking={handleEditBooking}
        onDeleteBooking={handleDeleteBooking}
        onManagePayments={handleManagePayments}
      />

      {totalPages > 1 && (
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

      {filteredBookings.length === 0 && !isLoadingBookings && (
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

      {/* Modals */}
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
    </div>
  );
}
