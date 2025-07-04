// frontend/src/components/facturation/FactureForm.tsx
import React, { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Facture, FactureItem } from "../../context/models";
import { Plus, Trash2 } from "lucide-react";

interface FactureFormProps {
  onSave: (data: Omit<Facture, "id" | "createdAt" | "updatedAt">) => void;
  onCancel: () => void;
  existingFacture?: Facture | null;
}

const emptyItem: FactureItem = {
  description: "",
  quantity: 1,
  unitPrice: 0,
  total: 0,
};

export default function FactureForm({
  onSave,
  onCancel,
  existingFacture,
}: FactureFormProps) {
  const { t } = useTranslation();
  const [type, setType] = useState<"facture" | "devis">("facture");
  const [clientName, setClientName] = useState("");
  const [clientAddress, setClientAddress] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [items, setItems] = useState<FactureItem[]>([emptyItem]);
  const [fraisDeService, setFraisDeService] = useState(0);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (existingFacture) {
      setType(existingFacture.type);
      setClientName(existingFacture.clientName);
      setClientAddress(existingFacture.clientAddress || "");
      setDate(new Date(existingFacture.date).toISOString().split("T")[0]);

      let parsedItems = [emptyItem];
      if (existingFacture.items) {
        try {
          const itemsData =
            typeof existingFacture.items === "string"
              ? JSON.parse(existingFacture.items)
              : existingFacture.items;
          if (Array.isArray(itemsData) && itemsData.length > 0) {
            parsedItems = itemsData;
          }
        } catch (e) {
          console.error("Failed to parse facture items:", e);
        }
      }
      setItems(parsedItems);

      // FIX: Ensure fraisDeService from existing data is treated as a number
      setFraisDeService(Number(existingFacture.fraisDeService) || 0);
      setNotes(existingFacture.notes || "");
    } else {
      // Reset form for a new document
      setType("facture");
      setClientName("");
      setClientAddress("");
      setDate(new Date().toISOString().split("T")[0]);
      setItems([emptyItem]);
      setFraisDeService(0);
      setNotes("");
    }
  }, [existingFacture]);

  const handleItemChange = (
    index: number,
    field: keyof FactureItem,
    value: string | number
  ) => {
    const newItems = [...items];
    const item = { ...newItems[index], [field]: value };
    if (field === "quantity" || field === "unitPrice") {
      item.total = (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0);
    }
    newItems[index] = item;
    setItems(newItems);
  };

  const addItem = () => setItems([...items, { ...emptyItem }]);
  const removeItem = (index: number) =>
    setItems(items.filter((_, i) => i !== index));

  const subTotal = useMemo(
    () => items.reduce((sum, item) => sum + item.total, 0),
    [items]
  );

  // FIX: Ensure fraisDeService is treated as a number for calculation
  const numericFraisDeService = Number(fraisDeService) || 0;

  const tva = useMemo(
    () => numericFraisDeService * 0.2,
    [numericFraisDeService]
  );

  const total = useMemo(
    () => subTotal + numericFraisDeService,
    [subTotal, numericFraisDeService]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      clientName,
      clientAddress,
      date,
      items,
      type,
      fraisDeService: numericFraisDeService,
      tva,
      total,
      notes,
      userId: 0,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            {t("documentType")}
          </label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as "facture" | "devis")}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
          >
            <option value="facture">{t("invoice")}</option>
            <option value="devis">{t("quote")}</option>
          </select>
        </div>
      </div>
      <h3 className="text-lg font-medium text-gray-900 border-b pb-2">
        {t("clientInfo")}
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            {t("clientName")}
          </label>
          <input
            type="text"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            {t("clientAddress")}
          </label>
          <input
            type="text"
            value={clientAddress}
            onChange={(e) => setClientAddress(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            {t("documentDate")}
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
            required
          />
        </div>
      </div>

      <h3 className="text-lg font-medium text-gray-900 border-b pb-2">
        {t("items")}
      </h3>
      <div className="space-y-4">
        {items.map((item, index) => (
          <div key={index} className="grid grid-cols-12 gap-2 items-center">
            <input
              type="text"
              placeholder={t("description") as string}
              value={item.description}
              onChange={(e) =>
                handleItemChange(index, "description", e.target.value)
              }
              className="col-span-5 px-3 py-2 border border-gray-300 rounded-md"
              required
            />
            <input
              type="number"
              placeholder={t("quantity") as string}
              value={item.quantity}
              onChange={(e) =>
                handleItemChange(index, "quantity", Number(e.target.value))
              }
              className="col-span-2 px-3 py-2 border border-gray-300 rounded-md"
              required
            />
            <input
              type="number"
              placeholder={t("unitPrice") as string}
              value={item.unitPrice}
              onChange={(e) =>
                handleItemChange(index, "unitPrice", Number(e.target.value))
              }
              className="col-span-2 px-3 py-2 border border-gray-300 rounded-md"
              required
            />
            <div className="col-span-2 px-3 py-2 text-right">
              {item.total.toLocaleString()} {t("mad")}
            </div>
            <button
              type="button"
              onClick={() => removeItem(index)}
              className="col-span-1 text-red-500 hover:text-red-700"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={addItem}
          className="inline-flex items-center px-3 py-1 text-sm bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
        >
          <Plus className="w-4 h-4 mr-1" /> {t("addItem")}
        </button>
      </div>

      <div className="flex justify-end">
        <div className="w-1/2 space-y-2">
          <div className="flex justify-between">
            <span>{t("subTotal")}</span>
            <span>
              {subTotal.toLocaleString()} {t("mad")}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <label className="text-sm font-medium text-gray-700">
              {t("serviceFee")}
            </label>
            <input
              type="number"
              value={fraisDeService}
              onChange={(e) => setFraisDeService(Number(e.target.value))}
              className="w-32 px-3 py-1 border border-gray-300 rounded-md"
            />
          </div>
          <div className="flex justify-between">
            <span>{t("tva")} (20%)</span>
            <span>
              {tva.toLocaleString()} {t("mad")}
            </span>
          </div>
          <div className="flex justify-between font-bold text-lg border-t pt-2">
            <span>{t("totalTTC")}</span>
            <span>
              {total.toLocaleString()} {t("mad")}
            </span>
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          {t("notes")}
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={t("notesPlaceholder") as string}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
          rows={3}
        ></textarea>
      </div>

      <div className="flex justify-end space-x-3 pt-6 border-t mt-6">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          {t("cancel")}
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          {existingFacture
            ? t("updateDocument")
            : type === "facture"
            ? t("createInvoice")
            : t("createQuote")}
        </button>
      </div>
    </form>
  );
}
