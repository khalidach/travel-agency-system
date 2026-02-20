import React from "react";
import { useTranslation } from "react-i18next";
import { Calendar, Plus } from "lucide-react";
import { useBookingStore } from "../../store/bookingStore";

const BookingEmptyState: React.FC = () => {
  const { t } = useTranslation();
  const { openBookingModal } = useBookingStore();

  return (
    <div className="text-center py-12 bg-card rounded-2xl">
      <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
        <Calendar className="w-12 h-12 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-medium text-foreground mb-2">
        {t("noBookingsFound")}
      </h3>
      <p className="text-muted-foreground mb-6">{t("noBookingsLead")}</p>
      <button
        onClick={() => openBookingModal()}
        className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors"
      >
        <Plus className="w-5 h-5 mr-2" />
        {t("addBooking")}
      </button>
    </div>
  );
};

export default BookingEmptyState;
