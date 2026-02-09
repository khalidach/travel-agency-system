import { useTranslation } from "react-i18next";
import {
  DailyService,
  FacturationSettings,
  User,
  Payment,
} from "../../context/models";
import { numberToWordsFr } from "../../services/numberToWords";

interface ServiceReceiptPDFProps {
  service: DailyService;
  payment: Payment; // The specific payment for this receipt
  paymentsBeforeThis: Payment[]; // All payments made before this one
  settings?: FacturationSettings;
  user?: User | null;
}

export default function ServiceReceiptPDF({
  service,
  payment,
  paymentsBeforeThis,
  settings,
  user,
}: ServiceReceiptPDFProps) {
  const { t } = useTranslation();

  // Calculate remaining balance after THIS specific payment
  const totalPaidUpToThisPoint =
    paymentsBeforeThis.reduce((sum, p) => sum + p.amount, 0) + payment.amount;

  const remainingAfterThisPayment = service.totalPrice - totalPaidUpToThisPoint;

  const totalInWords = numberToWordsFr(payment.amount);

  // Find the current payment's index to generate a unique receipt number
  const currentPaymentIndex = service.advancePayments?.findIndex(
    (p) => p._id === payment._id,
  );

  const receiptNumber = `SRV-${service.id}-${
    currentPaymentIndex !== undefined && currentPaymentIndex > -1
      ? currentPaymentIndex + 1
      : 1
  }`;

  // Helper to format currency
  const formatMAD = (amount: number) =>
    `${Number(amount).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} ${t("mad")}`;

  return (
    <div
      className="bg-white p-10 font-sans text-sm"
      style={{
        direction: "rtl",
        fontFamily: "Arial, sans-serif",
        width: "210mm",
        minHeight: "297mm",
        color: "#1f2937", // Default text color
      }}
    >
      {/* Header Section */}
      <div className="flex justify-between items-center mb-8 pb-4 border-b-2 border-cyan-300">
        <div className="flex-1 text-right">
          <h2 className="text-3xl font-bold text-cyan-800">وصل خدمة</h2>
        </div>
        <div className="flex-1 text-left">
          <h1 className="text-2xl font-bold text-cyan-900">
            {user?.agencyName || "Nom de l'Agence"}
          </h1>
          {settings?.address && (
            <p className="text-sm font-bold text-cyan-800 mt-1">
              {settings.address}
            </p>
          )}
          {settings?.phone && (
            <p className="text-sm font-bold text-cyan-800">
              Tél: {settings.phone}
            </p>
          )}
          {settings?.email && (
            <p className="text-sm font-bold text-cyan-800">
              Email: {settings.email}
            </p>
          )}
        </div>
      </div>
      <div
        className="text-xl font-bold text-gray-800 mt-6 pb-1 flex justify-center items-center"
        style={{ direction: "ltr" }}
      >
        N°: <span className="text-blue-600">{receiptNumber}</span>
      </div>
      {/* Receipt Details */}
      <div className="flex justify-between items-center mb-6">
        <div
          className="text-xl font-bold text-gray-800"
          style={{ direction: "rtl" }}
        >
          {/* NEW: Display labelPaper here */}
          {payment.labelPaper && (
            <div className="text-xl font-bold text-gray-800">
              رقم الوصل الورقي:{" "}
              <span className="text-blue-600">{payment.labelPaper}</span>
            </div>
          )}
        </div>
        <div className="text-xl font-bold text-gray-800">
          التاريخ:{" "}
          <span className="text-blue-600">
            {new Date(payment.date).toLocaleDateString()}
          </span>
        </div>
      </div>

      {/* Transaction Summary */}
      <div className="border-2 border-blue-800 rounded-lg p-6 mb-8 flex flex-col space-y-3 bg-blue-50/50">
        <div className="grid grid-cols-2 gap-4">
          <p
            className="text-lg font-bold text-cyan-800"
            style={{ direction: "rtl" }}
          >
            الخدمة:
          </p>
          <p className="text-lg font-bold text-right">{service.serviceName}</p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <p
            className="text-lg font-bold text-cyan-800"
            style={{ direction: "rtl" }}
          >
            النوع:
          </p>
          <p className="text-lg font-bold text-right">{t(service.type)}</p>
        </div>
        <div className="grid grid-cols-2 gap-4 border-t pt-2 border-gray-300">
          <p
            className="text-xl font-bold text-cyan-800"
            style={{ direction: "rtl" }}
          >
            السعر الإجمالي:
          </p>
          <p className="text-xl font-bold text-right">
            {formatMAD(service.totalPrice)}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <p
            className="text-xl font-bold text-cyan-800"
            style={{ direction: "rtl" }}
          >
            المبلغ المدفوع حالياً:
          </p>
          <p className="text-xl font-bold text-right text-emerald-600">
            {formatMAD(payment.amount)}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <p
            className="text-lg font-bold text-cyan-800"
            style={{ direction: "rtl" }}
          >
            طريقة الدفع:
          </p>
          <div className="text-lg font-bold text-right">
            {t(payment.method)}
            {payment.method === "cheque" && (
              <div className="text-sm text-blue-800 mt-1" dir="rtl">
                <p>رقم الشيك: {payment.chequeNumber}</p>
                <p>البنك: {payment.bankName}</p>
                <p>
                  تاريخ الصرف:{" "}
                  {new Date(payment.chequeCashingDate!).toLocaleDateString()}
                </p>
              </div>
            )}
            {payment.method === "transfer" && (
              <div className="text-sm text-blue-800 mt-1" dir="rtl">
                <p>اسم المحول: {payment.transferPayerName}</p>
                <p>المرجع: {payment.transferReference}</p>
              </div>
            )}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 border-t pt-2 border-gray-300">
          <p
            className="text-xl font-bold text-cyan-800"
            style={{ direction: "rtl" }}
          >
            الباقي بعد هذه الدفعة:
          </p>
          <p className="text-xl font-bold text-right text-red-600">
            {formatMAD(remainingAfterThisPayment)}
          </p>
        </div>
      </div>

      {/* Amount in Words */}
      <div className="mt-8 text-lg font-medium">
        <p style={{ direction: "rtl" }}>:المبلغ المدفوع هو</p>
        <p className="font-bold capitalize text-xl text-blue-800">
          {totalInWords}
        </p>
      </div>

      {/* Previous Payments Table */}
      {paymentsBeforeThis.length > 0 && (
        <div className="mt-12 border-t pt-6">
          <h3
            className="text-xl font-bold text-gray-900 mb-4"
            style={{ direction: "rtl" }}
          >
            الدفوعات السابقة (قبل هذا الوصل)
          </h3>
          <table className="w-full text-sm text-gray-600 table-auto border border-cyan-900">
            <thead>
              <tr className="bg-cyan-50">
                <th className="border border-cyan-900 font-bold text-base text-cyan-800 text-right px-4 py-2 align-middle">
                  المبلغ
                </th>
                <th className="border border-cyan-900 font-bold text-base text-cyan-800 text-right px-4 py-2 align-middle">
                  رقم الوصل
                </th>
                <th className="border border-cyan-900 font-bold text-base text-cyan-800 text-right px-4 py-2 align-middle">
                  التاريخ
                </th>
              </tr>
            </thead>
            <tbody>
              {paymentsBeforeThis.map((prevPayment, index) => {
                // Calculate the sequential receipt number for the previous payment
                const prevPaymentIndex =
                  service.advancePayments?.findIndex(
                    (p) => p._id === prevPayment._id,
                  ) ?? index;
                const prevReceiptNumber = `SRV-${service.id}-${
                  prevPaymentIndex + 1
                }`;

                return (
                  <tr key={prevPayment._id}>
                    <td className="border border-cyan-900 text-base px-4 py-2 align-middle">
                      {formatMAD(prevPayment.amount)}
                    </td>
                    <td className="border border-cyan-900 text-base px-4 py-2 align-middle">
                      {prevReceiptNumber}
                    </td>
                    <td className="border border-cyan-900 text-base px-4 py-2 align-middle">
                      {new Date(prevPayment.date).toLocaleDateString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Footer / Signature */}
      <div className="flex justify-end mt-16" style={{ direction: "rtl" }}>
        <p className="text-xl font-bold text-cyan-800">الامضاء</p>
      </div>
    </div>
  );
}
