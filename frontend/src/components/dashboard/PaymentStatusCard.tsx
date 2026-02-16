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
    <div className="bg-card text-card-foreground rounded-2xl p-6 shadow-sm border border-border">
      <h3 className="text-lg font-semibold mb-4">{t("paymentStatus")}</h3>
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <CheckCircle2 className={`w-5 h-5 text-emerald-500 mr-2`} />
            <span className="text-sm text-muted-foreground">
              {t("fullyPaid")}
            </span>
          </div>
          <span className="text-sm font-semibold">
            {paymentStatus.fullyPaid}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <Clock className={`w-5 h-5 text-orange-500 mr-2`} />
            <span className="text-sm text-muted-foreground">
              {t("pending")}
            </span>
          </div>
          <span className="text-sm font-semibold">{paymentStatus.pending}</span>
        </div>
      </div>
    </div>
  );
}
