// frontend/src/components/booking/ReceiptPDF.tsx
import React from "react";
import { useTranslation } from "react-i18next";
import {
  Booking,
  Payment,
  Program,
  FacturationSettings,
} from "../../context/models";
import { useAuthContext } from "../../context/AuthContext";

interface ReceiptPDFProps {
  booking: Booking;
  payment: Payment;
  program?: Program;
  settings?: FacturationSettings;
}

export default function ReceiptPDF({
  booking,
  payment,
  program,
  settings,
}: ReceiptPDFProps) {
  const { t } = useTranslation();
  const { state: authState } = useAuthContext();
  const user = authState.user;

  return (
    <div
      className="bg-white p-10 font-sans text-sm"
      style={{ direction: "rtl", fontFamily: "Arial, sans-serif" }}
    >
      <div className="flex justify-between items-center mb-10 pb-4 border-gray-300">
        <div className="flex-1 text-right">
          <h2 className="text-3xl font-bold text-cyan-800">ايصال القبض</h2>
        </div>
        <div className="flex-1 text-left">
          <h1 className="text-3xl font-bold text-cyan-900">
            {user?.agencyName || "Nom de l'Agence"}
          </h1>
          {settings?.address && (
            <p className="text-2xl font-bold text-cyan-800 mt-1">
              {settings.address}
            </p>
          )}
          {settings?.phone && (
            <p className="text-2xl font-bold text-cyan-800">
              Tél: {settings.phone}
            </p>
          )}
          {settings?.email && (
            <p className="text-2xl font-bold text-cyan-800">
              Email: {settings.email}
            </p>
          )}
        </div>
      </div>
      <div className="mt-6 pb-4 flex justify-center items-center">
        <p className="text-xl mt-2 font-bold">
          N°: {booking.id}-{payment._id.substring(0, 5).toUpperCase()}
        </p>
      </div>
      <div className="mt-6 pb-4 flex justify-between items-center">
        <div className="flex-1 text-right">
          <p className="text-xl font-bold">
            التاريخ: {new Date(payment.date).toLocaleDateString()}
          </p>
        </div>
        <div className="flex-1 text-left">
          <p className="text-xl font-bold">OFFICIAL RECEIPT</p>
        </div>
      </div>

      <div className="border-2 border-blue-800 rounded-lg p-4 mb-6 flex flex-col">
        <div className="flex justify-between items-center mb-2">
          <p className="text-lg font-bold text-cyan-800">الإسم :</p>
          <p className="text-lg font-bold">{booking.clientNameAr}</p>
          <p dir="ltr" className="text-lg font-bold text-cyan-800">
            Nom :
          </p>
        </div>
        <div className="flex justify-between items-center mb-2">
          <p className="text-lg font-bold text-cyan-800">السعر :</p>
          <p className="text-lg font-bold">
            {" "}
            {booking.sellingPrice.toLocaleString()} درهم
          </p>
          <p dir="ltr" className="text-lg font-bold text-cyan-800">
            Prix :
          </p>
        </div>
        <div className="flex justify-between items-center mb-2">
          <p className="text-lg font-bold text-cyan-800">المبلغ المدفوع :</p>
          <p className="text-lg font-bold">
            {payment.amount.toLocaleString()} درهم
          </p>
          <p dir="ltr" className="text-lg font-bold text-cyan-800">
            Montant Payé :
          </p>
        </div>
        <div className="flex justify-between items-center mb-2">
          <p className="text-lg font-bold text-cyan-800"> الباقي :</p>
          <p className="text-lg font-bold">
            {booking.remainingBalance.toLocaleString()} درهم
          </p>
          <p dir="ltr" className="text-lg font-bold text-cyan-800">
            {" "}
            Montant Resté :
          </p>
        </div>
        <div className="flex justify-between items-center mb-2">
          <p className="text-lg font-bold text-cyan-800">وذلك عن :</p>
          <p className="text-lg font-bold">
            {program?.name || t("unknownProgram")}
          </p>
          <p dir="ltr" className="text-lg font-bold text-cyan-800">
            Pour :
          </p>
        </div>
        <div className="flex justify-between items-center mb-2">
          <p className="text-lg font-bold text-cyan-800">نوع الدفع :</p>
          <p className="text-lg font-bold">
            {t(payment.method)}
            {payment.method === "cheque" && (
              <div className="text-sm text-blue-800 mt-1">
                <p>
                  {t("chequeNumber")}: {payment.chequeNumber}
                </p>
                <p>
                  {t("bankName")}: {payment.bankName}
                </p>
              </div>
            )}
          </p>
          <p dir="ltr" className="text-lg font-bold text-cyan-800">
            Type de paiement :
          </p>
        </div>
      </div>
      <div className="flex items-center mt-6">
        <p className="text-2xl mr-7 text-cyan-800">الامضاء</p>
      </div>

      {/* <div className="mt-8 border-b pb-4">
        <h3 className="font-semibold text-gray-800">
          {t("clientName")}: {booking.clientNameFr}
        </h3>
        <p className="text-gray-600">
          {t("passportNumber")}: {booking.passportNumber}
        </p>
      </div>

      <div className="mt-8">
        <h4 className="text-lg font-semibold mb-4 text-gray-800">
          {t("priceDetails")}
        </h4>
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm font-medium text-gray-500">
              {t("programName")}
            </p>
            <p className="font-bold text-gray-900">
              {program?.name || t("unknownProgram")}
            </p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm font-medium text-gray-500">
              {t("sellingPrice")}
            </p>
            <p className="font-bold text-gray-900">
              {booking.sellingPrice.toLocaleString()} {t("mad")}
            </p>
          </div>
        </div>
        <div className="mt-4 p-4 bg-blue-50 rounded-lg">
          <h5 className="font-medium text-blue-800">
            {t("paymentAmount")}: {payment.amount.toLocaleString()} {t("mad")}
          </h5>
          <p className="text-sm text-blue-700 mt-1">
            {t("paymentMethod")}: {t(payment.method)}
          </p>
          {payment.method === "cheque" && (
            <div className="text-sm text-blue-700 mt-1">
              <p>
                {t("chequeNumber")}: {payment.chequeNumber}
              </p>
              <p>
                {t("bankName")}: {payment.bankName}
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="mt-8 pt-4 border-t border-gray-300">
        <div className="flex justify-between font-bold text-lg text-gray-900">
          <span>{t("remainingBalance")}</span>
          <span>
            {booking.remainingBalance.toLocaleString()} {t("mad")}
          </span>
        </div>
      </div> */}
    </div>
  );
}
