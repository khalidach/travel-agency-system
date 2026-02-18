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
  nights: 1, // Default nights to 1
  total: 0,
  checkIn: "",
  checkOut: "",
};

type BookingType = "Hotel" | "Flight" | "Visa" | "Transfer" | "Other";

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

  // New State for Booking Type
  const [bookingType, setBookingType] = useState<BookingType>(
    initialData?.bookingType || "Other",
  );

  // New State for Reservation Number
  const [reservationNumber, setReservationNumber] = useState(
    initialData?.reservationNumber || "",
  );

  // Use existing items or create one from description/amount if migrating from old format
  const [items, setItems] = useState<ExpenseItem[]>(() => {
    if (initialData?.items && initialData.items.length > 0) {
      return initialData.items.map((item) => ({
        ...item,
        nights: item.nights || 1,
      }));
    }
    if (initialData?.description && initialData?.amount) {
      return [
        {
          description: initialData.description,
          quantity: 1,
          unitPrice: initialData.amount,
          nights: 1,
          total: initialData.amount,
        },
      ];
    }
    return [emptyItem];
  });

  const currencies = ["MAD", "SAR", "USD", "EUR", "GBP", "TRY", "CNY"];
  const bookingTypes: BookingType[] = [
    "Hotel",
    "Flight",
    "Visa",
    "Transfer",
    "Other",
  ];

  const calculateNights = (checkIn: string, checkOut: string): number => {
    if (!checkIn || !checkOut) return 1;
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return 1;

    // Calculate difference in milliseconds
    const diffTime = end.getTime() - start.getTime();
    // Convert to days
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays > 0 ? diffDays : 1;
  };

  const handleItemChange = (
    index: number,
    field: keyof ExpenseItem,
    value: string | number,
  ) => {
    const newItems = [...items];
    const item = { ...newItems[index], [field]: value };

    // Auto-calculate nights if dates change and we are in Hotel mode
    if (
      bookingType === "Hotel" &&
      (field === "checkIn" || field === "checkOut")
    ) {
      item.nights = calculateNights(item.checkIn || "", item.checkOut || "");
    }

    // Recalculate total for this item
    const qty = Number(item.quantity) || 0;
    const price = Number(item.unitPrice) || 0;
    const nights = bookingType === "Hotel" ? Number(item.nights) || 1 : 1;

    item.total = qty * price * nights;

    newItems[index] = item;
    setItems(newItems);
  };

  // Recalculate all items if booking type changes
  const handleBookingTypeChange = (newType: BookingType) => {
    setBookingType(newType);

    const updatedItems = items.map((item) => {
      const qty = Number(item.quantity) || 0;
      const price = Number(item.unitPrice) || 0;
      const nights = newType === "Hotel" ? Number(item.nights) || 1 : 1;

      return {
        ...item,
        total: qty * price * nights,
      };
    });
    setItems(updatedItems);
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
      bookingType,
      reservationNumber:
        bookingType === "Hotel" ? reservationNumber : undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex flex-col space-y-4">
        {/* Row 1: Date & Currency */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              {t("currencyChoice")}
            </label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full p-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700"
            >
              {currencies.map((cur) => (
                <option key={cur} value={cur}>
                  {t(`currencyChoicen.${cur}`)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Row 2: Booking Type, Beneficiary, & Reservation Number */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t("bookingType")}
            </label>
            <select
              value={bookingType}
              onChange={(e) =>
                handleBookingTypeChange(e.target.value as BookingType)
              }
              className="w-full p-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700"
            >
              {bookingTypes.map((type) => (
                <option key={type} value={type}>
                  {t(`bookingTypes.${type}`)}
                </option>
              ))}
            </select>
          </div>

          {bookingType === "Hotel" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t("reservationNumber")}
              </label>
              <input
                type="text"
                placeholder="e.g., 12345ABC"
                value={reservationNumber}
                onChange={(e) => setReservationNumber(e.target.value)}
                className="w-full p-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700"
              />
            </div>
          )}

          <div className={`${bookingType === "Hotel" ? "col-span-2" : ""}`}>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t("beneficiary")}
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
        </div>
      </div>

      <div className="space-y-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 border-b pb-2">
          {t("orderItems")}
        </label>

        {/* Header Row */}
        <div
          className={`grid gap-2 text-xs font-medium text-gray-500 uppercase items-center ${
            bookingType === "Hotel" ? "grid-cols-12" : "grid-cols-10"
          }`}
        >
          {/* Adjusted column span for Description to 3 if Hotel, to fit dates */}
          <div
            className={bookingType === "Hotel" ? "col-span-3" : "col-span-4"}
          >
            {t("description")}
          </div>

          {bookingType === "Hotel" && (
            <>
              <div className="col-span-2 text-left">{t("checkIn")}</div>
              <div className="col-span-2 text-left">{t("checkOut")}</div>
            </>
          )}

          <div
            className={
              bookingType === "Hotel"
                ? "col-span-1 text-left"
                : "col-span-2 text-left"
            }
          >
            {t("quantity")}
          </div>

          {bookingType === "Hotel" && (
            <div className="col-span-1 text-left">{t("nights")}</div>
          )}

          <div
            className={
              bookingType === "Hotel"
                ? "col-span-2 text-left"
                : "col-span-3 text-left"
            }
          >
            {t("price")}
          </div>

          <div className="col-span-1"></div>
        </div>

        {items.map((item, index) => (
          <div
            key={index}
            className={`grid gap-2 items-start ${
              bookingType === "Hotel" ? "grid-cols-12" : "grid-cols-10"
            }`}
          >
            {/* Description */}
            <div
              className={bookingType === "Hotel" ? "col-span-3" : "col-span-4"}
            >
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
                Total: {item.total.toLocaleString()} {t(`currency.${currency}`)}
              </div>
            </div>

            {/* Check-in / Check-out */}
            {bookingType === "Hotel" && (
              <>
                <div className="col-span-2">
                  <input
                    type="date"
                    required
                    value={item.checkIn || ""}
                    onChange={(e) =>
                      handleItemChange(index, "checkIn", e.target.value)
                    }
                    className="w-full p-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:[color-scheme:dark]"
                  />
                </div>
                <div className="col-span-2">
                  <input
                    type="date"
                    required
                    min={item.checkIn}
                    value={item.checkOut || ""}
                    onChange={(e) =>
                      handleItemChange(index, "checkOut", e.target.value)
                    }
                    className="w-full p-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:[color-scheme:dark]"
                  />
                </div>
              </>
            )}

            {/* Quantity */}
            <div
              className={bookingType === "Hotel" ? "col-span-1" : "col-span-2"}
            >
              <input
                type="number"
                min="1"
                required
                value={item.quantity}
                onChange={(e) =>
                  handleItemChange(index, "quantity", Number(e.target.value))
                }
                className="w-full p-2 text-center rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700"
                placeholder="Qty"
              />
            </div>

            {/* Nights */}
            {bookingType === "Hotel" && (
              <div className="col-span-1">
                <input
                  type="number"
                  min="1"
                  required
                  readOnly // Make it readOnly because it's calculated from dates
                  value={item.nights || 1}
                  onChange={(e) =>
                    handleItemChange(index, "nights", Number(e.target.value))
                  }
                  className="w-full p-2 text-center rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 bg-gray-50 dark:bg-gray-800 cursor-not-allowed"
                  placeholder="Nights"
                />
              </div>
            )}

            {/* Price */}
            <div
              className={bookingType === "Hotel" ? "col-span-2" : "col-span-3"}
            >
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

            {/* Delete */}
            <div className="col-span-1 flex justify-center pt-2">
              <button
                type="button"
                onClick={() => removeItem(index)}
                className="text-gray-400 hover:text-red-500 transition-colors cursor-pointer"
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
          {t("total")}: {totalAmount.toLocaleString()}{" "}
          {t(`currency.${currency}`)}
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
