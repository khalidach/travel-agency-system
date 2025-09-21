import React from "react";
import { useTranslation } from "react-i18next";
import { DailyService, FacturationSettings, User } from "../../context/models";
import { numberToWordsFr } from "../../services/numberToWords";

interface ServiceReceiptPDFProps {
  service: DailyService;
  settings?: FacturationSettings;
  user?: User | null;
}

export default function ServiceReceiptPDF({
  service,
  settings,
  user,
}: ServiceReceiptPDFProps) {
  const { t } = useTranslation();

  const totalInWords = numberToWordsFr(service.totalPrice);

  return (
    <div
      className="bg-white p-10 font-sans text-sm"
      style={{
        direction: "rtl",
        fontFamily: "Arial, sans-serif",
        width: "210mm",
      }}
    >
      <div className="flex justify-between items-center mb-10 pb-4 border-b-2 border-gray-300">
        <div className="flex-1 text-right">
          <h2 className="text-3xl font-bold text-cyan-800">وصل خدمة</h2>
        </div>
        <div className="flex-1 text-left">
          <h1 className="text-3xl font-bold text-cyan-900">
            {user?.agencyName || "Nom de l'Agence"}
          </h1>
          {settings?.address && (
            <p className="text-lg font-bold text-cyan-800 mt-1">
              {settings.address}
            </p>
          )}
          {settings?.phone && (
            <p className="text-lg font-bold text-cyan-800">
              Tél: {settings.phone}
            </p>
          )}
          {settings?.email && (
            <p className="text-lg font-bold text-cyan-800">
              Email: {settings.email}
            </p>
          )}
        </div>
      </div>

      <div className="mt-6 pb-4 flex justify-center items-center">
        <p className="text-xl mt-2 font-bold">N°: SRV-{service.id}</p>
      </div>
      <div className="mt-6 pb-4 flex justify-between items-center">
        <div className="flex-1 text-right">
          <p className="text-xl font-bold">
            التاريخ: {new Date(service.date).toLocaleDateString()}
          </p>
        </div>
        <div className="flex-1 text-left">
          <p className="text-xl font-bold">SERVICE RECEIPT</p>
        </div>
      </div>

      <div className="border-2 border-blue-800 rounded-lg p-4 mb-6 flex flex-col space-y-3">
        <div className="flex justify-between items-center">
          <p className="text-lg font-bold text-cyan-800">الخدمة:</p>
          <p className="text-lg font-bold">{service.serviceName}</p>
          <p dir="ltr" className="text-lg font-bold text-cyan-800">
            Service:
          </p>
        </div>
        <div className="flex justify-between items-center">
          <p className="text-lg font-bold text-cyan-800">النوع:</p>
          <p className="text-lg font-bold">{t(service.type)}</p>
          <p dir="ltr" className="text-lg font-bold text-cyan-800">
            Type:
          </p>
        </div>
        <div className="flex justify-between items-center">
          <p className="text-lg font-bold text-cyan-800">السعر الإجمالي:</p>
          <p className="text-lg font-bold">
            {service.totalPrice.toLocaleString()} {t("mad")}
          </p>
          <p dir="ltr" className="text-lg font-bold text-cyan-800">
            Prix Total:
          </p>
        </div>
        <div className="flex justify-between items-center">
          <p className="text-lg font-bold text-cyan-800">دفع:</p>
          <p className="text-lg font-bold">
            {service.totalPrice.toLocaleString()} {t("mad")}
          </p>
          <p dir="ltr" className="text-lg font-bold text-cyan-800">
            Payé:
          </p>
        </div>
        <div className="flex justify-between items-center">
          <p className="text-lg font-bold text-cyan-800">الباقي:</p>
          <p className="text-lg font-bold">
            {(service.totalPrice - service.totalPrice).toLocaleString()}{" "}
          </p>
          <p dir="ltr" className="text-lg font-bold text-cyan-800">
            Reste:
          </p>
        </div>
      </div>

      <div className="mt-8 text-xs">
        <p>Arrêté le présent reçu à la somme de :</p>
        <p className="font-bold capitalize">{totalInWords}</p>
      </div>

      <div className="flex items-center mt-6 mb-16">
        <p className="text-2xl mr-7 text-cyan-800">الامضاء</p>
      </div>
    </div>
  );
}
