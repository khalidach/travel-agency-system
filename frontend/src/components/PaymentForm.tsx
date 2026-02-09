// frontend/src/components/PaymentForm.tsx
import React, { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Payment } from "../context/models";

interface PaymentFormProps {
  payment?: Payment;
  onSave: (payment: Omit<Payment, "_id" | "id">) => void;
  onCancel: () => void;
  remainingBalance: number;
}

export default function PaymentForm({
  payment,
  onSave,
  onCancel,
  remainingBalance,
}: PaymentFormProps) {
  const { t } = useTranslation();

  // Wrapped in useCallback to resolve useEffect dependency warning
  const getInitialFormData = useCallback((): Omit<Payment, "_id" | "id"> => {
    if (payment) {
      return {
        amount: payment.amount,
        method: payment.method,
        date: payment.date
          ? new Date(payment.date).toISOString().split("T")[0]
          : "",
        labelPaper: payment.labelPaper || "",
        chequeNumber: payment.chequeNumber || "",
        bankName: payment.bankName || "",
        chequeCashingDate: payment.chequeCashingDate
          ? new Date(payment.chequeCashingDate).toISOString().split("T")[0]
          : "",
        transferReference: payment.transferReference || "",
        transferPayerName: payment.transferPayerName || "",
      };
    }
    return {
      amount: 0,
      method: "cash",
      date: new Date().toISOString().split("T")[0],
      labelPaper: "",
      chequeNumber: "",
      bankName: "",
      chequeCashingDate: "",
      transferReference: "",
      transferPayerName: "",
    };
  }, [payment]);

  const [formData, setFormData] = useState(getInitialFormData());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // When the payment prop changes (or getInitialFormData updates),
    // reset the form data.
    setFormData(getInitialFormData());
    setError(null);
  }, [getInitialFormData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // When editing, the validation balance should be the current remaining balance plus the amount of the payment being edited.
    const validationBalance = payment
      ? remainingBalance + payment.amount
      : remainingBalance;

    if (formData.amount > validationBalance) {
      setError(
        t("amountExceedsBalance", {
          balance: validationBalance.toLocaleString(),
        }),
      );
      return;
    }

    if (formData.amount <= 0) {
      setError(t("amountGreaterThanZero"));
      return;
    }

    onSave(formData);
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const amount = parseFloat(e.target.value) || 0;
    setFormData((prev) => ({ ...prev, amount }));
    const validationBalance = payment
      ? remainingBalance + payment.amount
      : remainingBalance;
    // Clear error if the new amount is valid
    if (amount <= validationBalance) {
      setError(null);
    }
  };

  const paymentMethods = [
    { value: "cash", label: t("cash") },
    { value: "cheque", label: t("cheque") },
    { value: "transfer", label: t("transfer") },
    { value: "card", label: t("card") },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {t("paymentAmount")}
        </label>
        <input
          type="number"
          value={formData.amount || ""}
          onChange={handleAmountChange}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          min="0"
          step="0.01"
          required
        />
        {error && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>
        )}
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {t("remainingBalance")}: {remainingBalance.toLocaleString()}{" "}
          {t("mad")}
        </p>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {t("paymentMethod")}
        </label>
        <select
          value={formData.method}
          onChange={(e) =>
            setFormData((prev) => ({
              ...prev,
              method: e.target.value as Payment["method"],
            }))
          }
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          required
        >
          {paymentMethods.map((method) => (
            <option key={method.value} value={method.value}>
              {method.label}
            </option>
          ))}
        </select>
      </div>

      {/* NEW: Optional Label Paper Input */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {t("labelPaper")}
          <span className="text-xs text-gray-500 dark:text-gray-400 font-normal ml-1">
            ({t("optional")})
          </span>
        </label>
        <input
          type="text"
          value={formData.labelPaper}
          onChange={(e) =>
            setFormData((prev) => ({
              ...prev,
              labelPaper: e.target.value,
            }))
          }
          placeholder={t("labelPaperPlaceholder") as string}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {t("paymentDate")}
        </label>
        <input
          type="date"
          value={formData.date}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, date: e.target.value }))
          }
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          required
        />
      </div>
      {formData.method === "cheque" && (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t("chequeNumber")}
            </label>
            <input
              type="text"
              value={formData.chequeNumber}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  chequeNumber: e.target.value,
                }))
              }
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t("bankName")}
            </label>
            <input
              type="text"
              value={formData.bankName}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, bankName: e.target.value }))
              }
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t("checkCashingDate")}
            </label>
            <input
              type="date"
              value={formData.chequeCashingDate}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  chequeCashingDate: e.target.value,
                }))
              }
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              required
            />
          </div>
        </>
      )}
      {formData.method === "transfer" && (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t("transferPayerName")}
            </label>
            <input
              type="text"
              value={formData.transferPayerName}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  transferPayerName: e.target.value,
                }))
              }
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t("transferReference")}
            </label>
            <input
              type="text"
              value={formData.transferReference}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  transferReference: e.target.value,
                }))
              }
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              required
            />
          </div>
        </>
      )}
      <div className="flex justify-end space-x-4 pt-4 border-t dark:border-gray-600">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-600 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-500 transition-colors"
        >
          {t("cancel")}
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          {t("savePayment")}
        </button>
      </div>
    </form>
  );
}
