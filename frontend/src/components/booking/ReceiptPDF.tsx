// frontend/src/components/booking/ReceiptPDF.tsx
import { useMemo } from "react";
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
  groupBookings?: Booking[];
}

export default function ReceiptPDF({
  booking,
  payment,
  program,
  settings,
  groupBookings,
}: ReceiptPDFProps) {
  const { t } = useTranslation();
  const { state: authState } = useAuthContext();
  const user = authState.user;

  // Memoize the calculation to get the total of payments made BEFORE the current one
  const { displayClientNameFr, displayClientNameAr, totalSellingPrice, paymentsBeforeThis, remainingAfterThisPayment, currentPaymentAmount } = useMemo(() => {
    if (!booking || !payment || !booking.advancePayments) {
      return {
        isGroup: false,
        displayClientNameFr: "",
        displayClientNameAr: "",
        totalSellingPrice: Number(booking?.sellingPrice || 0),
        paymentsBeforeThis: [],
        remainingAfterThisPayment: Number(booking?.sellingPrice || 0),
        currentPaymentAmount: Number(payment?.amount || 0),
      };
    }

    if (payment.isGroupPayment && groupBookings && groupBookings.length > 0) {
      const allPaymentsMap = new Map<string, Payment>();
      groupBookings.forEach(b => {
        (b.advancePayments || []).forEach(p => {
          if (p.isGroupPayment && !p.isLeader) return;
          allPaymentsMap.set(p._id, p);
        });
      });

      const allUniquePayments = Array.from(allPaymentsMap.values());
      let currentPaymentIndex = allUniquePayments.findIndex(p => p._id === payment._id);

      // If the payment is missing from groupBookings (e.g., stale data), add it manually
      if (currentPaymentIndex === -1) {
        allUniquePayments.push(payment);
      }

      // Sort chronologically by ID
      allUniquePayments.sort((a, b) => Number(a._id) - Number(b._id));
      currentPaymentIndex = allUniquePayments.findIndex(p => p._id === payment._id);

      const paymentsBeforeThis = allUniquePayments.slice(0, currentPaymentIndex);
      const paymentsUpToThisPoint = allUniquePayments.slice(0, currentPaymentIndex + 1);

      const totalPaidUpToThisPoint = paymentsUpToThisPoint.reduce((sum, p) => sum + Number(p.groupAmount || p.amount || 0), 0);
      const totalSellingPrice = groupBookings.reduce((sum, b) => sum + Number(b.sellingPrice || 0), 0);
      const remainingAfterThisPayment = totalSellingPrice - totalPaidUpToThisPoint;

      const combinedNamesFr = groupBookings.map(b => `${b.clientNameFr.firstName} ${b.clientNameFr.lastName}`).join(" & ");
      const combinedNamesAr = groupBookings.map(b => b.clientNameAr || `${b.clientNameFr.firstName} ${b.clientNameFr.lastName}`).join(" و ");

      // The leader's copy has the full groupAmount. If only the member's copy is available, fallback.
      const leaderCopy = allUniquePayments.find(p => p._id === payment._id);
      const correctCurrentPaymentAmount = leaderCopy?.groupAmount || payment.groupAmount || payment.amount || 0;

      return {
        isGroup: true,
        displayClientNameFr: combinedNamesFr,
        displayClientNameAr: combinedNamesAr,
        totalSellingPrice,
        paymentsBeforeThis,
        remainingAfterThisPayment,
        currentPaymentAmount: Number(correctCurrentPaymentAmount),
      };
    }

    // Normal logic
    const currentPaymentIndex = booking.advancePayments.findIndex((p) => p._id === payment._id);
    const paymentsBeforeThis = booking.advancePayments.slice(0, currentPaymentIndex);
    const paymentsUpToThisPoint = booking.advancePayments.slice(0, currentPaymentIndex + 1);
    const totalPaidUpToThisPoint = paymentsUpToThisPoint.reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const remainingAfterThisPayment = Number(booking.sellingPrice || 0) - totalPaidUpToThisPoint;

    return {
      isGroup: false,
      displayClientNameFr: `${booking.clientNameFr.firstName} ${booking.clientNameFr.lastName}`.trim(),
      displayClientNameAr: booking.clientNameAr || "",
      totalSellingPrice: Number(booking.sellingPrice || 0),
      paymentsBeforeThis,
      remainingAfterThisPayment,
      currentPaymentAmount: Number(payment.amount || 0),
    };
  }, [booking, payment, groupBookings]);

  return (
    <div
      className="bg-white text-gray-900 p-10 font-sans text-sm"
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
      <div className="mt-6 pb-1 flex justify-center items-center">
        <p className="text-xl text-gray-900 mt-2 font-bold">
          N°: {booking.id}-{payment._id.substring(0, 5).toUpperCase()}
        </p>
      </div>
      <div className="pb-4 flex justify-center items-center">
        <div className="text-xl font-bold text-gray-900">
          {/* NEW: Display labelPaper here */}
          {payment.labelPaper && (
            <p className="text-lg font-bold text-gray-900 mt-1">
              Label Papier N°: {payment.labelPaper}
            </p>
          )}
        </div>
      </div>
      <div className="mt-6 pb-4 flex justify-between items-center">
        <div className="flex-1 text-right">
          <p className="text-xl font-bold text-gray-900">
            التاريخ: {new Date(payment.date).toLocaleDateString()}
          </p>
        </div>
        <div className="flex-1 text-left">
          <p className="text-xl font-bold text-gray-900">OFFICIAL RECEIPT</p>
        </div>
      </div>

      <div className="border-2 border-blue-800 rounded-lg p-4 mb-6 flex flex-col text-gray-900">
        <div className="flex justify-between items-center mb-2">
          <p className="text-lg font-bold text-cyan-800">الإسم :</p>
          <p className="text-lg font-bold text-gray-900">{displayClientNameAr ? displayClientNameAr : displayClientNameFr}</p>
          <p dir="ltr" className="text-lg font-bold text-cyan-800">
            Nom :
          </p>
        </div>
        <div className="flex justify-between items-center mb-2">
          <p className="text-lg font-bold text-cyan-800">السعر الإجمالي :</p>
          <p className="text-lg font-bold text-gray-900">
            {" "}
            {totalSellingPrice.toLocaleString()} درهم
          </p>
          <p dir="ltr" className="text-lg font-bold text-cyan-800">
            Prix Total :
          </p>
        </div>
        <div className="flex justify-between items-center mb-2">
          <p className="text-lg font-bold text-cyan-800">
            المبلغ المدفوع حاليا :
          </p>
          <p className="text-lg font-bold text-gray-900">
            {currentPaymentAmount.toLocaleString()} درهم
          </p>
          <p dir="ltr" className="text-lg font-bold text-cyan-800">
            Montant Payé actuel :
          </p>
        </div>
        <div className="flex justify-between items-center mb-2">
          <p className="text-lg font-bold text-cyan-800"> الباقي :</p>
          <p className="text-lg font-bold text-gray-900">
            {remainingAfterThisPayment.toLocaleString()} درهم
          </p>
          <p dir="ltr" className="text-lg font-bold text-cyan-800">
            {" "}
            Montant Resté :
          </p>
        </div>
        <div className="flex justify-between items-center mb-2">
          <p className="text-lg font-bold text-cyan-800">وذلك عن :</p>
          <p className="text-lg font-bold text-gray-900">
            {program?.name || t("unknownProgram")}
          </p>
          <p dir="ltr" className="text-lg font-bold text-cyan-800">
            Pour :
          </p>
        </div>
        <div className="flex justify-between items-center mb-2">
          <p className="text-lg font-bold text-cyan-800">نوع الدفع :</p>
          <p className="text-lg font-bold text-gray-900">
            {t(payment.method)}
            {payment.method === "cheque" && (
              <span className="block text-sm text-blue-800 mt-1">
                <span className="block">
                  {t("chequeNumber")}: {payment.chequeNumber}
                </span>
                <span className="block">
                  {t("bankName")}: {payment.bankName}
                </span>
              </span>
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
          <table className="w-full text-sm text-gray-900 table-auto border border-cyan-900 p-3">
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
              {paymentsBeforeThis.map((prevPayment) => (
                <tr key={prevPayment._id}>
                  <td className="border border-cyan-900 text-lg  px-4 py-2 align-middle">
                    {Number(prevPayment.groupAmount || prevPayment.amount || 0).toLocaleString()} درهم
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
