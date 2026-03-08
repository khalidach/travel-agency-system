// frontend/src/components/incomes/DeliveryNoteForm.tsx
import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Income, ExpenseItem } from "../../context/models";
import { Plus, Trash2 } from "lucide-react";
import NumberInput from "../ui/NumberInput";

interface DeliveryNoteFormProps {
    initialData?: Income;
    onSubmit: (data: Partial<Income>) => void;
    onCancel: () => void;
    readOnly?: boolean;
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

export default function DeliveryNoteForm({
    initialData,
    onSubmit,
    onCancel,
    readOnly = false,
}: DeliveryNoteFormProps) {
    const { t } = useTranslation();

    const [date, setDate] = useState(
        initialData?.date
            ? new Date(initialData.date).toISOString().split("T")[0]
            : new Date().toISOString().split("T")[0],
    );

    const [client, setClient] = useState(initialData?.client || "");
    const [currency, setCurrency] = useState(initialData?.currency || "MAD");

    const [bookingType, setBookingType] = useState<BookingType>(
        (initialData?.bookingType as BookingType) || "Other",
    );

    const [referenceNumber, setReferenceNumber] = useState(
        initialData?.referenceNumber || "",
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
            client,
            currency,
            items,
            description,
            amount: totalAmount,
            type: "delivery_note",
            bookingType,
            referenceNumber: bookingType === "Hotel" ? referenceNumber : undefined,
        });
    };

    const isHotel = bookingType === "Hotel";
    const isFlight = bookingType === "Flight";

    // Reusable styling classes matched with FactureForm
    const inputClass =
        "mt-1 block w-full px-3 py-2 bg-background text-foreground border border-input rounded-md focus:ring-1 focus:ring-ring focus:border-ring placeholder:text-muted-foreground disabled:opacity-60 disabled:cursor-not-allowed";
    const labelClass = "block text-sm font-medium text-foreground";
    const sectionHeaderClass =
        "text-lg font-medium text-foreground border-b border-border pb-2";

    // Grid layout determination for items
    const gridColsClass = isHotel
        ? "grid-cols-12"
        : isFlight
            ? "grid-cols-12"
            : "grid-cols-10";

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className={labelClass}>{t("bookingType")}</label>
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
                                {t(`bookingTypes.${type}`, { defaultValue: type })}
                            </option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className={labelClass}>{t("currencyChoice")}</label>
                    <select
                        value={currency}
                        disabled={readOnly}
                        onChange={(e) => setCurrency(e.target.value)}
                        className={inputClass}
                    >
                        {currencies.map((cur) => (
                            <option key={cur} value={cur}>
                                {t(`currencyChoicen.${cur}`, { defaultValue: cur })}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            <h3 className={sectionHeaderClass}>{t("documentInfo", { defaultValue: "Document Information" })}</h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className={isHotel ? "" : "md:col-span-2"}>
                    <label className={labelClass}>{t("client")}</label>
                    <input
                        type="text"
                        required
                        disabled={readOnly}
                        placeholder={t("clientNamePlaceholder") as string}
                        value={client}
                        onChange={(e) => setClient(e.target.value)}
                        className={inputClass}
                    />
                </div>

                {isHotel && (
                    <div>
                        <label className={labelClass}>{t("reservationNumber")}</label>
                        <input
                            type="text"
                            placeholder="e.g., 12345ABC"
                            disabled={readOnly}
                            value={referenceNumber}
                            onChange={(e) => setReferenceNumber(e.target.value)}
                            className={inputClass}
                        />
                    </div>
                )}

                <div>
                    <label className={labelClass}>{t("date")}</label>
                    <input
                        type="date"
                        required
                        disabled={readOnly}
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className={`${inputClass} dark:[color-scheme:dark]`}
                    />
                </div>
            </div>

            <h3 className={sectionHeaderClass}>{t("items")}</h3>

            <div className="space-y-4">
                {/* Header Row */}
                <div
                    className={`hidden md:grid ${gridColsClass} gap-2 text-sm font-medium text-muted-foreground`}
                >
                    <div className={isHotel ? "col-span-3" : isFlight ? "col-span-4" : "col-span-4"}>
                        DESIGNATION
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

                    <div className={isHotel ? "col-span-1 text-center" : isFlight ? "col-span-1 text-center" : "col-span-2 text-center"}>
                        QU
                    </div>

                    {isHotel && <div className="col-span-1 text-center">{t("nights")}</div>}

                    <div className={isHotel ? "col-span-1 text-left" : isFlight ? "col-span-1 text-left" : "col-span-2 text-left"}>
                        PRIX UNITAIRE
                    </div>

                    <div className="col-span-2 text-left">MONTANT TOTAL</div>

                    {!readOnly && <div className="col-span-1"></div>}
                </div>

                {items.map((item, index) => (
                    <div
                        key={index}
                        className={`grid ${gridColsClass} gap-2 items-center`}
                    >
                        {/* Description */}
                        <div className={`col-span-12 ${isHotel ? "md:col-span-3" : isFlight ? "md:col-span-4" : "md:col-span-4"}`}>
                            <input
                                type="text"
                                placeholder={t("description") as string}
                                required
                                disabled={readOnly}
                                value={item.description}
                                onChange={(e) =>
                                    handleItemChange(index, "description", e.target.value)
                                }
                                className={inputClass}
                            />
                        </div>

                        {/* Hotel Check-in / Check-out */}
                        {isHotel && (
                            <>
                                <div className="col-span-6 md:col-span-2">
                                    <input
                                        type="date"
                                        required
                                        disabled={readOnly}
                                        value={item.checkIn || ""}
                                        onChange={(e) =>
                                            handleItemChange(index, "checkIn", e.target.value)
                                        }
                                        className={`${inputClass} dark:[color-scheme:dark]`}
                                    />
                                </div>
                                <div className="col-span-6 md:col-span-2">
                                    <input
                                        type="date"
                                        required
                                        disabled={readOnly}
                                        min={item.checkIn}
                                        value={item.checkOut || ""}
                                        onChange={(e) =>
                                            handleItemChange(index, "checkOut", e.target.value)
                                        }
                                        className={`${inputClass} dark:[color-scheme:dark]`}
                                    />
                                </div>
                            </>
                        )}

                        {/* Flight Departure / Return */}
                        {isFlight && (
                            <>
                                <div className="col-span-6 md:col-span-2">
                                    <input
                                        type="date"
                                        required
                                        disabled={readOnly}
                                        placeholder="Departure"
                                        value={item.departureDate || ""}
                                        onChange={(e) =>
                                            handleItemChange(index, "departureDate", e.target.value)
                                        }
                                        className={`${inputClass} dark:[color-scheme:dark]`}
                                    />
                                </div>
                                <div className="col-span-6 md:col-span-2">
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
                                        className={`${inputClass} dark:[color-scheme:dark]`}
                                    />
                                </div>
                            </>
                        )}

                        {/* Quantity */}
                        <div className={`col-span-4 ${isHotel ? "md:col-span-1" : isFlight ? "md:col-span-1" : "md:col-span-2"}`}>
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
                            <div className="col-span-4 md:col-span-1">
                                <NumberInput
                                    min="1"
                                    required
                                    readOnly
                                    disabled={true}
                                    value={item.nights || 1}
                                    onChange={(e) =>
                                        handleItemChange(index, "nights", Number(e.target.value))
                                    }
                                    className={`${inputClass} bg-muted/50 cursor-not-allowed text-center`}
                                    placeholder="Nights"
                                />
                            </div>
                        )}

                        {/* Price */}
                        <div className={`col-span-4 ${isHotel ? "md:col-span-1" : isFlight ? "md:col-span-1" : "md:col-span-2"}`}>
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

                        {/* Total */}
                        <div className="col-span-10 md:col-span-2">
                            <div className="w-full px-3 py-2 text-right font-medium bg-muted/50 text-foreground rounded-md border border-input">
                                {item.total.toLocaleString(undefined, {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                })}
                            </div>
                        </div>

                        {/* Delete */}
                        {!readOnly && (
                            <div className="col-span-2 md:col-span-1 flex items-center justify-end">
                                <button
                                    type="button"
                                    onClick={() => removeItem(index)}
                                    className="text-muted-foreground hover:text-red-500 p-2 transition-colors"
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
                        className="inline-flex items-center px-3 py-1.5 text-sm bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors"
                    >
                        <Plus className="w-4 h-4 mr-1" /> {t("addItem")}
                    </button>
                )}
            </div>

            <div className="flex justify-end mt-6">
                <div className="w-full max-w-sm space-y-2 text-sm">
                    <div className="flex justify-between font-bold text-lg border-t border-border pt-2 mt-2 p-2 bg-muted/50 rounded-md text-foreground">
                        <span>{t("total", { defaultValue: "Total Amount" })}</span>
                        <span>
                            {totalAmount.toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                            })}{" "}
                            {t(`currency.${currency}`, { defaultValue: currency })}
                        </span>
                    </div>
                </div>
            </div>

            <div className="flex justify-end space-x-3 pt-6 border-t border-border mt-6">
                <button
                    type="button"
                    onClick={onCancel}
                    className="px-4 py-2 text-foreground border border-input rounded-lg hover:bg-muted transition-colors"
                >
                    {readOnly ? t("close") : t("cancel")}
                </button>
                {!readOnly && (
                    <button
                        type="submit"
                        className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors shadow-sm"
                    >
                        {t("save")}
                    </button>
                )}
            </div>
        </form>
    );
}

