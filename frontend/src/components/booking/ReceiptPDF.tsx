// frontend/src/components/booking/ReceiptPDF.tsx
import React, { useMemo } from "react";
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

  // Memoize the calculation to get the total of payments made BEFORE the current one
  const { paymentsBeforeThis, remainingAfterThisPayment } = useMemo(() => {
    if (!booking || !payment || !booking.advancePayments) {
      return {
        paymentsBeforeThis: [],
        remainingAfterThisPayment: booking.sellingPrice,
      };
    }

    // Find the index of the current payment in the array. We use `_id` for uniqueness.
    const currentPaymentIndex = booking.advancePayments.findIndex(
      (p) => p._id === payment._id
    );

    // Get the array of all payments that occurred before the current one.
    const paymentsBeforeThis = booking.advancePayments.slice(
      0,
      currentPaymentIndex
    );

    // Sum all payments up to and including the current one to get the new remaining balance.
    const paymentsUpToThisPoint = booking.advancePayments.slice(
      0,
      currentPaymentIndex + 1
    );
    const totalPaidUpToThisPoint = paymentsUpToThisPoint.reduce(
      (sum, p) => sum + p.amount,
      0
    );

    const remainingAfterThisPayment =
      booking.sellingPrice - totalPaidUpToThisPoint;

    return { paymentsBeforeThis, remainingAfterThisPayment };
  }, [booking, payment]);

  const clientNameFr =
    `${booking.clientNameFr.firstName} ${booking.clientNameFr.lastName}`.trim();

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
            Nom : {clientNameFr}
          </p>
        </div>
        <div className="flex justify-between items-center mb-2">
          <p className="text-lg font-bold text-cyan-800">السعر الإجمالي :</p>
          <p className="text-lg font-bold">
            {" "}
            {booking.sellingPrice.toLocaleString()} درهم
          </p>
          <p dir="ltr" className="text-lg font-bold text-cyan-800">
            Prix Total :
          </p>
        </div>
        <div className="flex justify-between items-center mb-2">
          <p className="text-lg font-bold text-cyan-800">
            المبلغ المدفوع حاليا :
          </p>
          <p className="text-lg font-bold">
            {payment.amount.toLocaleString()} درهم
          </p>
          <p dir="ltr" className="text-lg font-bold text-cyan-800">
            Montant Payé actuel :
          </p>
        </div>
        <div className="flex justify-between items-center mb-2">
          <p className="text-lg font-bold text-cyan-800"> الباقي :</p>
          <p className="text-lg font-bold">
            {remainingAfterThisPayment.toLocaleString()} درهم
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
      <div className="flex items-center mt-6 mb-16">
        <p className="text-2xl mr-7 text-cyan-800">الامضاء</p>
      </div>

      {paymentsBeforeThis.length > 0 && (
        <div className="mt-32 border-t-2 border-gray-200 pt-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">
            الدفوعات السابقة
          </h3>
          <table className="w-full text-sm text-gray-600 table-auto border border-cyan-900 p-3">
            <thead>
              <tr>
                <th className="border border-cyan-900 font-bold text-lg text-cyan-800 text-right  px-4 py-2 align-middle">
                  المبلغ
                </th>
                <th className="border border-cyan-900 font-bold text-lg text-cyan-800 text-right  px-4 py-2 align-middle">
                  رقم الإيصال
                </th>
                <th className="border border-cyan-900 font-bold text-lg text-cyan-800 text-right  px-4 py-2 align-middle">
                  التاريخ
                </th>
              </tr>
            </thead>
            <tbody>
              {paymentsBeforeThis.map((prevPayment, index) => (
                <tr key={prevPayment._id}>
                  <td className="border border-cyan-900 text-lg  px-4 py-2 align-middle">
                    {prevPayment.amount.toLocaleString()} درهم
                  </td>
                  <td className="border border-cyan-900 text-lg  px-4 py-2 align-middle">
                    {booking.id}-{prevPayment._id.substring(0, 5).toUpperCase()}
                  </td>
                  <td className="border border-cyan-900 text-lg  px-4 py-2 align-middle">
                    {new Date(prevPayment.date).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
