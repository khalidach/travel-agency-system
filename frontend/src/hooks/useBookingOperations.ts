import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import * as api from "../services/api";
import { Payment, Program, Booking } from "../context/models";
import { useBookingStore } from "../store/bookingStore";

interface UseBookingOperationsProps {
  programId?: string;
  program?: Program;
  filters: {
    searchTerm: string;
    statusFilter: string;
    employeeFilter: string;
    variationFilter: string;
  };
}

// Define a type for the data coming from the form
// This replaces 'any' and accommodates the flexible structure of the form state
interface BookingSubmissionData extends Partial<Booking> {
  clients?: Partial<Booking>[];
  [key: string]: unknown; // Allow for other potential form fields
}

export const useBookingOperations = ({
  programId,
  program,
  filters,
}: UseBookingOperationsProps) => {
  const queryClient = useQueryClient();
  const store = useBookingStore();

  const invalidateAllQueries = () => {
    queryClient.invalidateQueries({ queryKey: ["bookingsByProgram"] });
    queryClient.invalidateQueries({ queryKey: ["bookingsByProgramTotalSummary"] });
    queryClient.invalidateQueries({ queryKey: ["allBookingIds"] });
    queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
    queryClient.invalidateQueries({ queryKey: ["profitReport"] });
    queryClient.invalidateQueries({ queryKey: ["programs"] });
    queryClient.invalidateQueries({ queryKey: ["rooms"] });
    queryClient.invalidateQueries({ queryKey: ["unassignedOccupantsSearch"] });
    queryClient.invalidateQueries({ queryKey: ["programsForBooking"] });
    queryClient.invalidateQueries({ queryKey: ["programsForRoomManagement"] });
  };

  // --- Booking Mutations ---

  const { mutate: createBooking } = useMutation({
    mutationFn: (data: BookingSubmissionData) => api.createBooking(data),
    onSuccess: (result) => {
      invalidateAllQueries();
      toast.success(result.message || "Booking created!");
      store.closeBookingModal();
    },
    onError: (error: Error) =>
      toast.error(error.message || "Failed to create booking."),
  });

  const { mutate: updateBooking } = useMutation({
    mutationFn: (data: {
      bookingId: number;
      bookingData: BookingSubmissionData;
      initialPayments: Payment[];
    }) =>
      api.updateBooking(data.bookingId, {
        ...data.bookingData,
        advancePayments: data.initialPayments,
      }),
    onSuccess: () => {
      invalidateAllQueries();
      toast.success("Booking updated!");
      store.closeBookingModal();
    },
    onError: (error: Error) =>
      toast.error(error.message || "Failed to update booking."),
  });

  const { mutate: deleteBooking } = useMutation({
    mutationFn: api.deleteBooking,
    onSuccess: () => {
      invalidateAllQueries();
      toast.success("Booking deleted!");
      store.setBookingToDelete(null);
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
      store.clearSelection();
      store.setIsSelectAllAcrossPages(false);
      store.setBookingToDelete(null);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete bookings.");
    },
  });

  // --- Payment Mutations ---

  const { mutate: addPayment } = useMutation({
    mutationFn: (data: {
      bookingId: number;
      payment: Omit<Payment, "_id" | "id">;
    }) => api.addPayment(data.bookingId, data.payment),
    onSuccess: (updatedBooking) => {
      invalidateAllQueries();
      store.setSelectedForPayment(updatedBooking);
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
      store.setSelectedForPayment(updatedBooking);
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
      store.setSelectedForPayment(updatedBooking);
      toast.success("Payment deleted!");
    },
    onError: (error: Error) =>
      toast.error(error.message || "Failed to delete payment."),
  });

  // --- Import/Export ---

  const { mutate: importBookings, isPending: isImporting } = useMutation({
    mutationFn: (file: File) => api.importBookings(file, programId!),
    onSuccess: (result) => {
      invalidateAllQueries();
      toast.success(result.message);
    },
    onError: (error: Error) => toast.error(error.message || "Import failed."),
    onSettled: () => store.setImportFile(null),
  });

  // --- Handlers ---

  const handleSaveBooking = (
    bookingData: BookingSubmissionData,
    initialPayments: Payment[],
  ) => {
    if (store.editingBooking) {
      const { clients, ...restOfData } = bookingData;
      // Ensure we extract a single client data object if clients array exists
      const singleClientData = clients && clients.length > 0 ? clients[0] : {};

      updateBooking({
        bookingId: store.editingBooking.id,
        bookingData: { ...singleClientData, ...restOfData },
        initialPayments,
      });
    } else {
      createBooking(bookingData);
    }
  };

  const handleSavePayment = (payment: Omit<Payment, "_id" | "id">) => {
    if (store.selectedBookingForPayment) {
      addPayment({ bookingId: store.selectedBookingForPayment.id, payment });
    }
  };

  const handleUpdatePayment = (
    paymentId: string,
    payment: Omit<Payment, "_id" | "id">,
  ) => {
    if (store.selectedBookingForPayment) {
      updatePayment({
        bookingId: store.selectedBookingForPayment.id,
        paymentId,
        payment,
      });
    }
  };

  const handleDeletePayment = (paymentId: string) => {
    if (store.selectedBookingForPayment) {
      deletePayment({
        bookingId: store.selectedBookingForPayment.id,
        paymentId,
      });
    }
  };

  const confirmDeleteAction = () => {
    if (store.isSelectAllAcrossPages) {
      deleteMultipleBookings({
        filters: {
          programId: programId!,
          ...filters,
        },
      });
    } else if (store.selectedBookingIds.length > 0) {
      deleteMultipleBookings({ bookingIds: store.selectedBookingIds });
    } else if (store.bookingToDelete) {
      deleteBooking(store.bookingToDelete);
    }
  };

  const handleExport = async () => {
    if (!programId || store.isExporting) return;
    store.setIsExporting(true);
    toast.loading("Exporting...");
    try {
      const blob = await api.exportCombinedToExcel(programId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = program
        ? `${program.name.replace(/\s/g, "_")}_export.xlsx`
        : "export.xlsx";
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
      store.setIsExporting(false);
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
    } catch (_error) {
      toast.dismiss();
      toast.error("Failed to download template.");
    }
  };

  return {
    isImporting,
    importBookings,
    handleSaveBooking,
    handleSavePayment,
    handleUpdatePayment,
    handleDeletePayment,
    confirmDeleteAction,
    handleExport,
    handleExportTemplate,
  };
};

