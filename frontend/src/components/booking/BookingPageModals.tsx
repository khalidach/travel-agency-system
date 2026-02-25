import React from "react";
import { useTranslation } from "react-i18next";
import Modal from "../Modal";
import ConfirmationModal from "../modals/ConfirmationModal";
import BookingForm from "../BookingForm";
import PaymentManagementModal from "./PaymentManagementModal";
import { useBookingStore } from "../../store/bookingStore";
import { Payment, Program } from "../../context/models";
// Import the specific type for booking data
import type { BookingSaveData } from "../booking_form/types";

interface BookingPageModalsProps {
  programs: Program[];
  programId?: string;
  // Replaced 'any' with the strictly typed 'BookingSaveData'
  onSaveBooking: (
    bookingData: BookingSaveData,
    initialPayments: Payment[],
  ) => void;
  onSavePayment: (payment: Omit<Payment, "_id" | "id">) => void;
  onUpdatePayment: (
    paymentId: string,
    payment: Omit<Payment, "_id" | "id">,
  ) => void;
  onDeletePayment: (paymentId: string) => void;
  onAddGroupPayment: (payment: Omit<Payment, "_id" | "id">) => void;
  onUpdateGroupPayment: (
    paymentId: string,
    payment: Partial<Payment>,
  ) => void;
  onDeleteGroupPayment: (paymentId: string) => void;
  onConfirmDelete: () => void;
}

const BookingPageModals: React.FC<BookingPageModalsProps> = ({
  programs,
  programId,
  onSaveBooking,
  onSavePayment,
  onUpdatePayment,
  onDeletePayment,
  onAddGroupPayment,
  onUpdateGroupPayment,
  onDeleteGroupPayment,
  onConfirmDelete,
}) => {
  const { t } = useTranslation();
  const store = useBookingStore();

  const selectedCount = store.selectedBookingIds.length;

  return (
    <>
      {/* Booking Form Modal */}
      <Modal
        isOpen={store.isBookingModalOpen}
        onClose={store.closeBookingModal}
        title={store.editingBooking ? t("editBooking") : t("addBooking")}
        size="xl"
      >
        <BookingForm
          booking={store.editingBooking}
          programs={programs}
          onSave={onSaveBooking}
          onCancel={store.closeBookingModal}
          programId={programId}
        />
      </Modal>

      {/* Payment Management Modal */}
      <PaymentManagementModal
        booking={store.selectedBookingForPayment}
        isOpen={!!store.selectedBookingForPayment}
        onClose={() => store.setSelectedForPayment(null)}
        onSavePayment={onSavePayment}
        onUpdatePayment={onUpdatePayment}
        onDeletePayment={onDeletePayment}
        onAddGroupPayment={onAddGroupPayment}
        onUpdateGroupPayment={onUpdateGroupPayment}
        onDeleteGroupPayment={onDeleteGroupPayment}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={!!store.bookingToDelete}
        onClose={() => store.setBookingToDelete(null)}
        onConfirm={onConfirmDelete}
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
    </>
  );
};

export default BookingPageModals;

