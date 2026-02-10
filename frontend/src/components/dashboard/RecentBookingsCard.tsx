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
    <div className="bg-card text-card-foreground rounded-2xl p-6 shadow-sm border border-border">
      <h3 className="text-lg font-semibold mb-4">{t("recentBookings")}</h3>
      <div className="space-y-3">
        {recentBookings.map((booking: Booking) => (
          <div
            key={booking.id}
            className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
          >
            <div>
              <p className="text-sm font-medium">
                {`${booking.clientNameFr.lastName} ${booking.clientNameFr.firstName} `.trim()}
              </p>
              <p className="text-xs text-muted-foreground">
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
              <p className="text-sm font-semibold">
                {Number(booking.sellingPrice).toLocaleString()} {t("mad")}
              </p>
              <span
                className={`text-xs px-2 py-1 rounded-full ${
                  booking.isFullyPaid
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                    : "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
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
