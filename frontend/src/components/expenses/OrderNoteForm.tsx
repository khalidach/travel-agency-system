// frontend/src/components/expenses/OrderNoteForm.tsx
import { useState, useMemo, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Expense, ExpenseItem, Supplier } from "../../context/models";
import { Plus, Trash2 } from "lucide-react";
import { getSuppliers } from "../../services/api";
import NumberInput from "../ui/NumberInput";

interface OrderNoteFormProps {
  initialData?: Expense;
  onSubmit: (data: Partial<Expense>) => void;
  onCancel: () => void;
  readOnly?: boolean; // New prop for preview mode
}

const emptyItem: ExpenseItem = {
  description: "",
  quantity: 1,
  unitPrice: 0,
  nights: 1,
  total: 0,
  checkIn: "",
  checkOut: "",
  departureDate: "",
  returnDate: "",
};

type BookingType = "Hotel" | "Flight" | "Visa" | "Transfer" | "Other";

export default function OrderNoteForm({
  initialData,
  onSubmit,
  onCancel,
  readOnly = false,
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
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  const [currency, setCurrency] = useState(initialData?.currency || "MAD");

  const [bookingType, setBookingType] = useState<BookingType>(
    initialData?.bookingType || "Other",
  );

  const [reservationNumber, setReservationNumber] = useState(
    initialData?.reservationNumber || "",
  );

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

  useEffect(() => {
    if (readOnly) return; // Skip fetching if read-only
    const fetchSuppliers = async () => {
      try {
        const data = await getSuppliers(false);
        if (Array.isArray(data)) {
          setSuppliers(data);
        }
      } catch (error) {
        console.error("Failed to fetch suppliers", error);
      }
    };
    fetchSuppliers();
  }, [readOnly]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const filteredSuppliers = useMemo(() => {
    if (!beneficiary) return suppliers;
    return suppliers.filter((s) =>
      s.name.toLowerCase().includes(beneficiary.toLowerCase()),
    );
  }, [suppliers, beneficiary]);

  const calculateNights = (checkIn: string, checkOut: string): number => {
    if (!checkIn || !checkOut) return 1;
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return 1;
    const diffTime = end.getTime() - start.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 1;
  };

  const handleItemChange = (
    index: number,
    field: keyof ExpenseItem,
    value: string | number,
  ) => {
    if (readOnly) return;
    const newItems = [...items];
    const item = { ...newItems[index], [field]: value };

    if (
      bookingType === "Hotel" &&
      (field === "checkIn" || field === "checkOut")
    ) {
      item.nights = calculateNights(item.checkIn || "", item.checkOut || "");
    }

    const qty = Number(item.quantity) || 0;
    const price = Number(item.unitPrice) || 0;
    const nights = bookingType === "Hotel" ? Number(item.nights) || 1 : 1;

    item.total = qty * price * nights;
    newItems[index] = item;
    setItems(newItems);
  };

  const handleBookingTypeChange = (newType: BookingType) => {
    if (readOnly) return;
    setBookingType(newType);
    const updatedItems = items.map((item) => {
      const qty = Number(item.quantity) || 0;
      const price = Number(item.unitPrice) || 0;
      const nights = newType === "Hotel" ? Number(item.nights) || 1 : 1;
      return { ...item, total: qty * price * nights };
    });
    setItems(updatedItems);
  };

  const addItem = () => {
    if (!readOnly) setItems([...items, { ...emptyItem }]);
  };

  const removeItem = (index: number) => {
    if (!readOnly) setItems(items.filter((_, i) => i !== index));
  };

  const totalAmount = useMemo(() => {
    return items.reduce((sum, item) => sum + (item.total || 0), 0);
  }, [items]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (readOnly) return;

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

  const isHotel = bookingType === "Hotel";
  const isFlight = bookingType === "Flight";
  const isWideLayout = isHotel || isFlight;
  const inputClass =
    "w-full p-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:[color-scheme:dark] disabled:opacity-60 disabled:cursor-not-allowed";

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
              disabled={readOnly}
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t("currencyChoice")}
            </label>
            <select
              value={currency}
              disabled={readOnly}
              onChange={(e) => setCurrency(e.target.value)}
              className={inputClass}
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
              disabled={readOnly}
              onChange={(e) =>
                handleBookingTypeChange(e.target.value as BookingType)
              }
              className={inputClass}
            >
              {bookingTypes.map((type) => (
                <option key={type} value={type}>
                  {t(`bookingTypes.${type}`)}
                </option>
              ))}
            </select>
          </div>

          {isHotel && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t("reservationNumber")}
              </label>
              <input
                type="text"
                placeholder="e.g., 12345ABC"
                disabled={readOnly}
                value={reservationNumber}
                onChange={(e) => setReservationNumber(e.target.value)}
                className={inputClass}
              />
            </div>
          )}

          <div
            className={`${isHotel ? "col-span-2" : ""}`}
            ref={suggestionsRef}
          >
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t("beneficiary")}
            </label>
            <div className="relative">
              <input
                type="text"
                required
                disabled={readOnly}
                placeholder="e.g., Royal Air Maroc, Hotel Hilton"
                value={beneficiary}
                onChange={(e) => {
                  setBeneficiary(e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => !readOnly && setShowSuggestions(true)}
                className={inputClass}
              />
              {/* Suggestions Dropdown */}
              {!readOnly && showSuggestions && filteredSuppliers.length > 0 && (
                <ul className="absolute z-10 w-full mt-1 max-h-60 overflow-y-auto bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg">
                  {filteredSuppliers.map((supplier) => (
                    <li
                      key={supplier.id}
                      onClick={() => {
                        setBeneficiary(supplier.name);
                        setShowSuggestions(false);
                      }}
                      className="px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer text-sm"
                    >
                      {supplier.name}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 border-b pb-2">
          {t("orderItems")}
        </label>

        {/* Header Row */}
        <div
          className={`grid gap-2 text-xs font-medium text-gray-500 uppercase items-center ${isWideLayout ? "grid-cols-12" : "grid-cols-10"
            }`}
        >
          <div
            className={
              isHotel ? "col-span-3" : isFlight ? "col-span-4" : "col-span-4"
            }
          >
            {t("description")}
          </div>

          {isHotel && (
            <>
              <div className="col-span-2 text-left">{t("checkIn")}</div>
              <div className="col-span-2 text-left">{t("checkOut")}</div>
            </>
          )}

          {isFlight && (
            <>
              <div className="col-span-2 text-left">
                {t("departureDate") || "Departure"}
              </div>
              <div className="col-span-2 text-left">
                {t("returnDate") || "Return"}
              </div>
            </>
          )}

          <div
            className={
              isHotel
                ? "col-span-1 text-left"
                : isFlight
                  ? "col-span-1 text-left"
                  : "col-span-2 text-left"
            }
          >
            {t("quantity")}
          </div>

          {isHotel && <div className="col-span-1 text-left">{t("nights")}</div>}

          <div
            className={
              isHotel
                ? "col-span-2 text-left"
                : isFlight
                  ? "col-span-2 text-left"
                  : "col-span-3 text-left"
            }
          >
            {t("price")}
          </div>

          {!readOnly && <div className="col-span-1"></div>}
        </div>

        {items.map((item, index) => (
          <div
            key={index}
            className={`grid gap-2 items-start ${isWideLayout ? "grid-cols-12" : "grid-cols-10"
              }`}
          >
            {/* Description */}
            <div
              className={
                isHotel ? "col-span-3" : isFlight ? "col-span-4" : "col-span-4"
              }
            >
              <input
                type="text"
                placeholder={t("itemDescription") as string}
                required
                disabled={readOnly}
                value={item.description}
                onChange={(e) =>
                  handleItemChange(index, "description", e.target.value)
                }
                className={inputClass}
              />
              <div className="md:hidden mt-1 text-xs text-gray-500">
                Total: {item.total.toLocaleString()} {t(`currency.${currency}`)}
              </div>
            </div>

            {/* Hotel Check-in / Check-out */}
            {isHotel && (
              <>
                <div className="col-span-2">
                  <input
                    type="date"
                    required
                    disabled={readOnly}
                    value={item.checkIn || ""}
                    onChange={(e) =>
                      handleItemChange(index, "checkIn", e.target.value)
                    }
                    className={inputClass}
                  />
                </div>
                <div className="col-span-2">
                  <input
                    type="date"
                    required
                    disabled={readOnly}
                    min={item.checkIn}
                    value={item.checkOut || ""}
                    onChange={(e) =>
                      handleItemChange(index, "checkOut", e.target.value)
                    }
                    className={inputClass}
                  />
                </div>
              </>
            )}

            {/* Flight Departure / Return */}
            {isFlight && (
              <>
                <div className="col-span-2">
                  <input
                    type="date"
                    required
                    disabled={readOnly}
                    placeholder="Departure"
                    value={item.departureDate || ""}
                    onChange={(e) =>
                      handleItemChange(index, "departureDate", e.target.value)
                    }
                    className={inputClass}
                  />
                </div>
                <div className="col-span-2">
                  <input
                    type="date"
                    required
                    disabled={readOnly}
                    min={item.departureDate}
                    placeholder="Return"
                    value={item.returnDate || ""}
                    onChange={(e) =>
                      handleItemChange(index, "returnDate", e.target.value)
                    }
                    className={inputClass}
                  />
                </div>
              </>
            )}

            {/* Quantity */}
            <div
              className={
                isHotel ? "col-span-1" : isFlight ? "col-span-1" : "col-span-2"
              }
            >
              <NumberInput
                min="1"
                required
                disabled={readOnly}
                value={item.quantity}
                onChange={(e) =>
                  handleItemChange(index, "quantity", Number(e.target.value))
                }
                className={`${inputClass} text-center`}
                placeholder="Qty"
              />
            </div>

            {/* Hotel Nights (Calculated) */}
            {isHotel && (
              <div className="col-span-1">
                <NumberInput
                  min="1"
                  required
                  readOnly
                  disabled={true} // Always disabled as it is calculated
                  value={item.nights || 1}
                  onChange={(e) =>
                    handleItemChange(index, "nights", Number(e.target.value))
                  }
                  className={`${inputClass} bg-gray-50 dark:bg-gray-800 cursor-not-allowed text-center`}
                  placeholder="Nights"
                />
              </div>
            )}

            {/* Price */}
            <div
              className={
                isHotel ? "col-span-2" : isFlight ? "col-span-2" : "col-span-3"
              }
            >
              <NumberInput
                min="0"
                step="0.01"
                required
                disabled={readOnly}
                value={item.unitPrice}
                onChange={(e) =>
                  handleItemChange(index, "unitPrice", Number(e.target.value))
                }
                className={`${inputClass} text-right`}
              />
            </div>

            {/* Delete */}
            {!readOnly && (
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
            )}
          </div>
        ))}

        {!readOnly && (
          <button
            type="button"
            onClick={addItem}
            className="flex items-center gap-1 text-sm text-primary hover:text-primary/80"
          >
            <Plus className="w-4 h-4" /> {t("addItem")}
          </button>
        )}
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
          {readOnly ? t("close") : t("cancel")}
        </button>
        {!readOnly && (
          <button
            type="submit"
            className="btn-primary bg-primary text-white hover:bg-primary/90 transition-colors px-4 py-2 rounded-lg"
          >
            {t("save")}
          </button>
        )}
      </div>
    </form>
  );
}
