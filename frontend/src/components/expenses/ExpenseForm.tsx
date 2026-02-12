// frontend/src/components/expenses/ExpenseForm.tsx
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Expense } from "../../context/models";

interface ExpenseFormProps {
  initialData?: Expense;
  type: "order_note" | "regular";
  onSubmit: (data: Partial<Expense>) => void;
  onCancel: () => void;
}

export default function ExpenseForm({
  initialData,
  type,
  onSubmit,
  onCancel,
}: ExpenseFormProps) {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    description: initialData?.description || "",
    amount: initialData?.amount || 0,
    category: initialData?.category || "",
    beneficiary: initialData?.beneficiary || "",
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
          placeholder={
            type === "order_note"
              ? "e.g., 30 Seats with RAM"
              : "e.g., Office Rent March"
          }
          value={formData.description}
          onChange={(e) =>
            setFormData({ ...formData, description: e.target.value })
          }
          className="w-full p-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700"
        />
      </div>

      {type === "order_note" ? (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t("beneficiary")} (Supplier/Provider)
          </label>
          <input
            type="text"
            required
            placeholder="e.g., Royal Air Maroc"
            value={formData.beneficiary}
            onChange={(e) =>
              setFormData({ ...formData, beneficiary: e.target.value })
            }
            className="w-full p-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700"
          />
        </div>
      ) : (
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
      )}

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
