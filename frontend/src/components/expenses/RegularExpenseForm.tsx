// frontend/src/components/expenses/RegularExpenseForm.tsx
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Expense, Payment } from "../../context/models";

// Define the strict type based on your models
type PaymentMethod = Payment["method"];

interface RegularExpenseFormProps {
  initialData?: Expense;
  // We specify that paymentMethod must be one of the valid types, or allow string for flexibility if needed,
  // but strictly it should be PaymentMethod
  onSubmit: (
    data: Partial<Expense> & { paymentMethod?: PaymentMethod },
  ) => void;
  onCancel: () => void;
}

export default function RegularExpenseForm({
  initialData,
  onSubmit,
  onCancel,
}: RegularExpenseFormProps) {
  const { t } = useTranslation();

  // Safely extract existing method or default to 'cash'
  // We cast the initial value to ensure it matches the type
  const existingPaymentMethod =
    (initialData?.advancePayments?.[0]?.method as PaymentMethod) || "cash";

  const [formData, setFormData] = useState({
    description: initialData?.description || "",
    amount: initialData?.amount || 0,
    category: initialData?.category || "",
    paymentMethod: existingPaymentMethod,
    date: initialData?.date
      ? new Date(initialData.date).toISOString().split("T")[0]
      : new Date().toISOString().split("T")[0],
  });

  const categories = [
    "salary",
    "rent",
    "utilities",
    "marketing",
    "office_supplies",
    "taxes",
    "other",
  ];

  // Values MUST match the Payment['method'] type: "cash" | "cheque" | "transfer" | "card"
  const paymentMethods: { value: PaymentMethod; label: string }[] = [
    { value: "cash", label: t("cash") || "Cash" },
    {
      value: "transfer",
      label: t("bank_transfer") || "Bank Transfer / Virement",
    },
    { value: "cheque", label: t("check") || "Check" },
    { value: "card", label: t("card") || "Credit Card" },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {t("date")}
        </label>
        <input
          type="date"
          required
          value={formData.date}
          onChange={(e) => setFormData({ ...formData, date: e.target.value })}
          className="w-full p-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:[color-scheme:dark]"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {t("description")}
        </label>
        <input
          type="text"
          required
          placeholder="e.g., Office Rent March"
          value={formData.description}
          onChange={(e) =>
            setFormData({ ...formData, description: e.target.value })
          }
          className="w-full p-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {t("category")}
        </label>
        <select
          value={formData.category}
          onChange={(e) =>
            setFormData({ ...formData, category: e.target.value })
          }
          className="w-full p-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700"
        >
          <option value="">{t("selectCategory")}</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {t(cat)}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t("totalAmount")} ({t("mad")})
          </label>
          <input
            type="number"
            required
            min="0"
            step="0.01"
            value={formData.amount}
            onChange={(e) =>
              setFormData({ ...formData, amount: parseFloat(e.target.value) })
            }
            className="w-full p-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t("paymentMethod")}
          </label>
          <select
            value={formData.paymentMethod}
            onChange={(e) =>
              // Strict type casting to fix the TS error
              setFormData({
                ...formData,
                paymentMethod: e.target.value as PaymentMethod,
              })
            }
            className="w-full p-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700"
          >
            {paymentMethods.map((method) => (
              <option key={method.value} value={method.value}>
                {method.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex justify-end gap-3 mt-6">
        <button
          type="button"
          onClick={onCancel}
          className="btn-secondary px-4 py-2 rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors"
        >
          {t("cancel")}
        </button>
        <button
          type="submit"
          className="btn-primary bg-primary text-white hover:bg-primary/90 transition-colors px-4 py-2 rounded-lg"
        >
          {t("save")}
        </button>
      </div>
    </form>
  );
}
