// frontend/src/store/bookingStore.ts
import { create } from "zustand";
import type { Booking } from "../context/models";

// Define the shape of the state and its actions
interface BookingPageState {
  isBookingModalOpen: boolean;
  editingBooking: Booking | null;
  selectedBookingForPayment: Booking | null;
  bookingToDelete: number | null;
  isExporting: boolean;
  importFile: File | null;
  currentPage: number;
  selectedBookingIds: number[];
  isSelectAllAcrossPages: boolean;
}

interface BookingPageActions {
  openBookingModal: (booking?: Booking | null) => void;
  closeBookingModal: () => void;
  setSelectedForPayment: (booking: Booking | null) => void;
  setBookingToDelete: (id: number | null) => void;
  setIsExporting: (isExporting: boolean) => void;
  setImportFile: (file: File | null) => void;
  setCurrentPage: (page: number) => void;
  setSelectedBookingIds: (ids: number[]) => void;
  toggleIdSelection: (id: number) => void;
  clearSelection: () => void;
  setIsSelectAllAcrossPages: (value: boolean) => void;
}

// Define the initial state
const initialState: BookingPageState = {
  isBookingModalOpen: false,
  editingBooking: null,
  selectedBookingForPayment: null,
  bookingToDelete: null,
  isExporting: false,
  importFile: null,
  currentPage: 1,
  selectedBookingIds: [],
  isSelectAllAcrossPages: false,
};

// Create the Zustand store
export const useBookingStore = create<BookingPageState & BookingPageActions>()(
  (set, get) => ({
    ...initialState,

    // --- Actions ---

    openBookingModal: (booking = null) =>
      set({ isBookingModalOpen: true, editingBooking: booking }),

    closeBookingModal: () =>
      set({ isBookingModalOpen: false, editingBooking: null }),

    setSelectedForPayment: (booking) =>
      set({ selectedBookingForPayment: booking }),

    setBookingToDelete: (id) => set({ bookingToDelete: id }),

    setIsExporting: (isExporting) => set({ isExporting }),

    setImportFile: (file) => set({ importFile: file }),

    setCurrentPage: (page) => set({ currentPage: page }),

    setSelectedBookingIds: (ids) => set({ selectedBookingIds: ids }),

    toggleIdSelection: (id) => {
      const { selectedBookingIds } = get();
      const newSelectedIds = selectedBookingIds.includes(id)
        ? selectedBookingIds.filter((selectedId) => selectedId !== id)
        : [...selectedBookingIds, id];
      set({
        selectedBookingIds: newSelectedIds,
        isSelectAllAcrossPages: false,
      });
    },

    clearSelection: () =>
      set({ selectedBookingIds: [], isSelectAllAcrossPages: false }),

    setIsSelectAllAcrossPages: (value) =>
      set({ isSelectAllAcrossPages: value }),
  })
);
