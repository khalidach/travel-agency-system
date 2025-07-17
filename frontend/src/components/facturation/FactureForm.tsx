// frontend/src/components/facturation/FactureForm.tsx
import React, { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Facture, FactureItem } from "../../context/models";
import { Plus, Trash2 } from "lucide-react";

interface FactureFormProps {
  onSave: (
    data: Omit<
      Facture,
      "id" | "facture_number" | "createdAt" | "updatedAt" | "userId"
    >
  ) => void;
  onCancel: () => void;
  existingFacture?: Facture | null;
  showMarginOnNew?: boolean;
}

interface FactureItemForm extends Omit<FactureItem, "total"> {
  prixUnitaire: number;
  fraisServiceUnitaire: number;
}

const emptyItem: FactureItemForm = {
  description: "",
  quantity: 1,
  prixUnitaire: 0,
  fraisServiceUnitaire: 0,
};

export default function FactureForm({
  onSave,
  onCancel,
  existingFacture,
  showMarginOnNew = true,
}: FactureFormProps) {
  const { t } = useTranslation();
  const [type, setType] = useState<"facture" | "devis">("facture");
  const [clientName, setClientName] = useState("");
  const [clientAddress, setClientAddress] = useState("");
  const [clientICE, setClientICE] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [items, setItems] = useState<FactureItemForm[]>([emptyItem]);
  const [notes, setNotes] = useState("");
  const [showMargin, setShowMargin] = useState(showMarginOnNew);

  useEffect(() => {
    if (existingFacture) {
      setType(existingFacture.type);
      setClientName(existingFacture.clientName);
      setClientAddress(existingFacture.clientAddress || "");
      setClientICE(existingFacture.clientICE || "");
      setDate(new Date(existingFacture.date).toISOString().split("T")[0]);
      setShowMargin(existingFacture.showMargin ?? true);

      let parsedItems: FactureItemForm[] = [emptyItem];
      if (existingFacture.items) {
        try {
          const itemsData =
            typeof existingFacture.items === "string"
              ? JSON.parse(existingFacture.items)
              : existingFacture.items;
          if (Array.isArray(itemsData) && itemsData.length > 0) {
            parsedItems = itemsData.map((item) => ({
              description: item.description || "",
              quantity: Number(item.quantity) || 1,
              prixUnitaire: Number(item.prixUnitaire) || 0,
              fraisServiceUnitaire: Number(item.fraisServiceUnitaire) || 0,
            }));
          }
        } catch (e) {
          console.error("Failed to parse facture items:", e);
        }
      }
      setItems(parsedItems);
      setNotes(existingFacture.notes || "");
    } else {
      setType("facture");
      setClientName("");
      setClientAddress("");
      setClientICE("");
      setDate(new Date().toISOString().split("T")[0]);
      setItems([emptyItem]);
      setNotes("");
      setShowMargin(showMarginOnNew);
    }
  }, [existingFacture, showMarginOnNew]);

  const handleItemChange = (
    index: number,
    field: keyof FactureItemForm,
    value: string | number
  ) => {
    const newItems = [...items];
    const item = { ...newItems[index], [field]: value };
    if (!showMargin) {
      item.fraisServiceUnitaire = 0;
    }
    newItems[index] = item;
    setItems(newItems);
  };

  const addItem = () => setItems([...items, { ...emptyItem }]);
  const removeItem = (index: number) =>
    setItems(items.filter((_, i) => i !== index));

  const calculatedTotals = useMemo(() => {
    let prixTotalHorsFrais = 0;
    let totalFraisServiceTTC = 0;

    const itemsWithTotals = items.map((item) => {
      const quantite = Number(item.quantity) || 0;
      const prixUnitaire = Number(item.prixUnitaire) || 0;
      const fraisServiceUnitaireTTC = showMargin
        ? Number(item.fraisServiceUnitaire) || 0
        : 0;

      const montantTotal =
        quantite * prixUnitaire + quantite * fraisServiceUnitaireTTC;

      prixTotalHorsFrais += quantite * prixUnitaire;
      totalFraisServiceTTC += quantite * fraisServiceUnitaireTTC;

      return { ...item, total: montantTotal };
    });

    const totalFraisServiceHT = totalFraisServiceTTC / 1.2;
    const tva = totalFraisServiceHT * 0.2;
    const totalFacture = prixTotalHorsFrais + totalFraisServiceTTC;

    return {
      itemsWithTotals,
      prixTotalHorsFrais,
      totalFraisServiceHT,
      tva,
      totalFacture,
    };
  }, [items, showMargin]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalItems = calculatedTotals.itemsWithTotals.map((item) => ({
      description: item.description,
      quantity: item.quantity,
      prixUnitaire: item.prixUnitaire,
      fraisServiceUnitaire: item.fraisServiceUnitaire,
      total: item.total,
    }));

    onSave({
      clientName,
      clientAddress,
      clientICE,
      date,
      items: finalItems,
      type,
      showMargin,
      prixTotalHorsFrais: calculatedTotals.prixTotalHorsFrais,
      totalFraisServiceHT: calculatedTotals.totalFraisServiceHT,
      tva: calculatedTotals.tva,
      total: calculatedTotals.totalFacture,
      notes,
    });
  };

  const gridColsClass = showMargin ? "grid-cols-12" : "grid-cols-10";
  const descColSpan = showMargin ? "md:col-span-4" : "md:col-span-4";
  const priceColSpan = showMargin ? "md:col-span-2" : "md:col-span-2";
  const totalColSpan = showMargin ? "md:col-span-2" : "md:col-span-2";

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <style>{`
        .toggle-checkbox:checked { right: 0; border-color: #3b82f6; }
        .toggle-checkbox:checked + .toggle-label { background-color: #3b82f6; }
      `}</style>
      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
        <label
          htmlFor="show-margin-toggle"
          className="font-medium text-gray-700"
        >
          Display Service Fees & TVA
        </label>
        <div className="relative inline-block w-10 mr-2 align-middle select-none transition duration-200 ease-in">
          <input
            type="checkbox"
            name="show-margin-toggle"
            id="show-margin-toggle"
            checked={showMargin}
            onChange={(e) => {
              const checked = e.target.checked;
              setShowMargin(checked);
              if (!checked) {
                setItems(
                  items.map((item) => ({ ...item, fraisServiceUnitaire: 0 }))
                );
              }
            }}
            className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer"
          />
          <label
            htmlFor="show-margin-toggle"
            className="toggle-label block overflow-hidden h-6 rounded-full bg-gray-300 cursor-pointer"
          ></label>
        </div>
      </div>

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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            {t("clientName")}
          </label>
          <input
            type="text"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
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
            {t("ice")}
          </label>
          <input
            type="text"
            value={clientICE}
            onChange={(e) => setClientICE(e.target.value)}
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
        <div
          className={`hidden md:grid ${gridColsClass} gap-2 text-sm font-medium text-gray-500`}
        >
          <div className={descColSpan}>DESIGNATION</div>
          <div className="col-span-1 text-center">QU</div>
          <div className={`${priceColSpan} text-left`}>PRIX UNITAIRE</div>
          {showMargin && (
            <div className="col-span-2 text-left">FRAIS. SCE UNITAIRE</div>
          )}
          <div className={`${totalColSpan} text-left`}>MONTANT TOTAL</div>
          <div className="col-span-1"></div>
        </div>
        {calculatedTotals.itemsWithTotals.map((item, index) => (
          <div
            key={index}
            className={`grid ${gridColsClass} gap-2 items-center`}
          >
            <div className={`col-span-12 ${descColSpan}`}>
              <input
                type="text"
                placeholder={t("description") as string}
                value={item.description}
                onChange={(e) =>
                  handleItemChange(index, "description", e.target.value)
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                required
              />
            </div>
            <div className="col-span-4 md:col-span-1">
              <input
                type="number"
                value={item.quantity}
                onChange={(e) =>
                  handleItemChange(index, "quantity", Number(e.target.value))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-center"
                required
              />
            </div>
            <div className={`col-span-8 ${priceColSpan}`}>
              <input
                type="number"
                value={item.prixUnitaire}
                onChange={(e) =>
                  handleItemChange(
                    index,
                    "prixUnitaire",
                    Number(e.target.value)
                  )
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-right"
                required
              />
            </div>
            {showMargin && (
              <div className="col-span-8 md:col-span-2">
                <input
                  type="number"
                  value={item.fraisServiceUnitaire}
                  onChange={(e) =>
                    handleItemChange(
                      index,
                      "fraisServiceUnitaire",
                      Number(e.target.value)
                    )
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-right"
                  required
                />
              </div>
            )}
            <div className={`col-span-10 ${totalColSpan}`}>
              <div className="w-full px-3 py-2 text-right font-medium bg-gray-100 rounded-md">
                {item.total.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </div>
            </div>
            <div className="col-span-2 md:col-span-1 flex items-end justify-end">
              <button
                type="button"
                onClick={() => removeItem(index)}
                className="text-red-500 hover:text-red-700 p-2"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
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

      <div className="flex justify-end mt-6">
        <div className="w-full max-w-sm space-y-2 text-sm">
          {showMargin && (
            <>
              <div className="flex justify-between p-2 bg-gray-50 rounded-md">
                <span className="font-medium text-gray-600">
                  Prix Total H. Frais de SCE
                </span>
                <span className="font-semibold text-gray-800">
                  {calculatedTotals.prixTotalHorsFrais.toLocaleString(
                    undefined,
                    {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    }
                  )}{" "}
                  {t("mad")}
                </span>
              </div>
              <div className="flex justify-between p-2">
                <span className="font-medium text-gray-600">
                  Frais de Service Hors TVA
                </span>
                <span className="font-semibold text-gray-800">
                  {calculatedTotals.totalFraisServiceHT.toLocaleString(
                    undefined,
                    {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    }
                  )}{" "}
                  {t("mad")}
                </span>
              </div>
              <div className="flex justify-between p-2">
                <span className="font-medium text-gray-600">TVA 20%</span>
                <span className="font-semibold text-gray-800">
                  {calculatedTotals.tva.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}{" "}
                  {t("mad")}
                </span>
              </div>
            </>
          )}
          <div className="flex justify-between font-bold text-lg border-t pt-2 mt-2 p-2 bg-gray-100 rounded-md">
            <span>Total Facture</span>
            <span>
              {calculatedTotals.totalFacture.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}{" "}
              {t("mad")}
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
