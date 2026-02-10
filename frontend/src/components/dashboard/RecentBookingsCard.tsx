import { useTranslation } from "react-i18next";
import type { Booking } from "../../context/models";

interface RecentBookingsCardProps {
  recentBookings: Booking[];
}

export default function RecentBookingsCard({
  recentBookings,
}: RecentBookingsCardProps) {
  const { t } = useTranslation();

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
        {t("recentBookings")}
      </h3>
      <div className="space-y-3">
        {recentBookings.map((booking: Booking) => (
          <div
            key={booking.id}
            className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
          >
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {`${booking.clientNameFr.lastName} ${booking.clientNameFr.firstName} `.trim()}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {booking.passportNumber}
              </p>
            </div>
            <div
              className={`${
                document.documentElement.dir === "rtl"
                  ? "text-left"
                  : "text-right"
              }`}
            >
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                {Number(booking.sellingPrice).toLocaleString()} {t("mad")}
              </p>
              <span
                className={`text-xs px-2 py-1 rounded-full ${
                  booking.isFullyPaid
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300"
                    : "bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300"
                }`}
              >
                {booking.isFullyPaid ? t("paid") : t("pending")}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
