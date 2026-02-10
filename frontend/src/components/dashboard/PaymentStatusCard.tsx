import { useTranslation } from "react-i18next";
import { CheckCircle2, Clock } from "lucide-react";

interface PaymentStatusCardProps {
  paymentStatus: {
    fullyPaid: number;
    pending: number;
  };
}

export default function PaymentStatusCard({
  paymentStatus,
}: PaymentStatusCardProps) {
  const { t } = useTranslation();

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
        {t("paymentStatus")}
      </h3>
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <CheckCircle2
              className={`w-5 h-5 text-emerald-500 ${
                document.documentElement.dir === "rtl" ? "ml-2" : "mr-2"
              }`}
            />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {t("fullyPaid")}
            </span>
          </div>
          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            {paymentStatus.fullyPaid}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <Clock
              className={`w-5 h-5 text-orange-500 ${
                document.documentElement.dir === "rtl" ? "ml-2" : "mr-2"
              }`}
            />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {t("pending")}
            </span>
          </div>
          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            {paymentStatus.pending}
          </span>
        </div>
      </div>
    </div>
  );
}
