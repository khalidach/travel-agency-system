// frontend/src/components/booking/PaymentManagementModal.tsx
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import Modal from "../Modal";
import PaymentForm from "../PaymentForm";
import GroupPaymentForm from "./GroupPaymentForm";
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
import ReceiptPDF from "./ReceiptPDF";

interface PaymentManagementModalProps {
  booking: Booking | null;
  isOpen: boolean;
  onClose: () => void;
  onSavePayment: (payment: Omit<Payment, "_id" | "id">) => void;
  onUpdatePayment: (
    paymentId: string,
    payment: Omit<Payment, "_id" | "id">,
  ) => void;
  onDeletePayment: (paymentId: string) => void;
  onAddGroupPayment: (payment: Omit<Payment, "_id" | "id">) => void;
  onUpdateGroupPayment: (
    paymentId: string,
    payment: Partial<Payment>,
  ) => void;
  onDeleteGroupPayment: (paymentId: string) => void;
}

export default function PaymentManagementModal({
  booking,
  isOpen,
  onClose,
  onSavePayment,
  onUpdatePayment,
  onDeletePayment,
  onAddGroupPayment,
  onUpdateGroupPayment,
  onDeleteGroupPayment,
}: PaymentManagementModalProps) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<"individual" | "group">("individual");
  const [isPaymentFormOpen, setIsPaymentFormOpen] = useState(false);
  const [isGroupPaymentFormOpen, setIsGroupPaymentFormOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [editingGroupPayment, setEditingGroupPayment] = useState<Payment | null>(null);
  const [paymentToDelete, setPaymentToDelete] = useState<string | null>(null);
  const [groupPaymentToDelete, setGroupPaymentToDelete] = useState<string | null>(null);
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

  const isLeader = !!booking?.relatedPersons && booking.relatedPersons.length > 0;

  const { data: groupBookings } = useQuery<Booking[]>({
    queryKey: ["groupBookings", booking?.id],
    queryFn: () => api.getGroupBookings(booking!.id),
    enabled: !!booking && isLeader,
    staleTime: 0,
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

  const handleSaveGroupPaymentForm = (paymentData: Omit<Payment, "_id" | "id">) => {
    if (editingGroupPayment) {
      onUpdateGroupPayment(editingGroupPayment._id, paymentData);
    } else {
      onAddGroupPayment(paymentData);
    }
    setIsGroupPaymentFormOpen(false);
    setEditingGroupPayment(null);
  };

  const handleDeletePaymentClick = (paymentId: string) => {
    setPaymentToDelete(paymentId);
  };

  const handleDeleteGroupPaymentClick = (paymentId: string) => {
    setGroupPaymentToDelete(paymentId);
  };

  const confirmDeletePayment = () => {
    if (paymentToDelete) {
      onDeletePayment(paymentToDelete);
      setPaymentToDelete(null);
    } else if (groupPaymentToDelete) {
      onDeleteGroupPayment(groupPaymentToDelete);
      setGroupPaymentToDelete(null);
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
        "_",
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
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
              {clientNameFr}
            </h3>
            {(!isLeader || activeTab === "individual") && (
              <button
                onClick={handleAddPaymentClick}
                className="inline-flex items-center px-3 py-1 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                disabled={booking.isFullyPaid}
              >
                <CreditCard className={`w-4 h-4 mr-2`} />
                {t("addPayment")}
              </button>
            )}
            {isLeader && activeTab === "group" && (
              <button
                onClick={() => {
                  setEditingGroupPayment(null);
                  setIsGroupPaymentFormOpen(true);
                }}
                className="inline-flex items-center px-3 py-1 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                disabled={groupBookings?.every(b => b.isFullyPaid)}
              >
                <CreditCard className={`w-4 h-4 mr-2`} />
                Add Group Payment
              </button>
            )}
          </div>

          {isLeader && (
            <div className="flex border-b border-gray-200 dark:border-gray-700 mb-4">
              <button
                className={`py-2 px-4 focus:outline-none ${activeTab === 'individual' ? 'border-b-2 border-emerald-600 text-emerald-600 font-medium' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'}`}
                onClick={() => setActiveTab('individual')}
              >
                Individual Payments
              </button>
              <button
                className={`py-2 px-4 focus:outline-none ${activeTab === 'group' ? 'border-b-2 border-emerald-600 text-emerald-600 font-medium' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'}`}
                onClick={() => setActiveTab('group')}
              >
                Group Payments
              </button>
            </div>
          )}
          <div
            className="space-y-3"
            key={(booking.advancePayments || []).length}
          >
            {(booking.advancePayments || [])
              .filter((p) => isLeader ? (activeTab === "group" ? p.isGroupPayment : !p.isGroupPayment) : true)
              .map((payment) => (
                <div
                  key={`${payment._id}-${payment.amount}`}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                >
                  <div>
                    <div className="flex items-center">
                      <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                        {(payment.groupAmount && payment.isLeader)
                          ? Number(payment.groupAmount).toLocaleString()
                          : Number(payment.amount).toLocaleString()} {t("mad")}
                        {payment.isGroupPayment && !payment.isLeader && " (Group Share)"}
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
                              payment.chequeCashingDate,
                            ).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleDownloadReceipt(payment)}
                      className="p-2 text-gray-400 hover:text-green-600 dark:text-gray-500 dark:hover:text-green-400 rounded-lg transition-colors"
                      title={t("downloadReceipt") as string}
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    {/* Hide edit/delete for members on a group payment */}
                    {(!payment.isGroupPayment || payment.isLeader) && (
                      <>
                        <button
                          onClick={() => {
                            if (payment.isGroupPayment) {
                              setEditingGroupPayment(payment);
                              setIsGroupPaymentFormOpen(true);
                            } else {
                              handleEditPaymentClick(payment);
                            }
                          }}
                          className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => payment.isGroupPayment ? handleDeleteGroupPaymentClick(payment._id) : handleDeletePaymentClick(payment._id)}
                          className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            {(!booking.advancePayments ||
              booking.advancePayments.length === 0) && (
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

      <Modal
        isOpen={isGroupPaymentFormOpen}
        onClose={() => setIsGroupPaymentFormOpen(false)}
        title={editingGroupPayment ? "Edit Group Payment" : "Add Group Payment"}
        size="md"
        level={1}
      >
        <GroupPaymentForm
          payment={editingGroupPayment || undefined}
          onSave={handleSaveGroupPaymentForm}
          onCancel={() => setIsGroupPaymentFormOpen(false)}
          groupRemainingBalance={groupBookings ? groupBookings.reduce((sum, b) => sum + Number(b.remainingBalance || 0), 0) : 0}
        />
      </Modal>

      {(paymentToDelete || groupPaymentToDelete) && (
        <ConfirmationModal
          isOpen={!!paymentToDelete || !!groupPaymentToDelete}
          onClose={() => { setPaymentToDelete(null); setGroupPaymentToDelete(null); }}
          onConfirm={confirmDeletePayment}
          title={t("deletePaymentTitle")}
          message={t("deletePaymentMessage")}
        />
      )}

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
              groupBookings={groupBookings}
            />
          </div>
        </div>
      )}
    </>
  );
}
