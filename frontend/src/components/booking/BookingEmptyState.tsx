import React from "react";
import { useTranslation } from "react-i18next";
import { Calendar, Plus } from "lucide-react";
import { useBookingStore } from "../../store/bookingStore";

const BookingEmptyState: React.FC = () => {
  const { t } = useTranslation();
  const { openBookingModal } = useBookingStore();

  return (
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
        <Plus className={`w-5 h-5 mr-2`} />
        {t("addBooking")}
      </button>
    </div>
  );
};

export default BookingEmptyState;
