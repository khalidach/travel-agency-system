// frontend/src/components/booking/PaymentManagementModal.tsx
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import Modal from "../Modal";
import PaymentForm from "../PaymentForm";
import ConfirmationModal from "../modals/ConfirmationModal";
import { CreditCard, Edit2, Trash2, Download } from "lucide-react";
import type {
  Booking,
  Payment,
  Program,
  FacturationSettings,
} from "../../context/models";
import { toast } from "react-hot-toast";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import * as api from "../../services/api";
import ReceiptPDF from "./ReceiptPDF"; // Import the new component

interface PaymentManagementModalProps {
  booking: Booking | null;
  isOpen: boolean;
  onClose: () => void;
  onSavePayment: (payment: Omit<Payment, "_id" | "id">) => void;
  onUpdatePayment: (
    paymentId: string,
    payment: Omit<Payment, "_id" | "id">
  ) => void;
  onDeletePayment: (paymentId: string) => void;
}

export default function PaymentManagementModal({
  booking,
  isOpen,
  onClose,
  onSavePayment,
  onUpdatePayment,
  onDeletePayment,
}: PaymentManagementModalProps) {
  const { t } = useTranslation();
  const [isPaymentFormOpen, setIsPaymentFormOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [paymentToDelete, setPaymentToDelete] = useState<string | null>(null);
  const [receiptToPreview, setReceiptToPreview] = useState<{
    booking: Booking;
    payment: Payment;
  } | null>(null);

  // Use a query to fetch the program details for the receipt
  const { data: program } = useQuery<Program>({
    queryKey: ["program", booking?.tripId],
    queryFn: () => api.getProgramById(booking!.tripId),
    enabled: !!booking,
    staleTime: Infinity,
  });

  // Use a query to fetch the settings for the receipt
  const { data: settings } = useQuery<FacturationSettings>({
    queryKey: ["settings"],
    queryFn: api.getSettings,
    staleTime: Infinity,
  });

  if (!isOpen || !booking) return null;

  const clientNameFr =
    `${booking.clientNameFr.firstName} ${booking.clientNameFr.lastName}`.trim();

  const handleAddPaymentClick = () => {
    setEditingPayment(null);
    setIsPaymentFormOpen(true);
  };

  const handleEditPaymentClick = (payment: Payment) => {
    setEditingPayment(payment);
    setIsPaymentFormOpen(true);
  };

  const handleSavePaymentForm = (paymentData: Omit<Payment, "_id" | "id">) => {
    if (editingPayment) {
      onUpdatePayment(editingPayment._id, paymentData);
    } else {
      onSavePayment(paymentData);
    }
    setIsPaymentFormOpen(false);
    setEditingPayment(null);
  };

  const handleDeletePaymentClick = (paymentId: string) => {
    setPaymentToDelete(paymentId);
  };

  const confirmDeletePayment = () => {
    if (paymentToDelete) {
      onDeletePayment(paymentToDelete);
      setPaymentToDelete(null);
    }
  };

  const handleDownloadReceipt = async (payment: Payment) => {
    if (!booking || !program) {
      toast.error("Booking or program data not available.");
      return;
    }

    setReceiptToPreview({ booking, payment });

    // Wait for the DOM to render the receipt component
    await new Promise((resolve) => setTimeout(resolve, 100));

    const input = document.getElementById("receipt-pdf-preview");
    if (input) {
      const receiptFilename = `${t("receipt")}_${clientNameFr.replace(
        /\s/g,
        "_"
      )}.pdf`;
      html2canvas(input, { scale: 2 }).then((canvas) => {
        const imgData = canvas.toDataURL("image/png");
        const pdf = new jsPDF("p", "mm", "a5");
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
        pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
        pdf.save(receiptFilename);
        setReceiptToPreview(null);
      });
    }
  };

  return (
    <>
      <Modal
        isOpen={isOpen && !isPaymentFormOpen}
        onClose={onClose}
        title={t("managePayments")}
        size="xl"
        level={0}
      >
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            {/* Dark mode text color added */}
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
              {clientNameFr}
            </h3>
            <button
              onClick={handleAddPaymentClick}
              className="inline-flex items-center px-3 py-1 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
            >
              <CreditCard
                className={`w-4 h-4 ${
                  document.documentElement.dir === "rtl" ? "ml-2" : "mr-2"
                }`}
              />
              {t("addPayment")}
            </button>
          </div>
          <div
            className="space-y-3"
            key={(booking.advancePayments || []).length}
          >
            {(booking.advancePayments || []).map((payment, index) => (
              <div
                key={`${payment._id}-${payment.amount}`}
                // Dark mode background color added
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
              >
                <div>
                  <div className="flex items-center">
                    {/* Dark mode text colors added */}
                    <span className="text-sm text-gray-900 dark:text-gray-100">
                      {Number(payment.amount).toLocaleString()} {t("mad")}
                    </span>
                    <span className="mx-2 text-gray-400 dark:text-gray-500">
                      •
                    </span>
                    <span className="text-sm text-gray-600 dark:text-gray-300 capitalize">
                      {t(payment.method)}
                    </span>
                    <span className="mx-2 text-gray-400 dark:text-gray-500">
                      •
                    </span>
                    <span className="text-sm text-gray-600 dark:text-gray-300">
                      {new Date(payment.date).toLocaleDateString()}
                    </span>
                  </div>
                  {payment.method === "cheque" && payment.chequeNumber && (
                    // Dark mode text color added
                    <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      <span className="font-medium">
                        {t("chequeNumber")} #{payment.chequeNumber}
                      </span>
                      {payment.bankName && <span> • {payment.bankName}</span>}
                      {payment.chequeCashingDate && (
                        <span>
                          {" "}
                          • {t("checkCashingDate")}:{" "}
                          {new Date(
                            payment.chequeCashingDate
                          ).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex space-x-2">
                  {/* Dark mode text and hover colors added */}
                  <button
                    onClick={() => handleDownloadReceipt(payment)}
                    className="p-2 text-gray-400 hover:text-green-600 dark:text-gray-500 dark:hover:text-green-400 rounded-lg transition-colors"
                    title={t("downloadReceipt") as string}
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleEditPaymentClick(payment)}
                    className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeletePaymentClick(payment._id)}
                    className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
            {(!booking.advancePayments ||
              booking.advancePayments.length === 0) && (
              // Dark mode text color added
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                {t("noPaymentsRecorded")}
              </div>
            )}
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isPaymentFormOpen}
        onClose={() => setIsPaymentFormOpen(false)}
        title={editingPayment ? t("editPayment") : t("addPayment")}
        size="md"
        level={1}
      >
        <PaymentForm
          payment={editingPayment || undefined}
          onSave={handleSavePaymentForm}
          onCancel={() => setIsPaymentFormOpen(false)}
          remainingBalance={booking.remainingBalance || 0}
        />
      </Modal>

      {paymentToDelete && (
        <ConfirmationModal
          isOpen={!!paymentToDelete}
          onClose={() => setPaymentToDelete(null)}
          onConfirm={confirmDeletePayment}
          title={t("deletePaymentTitle")}
          message={t("deletePaymentMessage")}
        />
      )}

      {/* Hidden container for PDF generation - no dark mode needed here */}
      {receiptToPreview && (
        <div style={{ position: "fixed", left: "-9999px", top: "-9999px" }}>
          <div
            id="receipt-pdf-preview"
            style={{ width: "210mm", height: "297mm" }}
          >
            <ReceiptPDF
              booking={receiptToPreview.booking}
              payment={receiptToPreview.payment}
              program={program}
              settings={settings}
            />
          </div>
        </div>
      )}
    </>
  );
}
