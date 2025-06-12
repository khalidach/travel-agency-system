import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Payment } from "../context/AppContext";

interface PaymentFormProps {
  payment?: Payment;
  onSave: (payment: Payment) => void;
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
  const [formData, setFormData] = useState<Payment>({
    id: payment?.id || crypto.randomUUID(),
    amount: payment?.amount || 0,
    method: payment?.method || "cash",
    date: payment?.date || new Date().toISOString().split("T")[0],
    chequeNumber: payment?.chequeNumber || "",
    bankName: payment?.bankName || "",
    chequeCashingDate: payment?.chequeCashingDate || "",
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (payment) {
      setFormData(payment);
    }
  }, [payment]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate payment amount against remaining balance
    if (formData.amount > remainingBalance) {
      setError(`Payment amount cannot exceed the remaining balance (${remainingBalance} MAD)`);
      return;
    }
    
    onSave(formData);
  };

  const paymentMethods = [
    { value: "cash", label: "Cash" },
    { value: "cheque", label: "Cheque" },
    { value: "transfer", label: "Bank Transfer" },
    { value: "card", label: "Credit/Debit Card" },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Payment Amount (MAD)
        </label>
        <input
          type="number"
          value={formData.amount}
          onChange={(e) => {
            const amount = parseFloat(e.target.value) || 0;
            setFormData((prev) => ({
              ...prev,
              amount,
            }));
            // Clear error when amount is valid
            if (amount <= remainingBalance) {
              setError(null);
            }
          }}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          min="0"
          max={remainingBalance}
          step="0.01"
          required
        />
        {error && (
          <p className="mt-1 text-sm text-red-600">{error}</p>
        )}
        <p className="mt-1 text-sm text-gray-500">
          Remaining balance: {remainingBalance.toLocaleString()} MAD
        </p>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Payment Method
        </label>
        <select
          value={formData.method}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, method: e.target.value as any }))
          }
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Payment Date
        </label>
        <input
          type="date"
          value={formData.date}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, date: e.target.value }))
          }
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          required
        />
      </div>
      {formData.method === "cheque" && (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t("Cheque Number")}
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
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t("Bank Name")}
            </label>
            <input
              type="text"
              value={formData.bankName}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, bankName: e.target.value }))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t("Check Cashing Date")}
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
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>
        </>
      )}
      <div className="flex justify-end space-x-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
        >
          {t("cancel")}
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          {t("save")} Payment
        </button>
      </div>
    </form>
  );
}
