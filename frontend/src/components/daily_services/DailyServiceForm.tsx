import React, { useState, useMemo, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-hot-toast";
import { DailyService, Payment } from "../../context/models";

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

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            {t("serviceType")}
          </label>
          <select
            value={formData.type}
            onChange={(e) =>
              setFormData({
                ...formData,
                type: e.target.value as DailyService["type"],
              })
            }
            className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
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
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            {t("serviceName")}
          </label>
          <input
            type="text"
            value={formData.serviceName}
            onChange={(e) =>
              setFormData({ ...formData, serviceName: e.target.value })
            }
            className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            {t("originalPrice")}
          </label>
          <input
            type="number"
            value={formData.originalPrice}
            onChange={(e) =>
              setFormData({
                ...formData,
                originalPrice: Number(e.target.value),
              })
            }
            className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            required
            min="0"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            {t("totalPrice")}
          </label>
          <input
            type="number"
            value={formData.totalPrice}
            onChange={(e) =>
              setFormData({ ...formData, totalPrice: Number(e.target.value) })
            }
            className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            required
            min="0"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            {t("date")}
          </label>
          <input
            type="date"
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            required
          />
        </div>
      </div>
      <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg space-y-2">
        <div className="flex justify-between font-bold text-lg text-emerald-600 dark:text-emerald-400">
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
          className="px-4 py-2 bg-gray-100 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg"
        >
          {t("cancel")}
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg"
        >
          {t("save")}
        </button>
      </div>
    </form>
  );
};

export default DailyServiceForm;
