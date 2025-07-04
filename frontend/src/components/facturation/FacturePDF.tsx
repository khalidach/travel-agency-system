// frontend/src/components/facturation/FacturePDF.tsx
import React from "react";
import { useQuery } from "@tanstack/react-query";
import * as api from "../../services/api";
import { Facture, FacturationSettings } from "../../context/models";
import { useAuthContext } from "../../context/AuthContext";
import { numberToWordsFr } from "../../services/numberToWords";

interface FacturePDFProps {
  facture: Facture;
}

export default function FacturePDF({ facture }: FacturePDFProps) {
  const { data: settings } = useQuery<FacturationSettings>({
    queryKey: ["settings"],
    queryFn: api.getSettings,
  });
  const { state: authState } = useAuthContext();

  const subTotal = facture.items.reduce((sum, item) => sum + item.total, 0);
  const totalInWords = numberToWordsFr(facture.total);

  return (
    <div
      className="bg-white p-10 font-sans"
      style={{ width: "210mm", minHeight: "297mm" }}
    >
      <div className="grid grid-cols-2 gap-10">
        <div>
          <h1 className="text-2xl font-bold">
            {authState.user?.agencyName || "Your Agency"}
          </h1>
        </div>
        <div className="text-right">
          <h2 className="text-4xl font-bold uppercase text-gray-700">
            {facture.type}
          </h2>
          <p className="text-sm"># {facture.id}</p>
          <p className="text-sm">
            Date: {new Date(facture.date).toLocaleDateString()}
          </p>
        </div>
      </div>

      <div className="mt-10 border-t pt-5">
        <h3 className="font-semibold">Client:</h3>
        <p>{facture.clientName}</p>
        <p>{facture.clientAddress}</p>
      </div>

      <table className="w-full mt-10 text-sm">
        <thead className="bg-gray-100">
          <tr>
            <th className="p-2 text-left font-semibold">Description</th>
            <th className="p-2 text-center font-semibold">Quantity</th>
            <th className="p-2 text-right font-semibold">Unit Price</th>
            <th className="p-2 text-right font-semibold">Total</th>
          </tr>
        </thead>
        <tbody>
          {facture.items.map((item, index) => (
            <tr key={index} className="border-b">
              <td className="p-2">{item.description}</td>
              <td className="p-2 text-center">{item.quantity}</td>
              <td className="p-2 text-right">
                {item.unitPrice.toLocaleString()}
              </td>
              <td className="p-2 text-right">{item.total.toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex justify-end mt-5">
        <div className="w-1/2 space-y-2">
          <div className="flex justify-between">
            <span>Sous-Total</span>
            <span>{subTotal.toLocaleString()} MAD</span>
          </div>
          <div className="flex justify-between">
            <span>Frais de service</span>
            <span>{facture.fraisDeService.toLocaleString()} MAD</span>
          </div>

          <div className="flex justify-between font-bold text-xl bg-gray-100 p-2 rounded">
            <span>TOTAL TTC</span>
            <span>{facture.total.toLocaleString()} MAD</span>
          </div>
          <div className="flex justify-between">
            <span>TVA (20%)</span>
            <span>{facture.tva.toLocaleString()} MAD</span>
          </div>
        </div>
      </div>

      {facture.notes && (
        <div className="mt-10 border-t pt-5">
          <h3 className="font-semibold">Notes:</h3>
          <p className="text-xs">{facture.notes}</p>
        </div>
      )}

      <div className="mt-8 text-sm">
        <p>Arrêté la présente facture à la somme de :</p>
        <p className="font-bold capitalize">{totalInWords}</p>
      </div>

      <div className="mt-10 border-t pt-5">
        <div className="flex gap-2 justify-center flex-wrap">
          <div className="flex gap-2 flex-wrap justify-center w-full">
            {settings?.address && (
              <p className="text-lg">Address: {settings.address}</p>
            )}
            {settings?.phone && (
              <p className="text-lg">Tel: {settings.phone}</p>
            )}
            {settings?.email && (
              <p className="text-lg">Email: {settings.email}</p>
            )}
          </div>
          <div className="flex gap-2 flex-wrap justify-center w-full">
            {settings?.ice && <p className="text-lg">ICE: {settings.ice}</p>}
            {settings?.if && <p className="text-lg">IF: {settings.if}</p>}
            {settings?.rc && <p className="text-lg">RC: {settings.rc}</p>}
            {settings?.patente && (
              <p className="text-lg">Patente: {settings.patente}</p>
            )}
            {settings?.cnss && <p className="text-lg">CNSS: {settings.cnss}</p>}
          </div>
        </div>
      </div>

      {settings?.bankName && (
        <div className="mt-10 border-t pt-5">
          <h3 className="font-semibold">Bank Details:</h3>
          <p className="text-xs">Bank: {settings.bankName}</p>
          <p className="text-xs">RIB: {settings.rib}</p>
        </div>
      )}
    </div>
  );
}
