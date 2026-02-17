// frontend/src/components/expenses/ExpensePaymentForm.tsx
import React, { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Payment } from "../../context/models";

interface ExpensePaymentFormProps {
  payment?: Payment;
  onSave: (payment: Omit<Payment, "_id" | "id">) => void;
  onCancel: () => void;
  remainingBalance: number;
  currency?: string;
}

export default function ExpensePaymentForm({
  payment,
  onSave,
  onCancel,
  remainingBalance,
  currency = "MAD",
}: ExpensePaymentFormProps) {
  const { t } = useTranslation();

  const getInitialFormData = useCallback((): Omit<Payment, "_id" | "id"> => {
    if (payment) {
      return {
        amount: payment.amount,
        amountMAD: payment.amountMAD || payment.amount,
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
      amountMAD: 0,
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
    setFormData(getInitialFormData());
    setError(null);
  }, [getInitialFormData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validationBalance = payment
      ? remainingBalance + payment.amount
      : remainingBalance;

    if (formData.amount > validationBalance + 0.1) {
      setError(
        t("amountExceedsBalance", {
          balance: `${validationBalance.toLocaleString()} ${currency}`,
        }),
      );
      return;
    }

    if (formData.amount <= 0) {
      setError(t("amountGreaterThanZero"));
      return;
    }

    // If currency is MAD, ensure amountMAD matches amount
    const finalData = { ...formData };
    if (currency === "MAD") {
      finalData.amountMAD = finalData.amount;
    } else if (!finalData.amountMAD || finalData.amountMAD <= 0) {
      setError(t("enterEquivalentMAD"));
      return;
    }

    finalData.currency = currency;

    onSave(finalData);
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const amount = parseFloat(e.target.value) || 0;
    setFormData((prev) => ({ ...prev, amount }));
    // If currency is MAD, sync amountMAD
    if (currency === "MAD") {
      setFormData((prev) => ({ ...prev, amount, amountMAD: amount }));
    }
    setError(null);
  };

  const paymentMethods = [
    { value: "cash", label: t("cash") },
    { value: "cheque", label: t("cheque") },
    { value: "transfer", label: t("transfer") },
    { value: "card", label: t("card") },
  ];

  const isForeignCurrency = currency !== "DH";

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex flex-col space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t("paymentAmount")} ({currency})
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
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {t("remainingBalance")}: {remainingBalance.toLocaleString()}{" "}
            {currency}
          </p>
        </div>

        {isForeignCurrency && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t("equivalentIn")} ({t("currency.MAD")})
            </label>
            <input
              type="number"
              value={formData.amountMAD || ""}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  amountMAD: parseFloat(e.target.value) || 0,
                }))
              }
              className="w-full px-3 py-2 border border-blue-300 dark:border-blue-600 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-gray-900 dark:text-gray-100"
              min="0"
              step="0.01"
              required
              placeholder={t("amountInMADPlaceholder") as string}
            />
            <p className="mt-1 text-xs text-blue-600 dark:text-blue-400">
              {t("enterCurrentValueInMAD")}
            </p>
          </div>
        )}
      </div>

      {error && (
        <p className="mt-1 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-2 rounded">
          {error}
        </p>
      )}

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

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {t("labelPaper")}{" "}
          <span className="text-gray-500 font-normal">({t("optional")})</span>
        </label>
        <input
          type="text"
          value={formData.labelPaper}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, labelPaper: e.target.value }))
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
