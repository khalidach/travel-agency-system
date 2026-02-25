import React, { useState, useMemo, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-hot-toast";
import { DailyService, Payment } from "../../context/models";
import NumberInput from "../ui/NumberInput";

interface DailyServiceFormProps {
  service?: DailyService | null;
  onSave: (
    data: Omit<
      DailyService,
      | "id"
      | "createdAt"
      | "updatedAt"
      | "userId"
      | "employeeId"
      | "vatPaid"
      | "totalPaid"
      | "profit"
      | "advancePayments"
      | "remainingBalance"
      | "isFullyPaid"
    > & {
      profit: number;
      advancePayments: Payment[];
    },
  ) => void;
  onCancel: () => void;
}

const DailyServiceForm: React.FC<DailyServiceFormProps> = ({
  service,
  onSave,
  onCancel,
}) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    type: service?.type || "airline-ticket",
    serviceName: service?.serviceName || "",
    originalPrice: service?.originalPrice || 0,
    totalPrice: service?.totalPrice || 0,
    date: service?.date
      ? new Date(service.date).toISOString().split("T")[0]
      : new Date().toISOString().split("T")[0],
  });

  useEffect(() => {
    if (service) {
      setFormData({
        type: service.type,
        serviceName: service.serviceName,
        originalPrice: service.originalPrice,
        totalPrice: service.totalPrice,
        date: new Date(service.date).toISOString().split("T")[0],
      });
    }
  }, [service]);

  const profit = useMemo(() => {
    const original = Number(formData.originalPrice) || 0;
    const total = Number(formData.totalPrice) || 0;
    return total - original;
  }, [formData.originalPrice, formData.totalPrice]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.totalPrice < formData.originalPrice) {
      toast.error(t("totalPriceCannotBeLessThanOriginal"));
      return;
    }

    onSave({
      ...formData,
      profit,
      advancePayments: service?.advancePayments || [],
    });
  };

  const inputClass =
    "mt-1 block w-full px-3 py-2 border border-input rounded-md bg-background text-foreground focus:ring-2 focus:ring-ring focus:border-input";
  const labelClass = "block text-sm font-medium text-foreground";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>{t("serviceType")}</label>
          <select
            value={formData.type}
            onChange={(e) =>
              setFormData({
                ...formData,
                type: e.target.value as DailyService["type"],
              })
            }
            className={inputClass}
          >
            <option value="airline-ticket">{t("airline-ticket")}</option>
            <option value="hotel-reservation">{t("hotel-reservation")}</option>
            <option value="reservation-ticket">
              {t("reservation-ticket")}
            </option>
            <option value="visa">{t("visa")}</option>
          </select>
        </div>
        <div>
          <label className={labelClass}>{t("serviceName")}</label>
          <input
            type="text"
            value={formData.serviceName}
            onChange={(e) =>
              setFormData({ ...formData, serviceName: e.target.value })
            }
            className={inputClass}
            required
          />
        </div>
        <div>
          <label className={labelClass}>{t("originalPrice")}</label>
          <NumberInput
            value={formData.originalPrice}
            onChange={(e) =>
              setFormData({
                ...formData,
                originalPrice: Number(e.target.value),
              })
            }
            className={inputClass}
            required
            min="0"
          />
        </div>
        <div>
          <label className={labelClass}>{t("totalPrice")}</label>
          <NumberInput
            value={formData.totalPrice}
            onChange={(e) =>
              setFormData({ ...formData, totalPrice: Number(e.target.value) })
            }
            className={inputClass}
            required
            min="0"
          />
        </div>
        <div>
          <label className={labelClass}>{t("date")}</label>
          <input
            type="date"
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            className={`${inputClass} dark:[color-scheme:dark]`}
            required
          />
        </div>
      </div>
      <div className="mt-6 p-4 bg-muted/50 rounded-lg space-y-2 border border-border">
        <div className="flex justify-between font-bold text-lg text-success">
          <span>{t("profit")}:</span>{" "}
          <span>
            {profit.toLocaleString()} {t("mad")}
          </span>
        </div>
      </div>
      <div className="flex justify-end space-x-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors"
        >
          {t("cancel")}
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
        >
          {t("save")}
        </button>
      </div>
    </form>
  );
};

export default DailyServiceForm;
