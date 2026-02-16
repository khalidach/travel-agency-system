// frontend/src/components/expenses/OrderNoteForm.tsx
import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Expense, ExpenseItem } from "../../context/models";
import { Plus, Trash2 } from "lucide-react";

interface OrderNoteFormProps {
  initialData?: Expense;
  onSubmit: (data: Partial<Expense>) => void;
  onCancel: () => void;
}

const emptyItem: ExpenseItem = {
  description: "",
  quantity: 1,
  unitPrice: 0,
  total: 0,
};

export default function OrderNoteForm({
  initialData,
  onSubmit,
  onCancel,
}: OrderNoteFormProps) {
  const { t } = useTranslation();

  const [date, setDate] = useState(
    initialData?.date
      ? new Date(initialData.date).toISOString().split("T")[0]
      : new Date().toISOString().split("T")[0],
  );
  const [beneficiary, setBeneficiary] = useState(
    initialData?.beneficiary || "",
  );
  const [currency, setCurrency] = useState(initialData?.currency || "MAD");

  // Use existing items or create one from description/amount if migrating from old format
  const [items, setItems] = useState<ExpenseItem[]>(() => {
    if (initialData?.items && initialData.items.length > 0) {
      return initialData.items;
    }
    if (initialData?.description && initialData?.amount) {
      return [
        {
          description: initialData.description,
          quantity: 1,
          unitPrice: initialData.amount,
          total: initialData.amount,
        },
      ];
    }
    return [emptyItem];
  });

  const currencies = ["MAD", "SAR", "USD", "EUR", "GBP", "TRY", "CNY"];

  const handleItemChange = (
    index: number,
    field: keyof ExpenseItem,
    value: string | number,
  ) => {
    const newItems = [...items];
    const item = { ...newItems[index], [field]: value };
    // Recalculate total for this item
    item.total = (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0);
    newItems[index] = item;
    setItems(newItems);
  };

  const addItem = () => setItems([...items, { ...emptyItem }]);
  const removeItem = (index: number) =>
    setItems(items.filter((_, i) => i !== index));

  const totalAmount = useMemo(() => {
    return items.reduce((sum, item) => sum + (item.total || 0), 0);
  }, [items]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Generate a summary description
    const description =
      items.length === 1
        ? items[0].description
        : `${items.length} items (${items
            .map((i) => i.description)
            .join(", ")
            .slice(0, 50)}...)`;

    onSubmit({
      date,
      beneficiary,
      currency,
      items,
      description,
      amount: totalAmount,
      type: "order_note",
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex flex-col space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t("date")}
          </label>
          <input
            type="date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full p-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:[color-scheme:dark]"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t("currency")}
          </label>
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className="w-full p-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700"
          >
            {currencies.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {t("beneficiary")} (Supplier/Provider)
        </label>
        <input
          type="text"
          required
          placeholder="e.g., Royal Air Maroc, Hotel Hilton"
          value={beneficiary}
          onChange={(e) => setBeneficiary(e.target.value)}
          className="w-full p-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700"
        />
      </div>

      <div className="space-y-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 border-b pb-2">
          {t("orderItems")}
        </label>

        {/* Header Row */}
        <div className="grid grid-cols-12 gap-2 text-xs font-medium text-gray-500 uppercase">
          <div className="col-span-6 md:col-span-5">{t("description")}</div>
          <div className="col-span-2 text-center">{t("quantity")}</div>
          <div className="col-span-3 text-right">{t("price")}</div>
          <div className="col-span-1"></div>
        </div>

        {items.map((item, index) => (
          <div key={index} className="grid grid-cols-12 gap-2 items-start">
            <div className="col-span-6 md:col-span-5">
              <input
                type="text"
                placeholder={t("itemDescription") as string}
                required
                value={item.description}
                onChange={(e) =>
                  handleItemChange(index, "description", e.target.value)
                }
                className="w-full p-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700"
              />
              <div className="md:hidden mt-1 text-xs text-gray-500">
                Total: {item.total.toLocaleString()} {currency}
              </div>
            </div>
            <div className="col-span-2">
              <input
                type="number"
                min="1"
                required
                value={item.quantity}
                onChange={(e) =>
                  handleItemChange(index, "quantity", Number(e.target.value))
                }
                className="w-full p-2 text-center rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700"
              />
            </div>
            <div className="col-span-3">
              <input
                type="number"
                min="0"
                step="0.01"
                required
                value={item.unitPrice}
                onChange={(e) =>
                  handleItemChange(index, "unitPrice", Number(e.target.value))
                }
                className="w-full p-2 text-right rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700"
              />
            </div>
            <div className="col-span-1 flex justify-center pt-2">
              <button
                type="button"
                onClick={() => removeItem(index)}
                className="text-gray-400 hover:text-red-500 transition-colors"
                disabled={items.length === 1}
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          </div>
        ))}

        <button
          type="button"
          onClick={addItem}
          className="flex items-center gap-1 text-sm text-primary hover:text-primary/80"
        >
          <Plus className="w-4 h-4" /> {t("addItem")}
        </button>
      </div>

      <div className="flex justify-end items-center gap-4 pt-4 border-t dark:border-gray-700">
        <div className="text-lg font-bold">
          {t("total")}: {totalAmount.toLocaleString()} {currency}
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
