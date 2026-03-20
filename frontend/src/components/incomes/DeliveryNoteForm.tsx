// frontend/src/components/incomes/DeliveryNoteForm.tsx
import React, { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Income, FactureItem, Client } from "../../context/models";
import { Plus, Trash2 } from "lucide-react";
import NumberInput from "../ui/NumberInput";
import * as api from "../../services/api";

interface DeliveryNoteFormProps {
  initialData?: Income;
  onSubmit: (data: Partial<Income>) => void;
  onCancel: () => void;
  readOnly?: boolean;
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
  montant: 0,
};

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
  const [clientAddress, setClientAddress] = useState(initialData?.clientAddress || "");
  const [clientICE, setClientICE] = useState(initialData?.clientICE || "");
  const [showMargin, setShowMargin] = useState(initialData?.showMargin ?? true);
  const [notes, setNotes] = useState(initialData?.notes || "");
  const [manualNumber, setManualNumber] = useState("");

  const { data: clientsData } = useQuery({
      queryKey: ["clients", "all"],
      queryFn: () => api.getClients(false, 1, 1000),
  });
  const clients = clientsData?.clients || [];

  const [items, setItems] = useState<FactureItemForm[]>(() => {
    if (initialData?.items && initialData.items.length > 0) {
      try {
        return initialData.items.map((item: any) => ({
          description: item.description || "",
          quantity: Number(item.quantity) || 1,
          prixUnitaire: Number(item.prixUnitaire || item.unitPrice) || 0,
          fraisServiceUnitaire: Number(item.fraisServiceUnitaire) || 0,
          montant: Number(item.montant) || 0,
        }));
      } catch (e) {
        console.error("Failed to parse delivery note items:", e);
        return [emptyItem];
      }
    }
    if (initialData?.description && initialData?.amount) {
      return [
        {
          description: initialData.description,
          quantity: 1,
          prixUnitaire: initialData.amount,
          fraisServiceUnitaire: 0,
          montant: initialData.amount,
        },
      ];
    }
    return [emptyItem];
  });


  const handleItemChange = (
    index: number,
    field: keyof FactureItemForm,
    value: string | number,
  ) => {
    if (readOnly) return;
    const newItems = [...items];
    const item = { ...newItems[index], [field]: value };
    if (!showMargin) {
      item.fraisServiceUnitaire = 0;
    }
    newItems[index] = item;
    setItems(newItems);
  };

  const addItem = () => {
    if (!readOnly) setItems([...items, { ...emptyItem }]);
  };
  const removeItem = (index: number) => {
    if (!readOnly) setItems(items.filter((_, i) => i !== index));
  };

  const calculatedTotals = useMemo(() => {
    let prixTotalHorsFrais = 0;
    let totalFraisServiceTTC = 0;

    const itemsWithTotals = items.map((item) => {
      const quantite = Number(item.quantity) || 0;
      const prixUnitaire = Number(item.prixUnitaire) || 0;
      const fraisServiceUnitaireTTC = showMargin
        ? Number(item.fraisServiceUnitaire) || 0
        : 0;

      const montant = quantite * prixUnitaire;
      const montantTotal = montant + quantite * fraisServiceUnitaireTTC;

      prixTotalHorsFrais += montant;
      totalFraisServiceTTC += quantite * fraisServiceUnitaireTTC;

      return { ...item, montant, total: montantTotal };
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
    if (readOnly) return;

    const description =
      items.length === 1
        ? items[0].description
        : `${items.length} items (${items
          .map((i) => i.description)
          .join(", ")
          .slice(0, 50)}...)`;

    const finalItems = calculatedTotals.itemsWithTotals.map((item) => ({
      description: item.description,
      quantity: item.quantity,
      prixUnitaire: item.prixUnitaire,
      fraisServiceUnitaire: item.fraisServiceUnitaire,
      montant: item.montant,
      total: item.total,
    }));

    onSubmit({
      date,
      client,
      clientAddress,
      clientICE,
      items: finalItems,
      description,
      amount: calculatedTotals.totalFacture,
      type: "delivery_note",
      showMargin,
      prixTotalHorsFrais: calculatedTotals.prixTotalHorsFrais,
      totalFraisServiceHT: calculatedTotals.totalFraisServiceHT,
      tva: calculatedTotals.tva,
      notes,
      deliveryNoteNumber: manualNumber ? `${new Date().getFullYear()}-${manualNumber}` : undefined,
    });
  };

  const gridColsClass = showMargin ? "grid-cols-12" : "grid-cols-10";
  const descColSpan = showMargin ? "md:col-span-4" : "md:col-span-4";
  const priceColSpan = showMargin ? "md:col-span-2" : "md:col-span-2";
  const totalColSpan = showMargin ? "md:col-span-2" : "md:col-span-2";

  // Reusable styling classes
  const inputClass =
    "mt-1 block w-full px-3 py-2 bg-background text-foreground border border-input rounded-md focus:ring-1 focus:ring-ring focus:border-ring placeholder:text-muted-foreground disabled:opacity-60 disabled:cursor-not-allowed";
  const labelClass = "block text-sm font-medium text-foreground";
  const sectionHeaderClass =
    "text-lg font-medium text-foreground border-b border-border pb-2";

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
        <label
          htmlFor="show-margin-toggle"
          className="font-medium text-foreground"
        >
          {t("showMargin")}
        </label>
        <div className="relative inline-block w-10 mr-2 align-middle select-none transition duration-200 ease-in">
          <input
            type="checkbox"
            name="show-margin-toggle"
            id="show-margin-toggle"
            checked={showMargin}
            disabled={readOnly}
            onChange={(e) => {
              const checked = e.target.checked;
              setShowMargin(checked);
              if (!checked) {
                setItems(
                  items.map((item) => ({ ...item, fraisServiceUnitaire: 0 })),
                );
              }
            }}
            className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 border-muted appearance-none cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          />
          <label
            htmlFor="show-margin-toggle"
            className={`toggle-label block overflow-hidden h-6 rounded-full bg-gray-300 dark:bg-gray-600 ${readOnly ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
          ></label>
        </div>
      </div>

      <h3 className={sectionHeaderClass}>{t("clientInfo")}</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <label className={labelClass}>{t("deliveryNoteNumber", { defaultValue: "N° of delivery note" })}</label>
          {initialData?.deliveryNoteNumber ? (
            <input
              type="text"
              disabled
              value={initialData.deliveryNoteNumber}
              className={`${inputClass} bg-muted/30 font-semibold`}
            />
          ) : (
            <div className="relative flex mt-1">
              <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-input bg-muted/50 text-muted-foreground text-sm font-medium">
                {new Date().getFullYear()}-
              </span>
              <input
                type="text"
                disabled={readOnly}
                value={manualNumber}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, ""); // Only digits
                  setManualNumber(val);
                }}
                placeholder={t("autoGenerated", { defaultValue: "Auto-generated" }) as string}
                className="flex-1 block w-full px-3 py-2 rounded-none rounded-r-md border border-input bg-background text-foreground focus:ring-1 focus:ring-ring focus:border-ring placeholder:text-muted-foreground/50 disabled:opacity-60"
              />
            </div>
          )}
        </div>

        <div>
          <label className={labelClass}>{t("clientName")}</label>
          <input
            type="text"
            required
            list="clients-list"
            disabled={readOnly}
            placeholder={t("clientNamePlaceholder") as string}
            value={client}
            onChange={(e) => {
               const val = e.target.value;
               setClient(val);
               const matched = clients.find((c: Client) => c.name === val);
               if (matched) {
                   if (matched.address && !clientAddress) setClientAddress(matched.address);
                   if (matched.ice && !clientICE) setClientICE(matched.ice);
               }
            }}
            className={inputClass}
          />
          <datalist id="clients-list">
            {clients.map((c: Client) => (
              <option key={c.id} value={c.name} />
            ))}
          </datalist>
        </div>
        <div>
          <label className={labelClass}>{t("clientAddress")}</label>
          <input
            type="text"
            disabled={readOnly}
            value={clientAddress}
            onChange={(e) => setClientAddress(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>{t("ice")}</label>
          <input
            type="text"
            disabled={readOnly}
            value={clientICE}
            onChange={(e) => setClientICE(e.target.value)}
            className={inputClass}
          />
        </div>
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
        <div
          className={`hidden md:grid ${gridColsClass} gap-2 text-sm font-medium text-muted-foreground uppercase`}
        >
          <div className={descColSpan}>{t("designation")}</div>
          <div className="col-span-1 text-center">{t("qty")}</div>
          <div className={`${priceColSpan} text-left`}>{t("unitPrice")}</div>
          {showMargin && (
            <div className="col-span-2 text-left">{t("fraisUnitaire")}</div>
          )}
          <div className={`${totalColSpan} text-left`}>{t("totalAmount")}</div>
          {!readOnly && <div className="col-span-1"></div>}
        </div>

        {calculatedTotals.itemsWithTotals.map((item, index) => (
          <div
            key={index}
            className={`grid ${gridColsClass} gap-2 items-center`}
          >
            <div className={`col-span-12 ${descColSpan}`}>
              <textarea
                placeholder={t("description") as string}
                value={item.description}
                disabled={readOnly}
                onChange={(e) =>
                  handleItemChange(index, "description", e.target.value)
                }
                className={`${inputClass} min-h-[42px] leading-tight resize-y`}
                required
                rows={1}
              />
            </div>
            <div className="col-span-4 md:col-span-1">
              <NumberInput
                value={item.quantity}
                disabled={readOnly}
                onChange={(e) =>
                  handleItemChange(index, "quantity", Number(e.target.value))
                }
                className={`${inputClass} text-center`}
                required
              />
            </div>
            <div className={`col-span-8 ${priceColSpan}`}>
              <NumberInput
                value={item.prixUnitaire}
                disabled={readOnly}
                onChange={(e) =>
                  handleItemChange(
                    index,
                    "prixUnitaire",
                    Number(e.target.value),
                  )
                }
                className={`${inputClass} text-right`}
                required
              />
            </div>
            {showMargin && (
              <div className="col-span-8 md:col-span-2">
                <NumberInput
                  value={item.fraisServiceUnitaire}
                  disabled={readOnly}
                  onChange={(e) =>
                    handleItemChange(
                      index,
                      "fraisServiceUnitaire",
                      Number(e.target.value),
                    )
                  }
                  className={`${inputClass} text-right`}
                  required
                />
              </div>
            )}
            <div className={`col-span-10 ${totalColSpan}`}>
              <div className="w-full px-3 py-2 text-right font-medium bg-muted/50 text-foreground rounded-md border border-input">
                {item.total.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </div>
            </div>
            {!readOnly && (
              <div className="col-span-2 md:col-span-1 flex items-end justify-end">
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
          {showMargin && (
            <>
              <div className="flex justify-between p-2 bg-muted/30 rounded-md">
                <span className="font-medium text-muted-foreground">
                  {t("totalPriceHT")}
                </span>
                <span className="font-semibold text-foreground">
                  {calculatedTotals.prixTotalHorsFrais.toLocaleString(
                    undefined,
                    {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    },
                  )}{" "}
                  {t("currency.MAD")}
                </span>
              </div>
              <div className="flex justify-between p-2">
                <span className="font-medium text-muted-foreground">
                  {t("fraisServiceHTVA")}
                </span>
                <span className="font-semibold text-foreground">
                  {calculatedTotals.totalFraisServiceHT.toLocaleString(
                    undefined,
                    {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    },
                  )}{" "}
                  {t("currency.MAD")}
                </span>
              </div>
              <div className="flex justify-between p-2">
                <span className="font-medium text-muted-foreground">
                  {t("tva20")}
                </span>
                <span className="font-semibold text-foreground">
                  {calculatedTotals.tva.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}{" "}
                  {t("currency.MAD")}
                </span>
              </div>
            </>
          )}
          <div className="flex justify-between font-bold text-lg border-t border-border pt-2 mt-2 p-2 bg-muted/50 rounded-md text-foreground">
            <span>{t("total", { defaultValue: "Total Amount" })}</span>
            <span>
              {calculatedTotals.totalFacture.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}{" "}
              {t("currency.MAD")}
            </span>
          </div>
        </div>
      </div>

      <div>
        <label className={labelClass}>{t("notes")}</label>
        <textarea
          value={notes}
          disabled={readOnly}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={t("notesPlaceholder") as string}
          className={inputClass}
          rows={3}
        ></textarea>
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
            {initialData ? t("save") : t("addDeliveryNote", { defaultValue: "Create Delivery Note" })}
          </button>
        )}
      </div>
    </form>
  );
}
