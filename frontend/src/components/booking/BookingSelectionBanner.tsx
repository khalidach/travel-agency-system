import React from "react";
import { useTranslation } from "react-i18next";
import { useBookingStore } from "../../store/bookingStore";

interface BookingSelectionBannerProps {
  totalCount: number;
  onSelectAllMatching: () => void;
}

const BookingSelectionBanner: React.FC<BookingSelectionBannerProps> = ({
  totalCount,
  onSelectAllMatching,
}) => {
  const { t } = useTranslation();
  const { isSelectAllAcrossPages, selectedBookingIds, clearSelection } =
    useBookingStore();

  const selectedCount = selectedBookingIds.length;

  return (
    <div
      className="bg-blue-100 border-l-4 border-blue-500 text-blue-800 p-4 my-4 rounded-r-lg"
      role="alert"
    >
      {isSelectAllAcrossPages ? (
        <p>
          {t("allSelectedNotification", { count: selectedCount })}
          <button
            onClick={clearSelection}
            className="font-bold underline ml-2 hover:text-blue-900"
          >
            {t("clearSelection")}
          </button>
        </p>
      ) : (
        <p>
          {t("pageSelectionNotification", { count: selectedCount })}
          <button
            onClick={onSelectAllMatching}
            className="font-bold underline ml-2 hover:text-blue-900"
          >
            {t("selectAllMatching", { total: totalCount })}
          </button>
        </p>
      )}
    </div>
  );
};

export default BookingSelectionBanner;
