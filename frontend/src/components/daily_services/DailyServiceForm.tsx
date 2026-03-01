import React, { useState, useMemo, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-hot-toast";
import { DailyService, DailyServiceItem, Payment } from "../../context/models";
import NumberInput from "../ui/NumberInput";
import { Plus, Trash2 } from "lucide-react";

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

const emptyItem: DailyServiceItem = {
  description: "",
  quantity: 1,
  purchasePrice: 0,
  sellPrice: 0,
};

const DailyServiceForm: React.FC<DailyServiceFormProps> = ({
  service,
  onSave,
  onCancel,
}) => {
  const { t } = useTranslation();

  const [type, setType] = useState<DailyService["type"]>(
    service?.type || "airline-ticket",
  );

  const [clientName, setClientName] = useState(service?.clientName || "");
  const [bookingRef, setBookingRef] = useState(service?.bookingRef || "");

  const [date, setDate] = useState(
    service?.date
      ? new Date(service.date).toISOString().split("T")[0]
      : new Date().toISOString().split("T")[0],
  );

  const [items, setItems] = useState<DailyServiceItem[]>(() => {
    if (service?.items && service.items.length > 0) {
      return [...service.items];
    }
    if (service?.serviceName) {
      return [
        {
          description: service.serviceName,
          quantity: 1,
          purchasePrice: service.originalPrice || 0,
          sellPrice: service.totalPrice || 0,
        },
      ];
    }
    return [{ ...emptyItem }];
  });

  useEffect(() => {
    if (service) {
      setType(service.type);
      setClientName(service.clientName || "");
      setBookingRef(service.bookingRef || "");
      setDate(new Date(service.date).toISOString().split("T")[0]);

      if (service.items && service.items.length > 0) {
        setItems([...service.items]);
      } else if (service.serviceName) {
        setItems([
          {
            description: service.serviceName,
            quantity: 1,
            purchasePrice: service.originalPrice || 0,
            sellPrice: service.totalPrice || 0,
          },
        ]);
      } else {
        setItems([{ ...emptyItem }]);
      }
    }
  }, [service]);

  const handleItemChange = (
    index: number,
    field: keyof DailyServiceItem,
    value: string | number,
  ) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const addItem = () => {
    setItems([...items, { ...emptyItem }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const originalPrice = useMemo(() => {
    return items.reduce(
      (sum, item) => sum + (Number(item.quantity) * Number(item.purchasePrice) || 0),
      0,
    );
  }, [items]);

  const totalPrice = useMemo(() => {
    return items.reduce(
      (sum, item) => sum + (Number(item.quantity) * Number(item.sellPrice) || 0),
      0,
    );
  }, [items]);

  const profit = useMemo(() => {
    return totalPrice - originalPrice;
  }, [originalPrice, totalPrice]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (totalPrice < originalPrice) {
      toast.error(t("totalPriceCannotBeLessThanOriginal"));
      return;
    }

    // Validate items
    for (let i = 0; i < items.length; i++) {
      if (!items[i].description.trim()) {
        toast.error(t("itemDescriptionRequired"));
        return;
      }
    }

    const serviceName =
      items.length === 1
        ? items[0].description
        : `${items.length} items (${items
          .map((i) => i.description)
          .join(", ")
          .slice(0, 50)}...)`;

    onSave({
      type,
      serviceName,
      clientName,
      bookingRef,
      items,
      originalPrice,
      totalPrice,
      date,
      profit,
      advancePayments: service?.advancePayments || [],
    });
  };

  const isBookingRelated =
    type === "airline-ticket" ||
    type === "hotel-reservation" ||
    type === "reservation-ticket";

  const inputClass =
    "w-full p-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:[color-scheme:dark] disabled:opacity-60 disabled:cursor-not-allowed";

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex flex-col space-y-4">
        {/* Row 1: Date & Type */}
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
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t("serviceType")}
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as DailyService["type"])}
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
        </div>

        {/* Row 2: Client Name & Global Booking Ref */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t("clientName")}
            </label>
            <input
              type="text"
              placeholder={t("clientName") as string}
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              className={inputClass}
              required
            />
          </div>
          {isBookingRelated && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t("reservationNumber")} ({t("global")})
              </label>
              <input
                type="text"
                placeholder={t("reservationNumber") as string}
                value={bookingRef}
                onChange={(e) => setBookingRef(e.target.value)}
                className={inputClass}
              />
            </div>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 border-b pb-2">
          {t("items")}
        </label>

        {/* Header Row */}
        <div
          className={`grid gap-2 text-xs font-medium text-gray-500 uppercase items-center ${isBookingRelated ? "grid-cols-12" : "grid-cols-10"
            }`}
        >
          <div className={isBookingRelated ? "col-span-3" : "col-span-4"}>
            {t("description")}
          </div>

          {isBookingRelated && (
            <div className="col-span-2 text-left">{t("reservationNumber")}</div>
          )}

          <div className="col-span-1 text-center">{t("quantity")}</div>
          <div className="col-span-2 text-right">{t("originalPrice")}</div>
          <div className="col-span-3 text-right">{t("totalPrice")}</div>
          <div className="col-span-1"></div>
        </div>

        {items.map((item, index) => (
          <div
            key={index}
            className={`grid gap-2 items-start ${isBookingRelated ? "grid-cols-12" : "grid-cols-10"
              }`}
          >
            {/* Description */}
            <div className={isBookingRelated ? "col-span-3" : "col-span-4"}>
              <input
                type="text"
                placeholder={t("itemDescription") as string}
                required
                value={item.description}
                onChange={(e) =>
                  handleItemChange(index, "description", e.target.value)
                }
                className={inputClass}
              />
              <div className="md:hidden mt-1 text-xs text-gray-500">
                Purchase: {(item.quantity * item.purchasePrice).toLocaleString()} {t("mad")}
              </div>
            </div>

            {/* Booking Ref (Conditional) */}
            {isBookingRelated && (
              <div className="col-span-2">
                <input
                  type="text"
                  placeholder={t("bookingRef") as string}
                  value={item.bookingRef || ""}
                  onChange={(e) =>
                    handleItemChange(index, "bookingRef", e.target.value)
                  }
                  className={inputClass}
                />
              </div>
            )}

            {/* Quantity */}
            <div className="col-span-1">
              <NumberInput
                min="1"
                required
                value={item.quantity}
                onChange={(e) =>
                  handleItemChange(index, "quantity", Number(e.target.value))
                }
                className={`${inputClass} text-center`}
                placeholder="Qty"
              />
            </div>

            {/* Purchase Price */}
            <div className="col-span-2">
              <NumberInput
                min="0"
                step="0.01"
                required
                value={item.purchasePrice}
                onChange={(e) =>
                  handleItemChange(index, "purchasePrice", Number(e.target.value))
                }
                className={`${inputClass} text-right`}
              />
              <div className="md:hidden mt-1 text-right text-xs text-gray-500">
                Total Pur: {(item.quantity * item.purchasePrice).toLocaleString()}
              </div>
            </div>

            {/* Sell Price */}
            <div className="col-span-3">
              <NumberInput
                min="0"
                step="0.01"
                required
                value={item.sellPrice}
                onChange={(e) =>
                  handleItemChange(index, "sellPrice", Number(e.target.value))
                }
                className={`${inputClass} text-right`}
              />
              <div className="md:hidden mt-1 text-right text-xs text-gray-500">
                Total Sell: {(item.quantity * item.sellPrice).toLocaleString()}
              </div>
            </div>


            {/* Delete button */}
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
          className="flex items-center gap-1 text-sm text-primary hover:text-primary/80 mt-2"
        >
          <Plus className="w-4 h-4" /> {t("addItem")}
        </button>
      </div>

      <div className="mt-6 p-4 bg-muted/50 rounded-lg space-y-3 border border-border">
        <div className="flex justify-between font-bold text-lg text-foreground">
          <span>{t("originalPrice")}:</span>{" "}
          <span>{originalPrice.toLocaleString()} {t("mad")}</span>
        </div>
        <div className="flex justify-between font-bold text-lg text-foreground">
          <span>{t("totalPrice")}:</span>{" "}
          <span>{totalPrice.toLocaleString()} {t("mad")}</span>
        </div>
        <div className="flex justify-between font-bold text-xl text-success border-t border-border pt-2">
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
};

export default DailyServiceForm;
