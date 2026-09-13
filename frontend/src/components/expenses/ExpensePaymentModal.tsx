// frontend/src/components/expenses/ExpensePaymentModal.tsx
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Trash2, CreditCard, Edit2, FileText } from "lucide-react"; // Added Edit2, FileText
import Modal from "../Modal";
import ExpensePaymentForm from "./ExpensePaymentForm";
import ConfirmationModal from "../modals/ConfirmationModal";
import { Expense, Payment } from "../../context/models";
import * as api from "../../services/api";
import { toast } from "react-hot-toast";

interface Props {
  expense: Expense | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function ExpensePaymentModal({
  expense,
  isOpen,
  onClose,
}: Props) {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const [isPaymentFormOpen, setIsPaymentFormOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null); // New state
  const [paymentToDelete, setPaymentToDelete] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const handleExportExcel = async () => {
    if (!expense) return;
    setIsExporting(true);
    try {
      const blob = await api.exportExpenseToExcel(expense.id, i18n.language || "ar");
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      
      const sanitizedName = (expense.description || "expense").replace(/[\/\\:\*\?"<>\|]/g, "");
      link.setAttribute("download", `${sanitizedName}.xlsx`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success(t("exportSuccess"));
    } catch (error) {
      console.error("Failed to export expense Excel", error);
      toast.error(t("exportFailed"));
    } finally {
      setIsExporting(false);
    }
  };

  const addPaymentMutation = useMutation({
    mutationFn: (payment: Omit<Payment, "_id" | "id">) =>
      api.addExpensePayment(expense!.id, payment),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
      queryClient.invalidateQueries({ queryKey: ["profitReport"] });
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      queryClient.invalidateQueries({ queryKey: ["client"] });
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      queryClient.invalidateQueries({ queryKey: ["supplier"] });
      toast.success(t("paymentAdded"));
      setIsPaymentFormOpen(false);
      setEditingPayment(null);
    },
    onError: () => toast.error(t("failedToAddPayment")),
  });

  const updatePaymentMutation = useMutation({
    mutationFn: ({
      paymentId,
      data,
    }: {
      paymentId: string;
      data: Partial<Payment>;
    }) => api.updateExpensePayment(expense!.id, paymentId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
      queryClient.invalidateQueries({ queryKey: ["profitReport"] });
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      queryClient.invalidateQueries({ queryKey: ["client"] });
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      queryClient.invalidateQueries({ queryKey: ["supplier"] });
      toast.success(t("paymentUpdated"));
      setIsPaymentFormOpen(false);
      setEditingPayment(null);
    },
    onError: () => toast.error(t("failedToUpdatePayment")),
  });

  const deletePaymentMutation = useMutation({
    mutationFn: (paymentId: string) =>
      api.deleteExpensePayment(expense!.id, paymentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
      queryClient.invalidateQueries({ queryKey: ["profitReport"] });
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      queryClient.invalidateQueries({ queryKey: ["client"] });
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      queryClient.invalidateQueries({ queryKey: ["supplier"] });
      toast.success(t("paymentDeleted"));
      setPaymentToDelete(null);
    },
    onError: () => toast.error(t("failedToDeletePayment")),
  });

  const handleEditClick = (payment: Payment) => {
    setEditingPayment(payment);
    setIsPaymentFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsPaymentFormOpen(false);
    setEditingPayment(null);
  };

  if (!expense || !isOpen) return null;

  const currency =
    t(`currency.${expense.currency}`) || expense.currency || "dh";

  return (
    <>
      <Modal
        isOpen={isOpen && !isPaymentFormOpen}
        onClose={onClose}
        title={t("managePayments")}
        size="lg"
      >
        <div className="space-y-4">
          <div className="flex justify-between items-center mb-4">
            <div>
              <p className="font-medium text-lg">{expense.description}</p>
              <p className="text-sm text-gray-500">
                {t("remainingBalance")}:{" "}
                <span className="text-red-600 font-bold">
                  {expense.remainingBalance.toLocaleString()} {currency}
                </span>
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleExportExcel}
                disabled={isExporting}
                className="inline-flex items-center px-3 py-1 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50"
              >
                <FileText className="w-4 h-4 mr-2" />
                {isExporting ? t("exporting") : t("exportToExcel")}
              </button>
              <button
                onClick={() => setIsPaymentFormOpen(true)}
                className="inline-flex items-center px-3 py-1 text-sm bg-success text-white rounded-lg hover:bg-success/90 transition-colors"
                disabled={expense.isFullyPaid}
              >
                <CreditCard className={`w-4 h-4 mr-2`} />
                {t("addPayment")}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            {expense.advancePayments?.map((payment) => (
              <div
                key={payment._id}
                className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-lg">
                      {payment.amount.toLocaleString()} {currency}
                    </span>
                    {currency !== "MAD" && payment.amountMAD && (
                      <span className="text-sm text-gray-500 bg-gray-200 dark:bg-gray-600 px-2 py-0.5 rounded-full">
                        ≈ {payment.amountMAD.toLocaleString()} MAD
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-500 mt-1">
                    <span className="capitalize">{t(payment.method)}</span>
                    <span className="mx-2">
                      • {payment.labelPaper || (
                        expense.reservationNumber
                          ? `${t("bookingPayment")} ${expense.reservationNumber}`
                          : `${t("paymentLabel") || "Paiement"} ${expense.description || ""}`
                      )}
                    </span>
                    <span className="mx-2">•</span>
                    <span>{new Date(payment.date).toLocaleDateString()}</span>
                  </div>

                  {payment.itemAllocations && payment.itemAllocations.some((a) => a.amount > 0) && (
                    <div className="mt-2.5 pt-2 border-t border-gray-200 dark:border-gray-600/60 space-y-1.5">
                      <p className="text-xs font-semibold text-gray-600 dark:text-gray-300">
                        {t("itemDistribution")}:
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs">
                        {payment.itemAllocations.map((alloc, aIdx) => {
                          if (!alloc.amount || alloc.amount <= 0) return null;
                          const expItem = expense.items?.[alloc.itemIndex];
                          const title = alloc.passengerName || expItem?.passengerName || alloc.description || expItem?.description || `#${alloc.itemIndex + 1}`;
                          const pnr = alloc.bookingRef || expItem?.bookingRef;
                          return (
                            <div
                              key={aIdx}
                              className="flex justify-between items-center bg-white dark:bg-gray-800 px-2.5 py-1.5 rounded border border-gray-200 dark:border-gray-600/60"
                            >
                              <span className="text-gray-700 dark:text-gray-300 truncate mr-2" title={title}>
                                {title} {pnr ? `[${pnr}]` : ""}
                              </span>
                              <span className="font-semibold text-blue-600 dark:text-blue-400 whitespace-nowrap">
                                {alloc.amount.toLocaleString()} {currency}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 self-start mt-1">
                  {payment.supplierPaymentId ? (
                    <span className="text-xs bg-purple-100 text-purple-800 dark:bg-purple-950/40 dark:text-purple-300 px-2.5 py-1 rounded-full font-medium">
                      {t("generalPayment") || "General Payment"}
                    </span>
                  ) : (
                    <>
                      <button
                        onClick={() => handleEditClick(payment)}
                        className="text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 p-2 rounded-full transition-colors"
                        title={t("edit") as string}
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setPaymentToDelete(payment._id)}
                        className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 p-2 rounded-full transition-colors"
                        title={t("delete") as string}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
            {!expense.advancePayments?.length && (
              <p className="text-center text-gray-500 py-4">
                {t("noPaymentsRecorded")}
              </p>
            )}
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isPaymentFormOpen}
        onClose={handleCloseForm}
        title={editingPayment ? t("editPayment") : t("addPayment")}
      >
        <ExpensePaymentForm
          payment={editingPayment || undefined} // Pass payment if editing
          remainingBalance={expense.remainingBalance}
          currency={currency}
          expense={expense}
          onSave={(data) => {
            if (editingPayment) {
              updatePaymentMutation.mutate({
                paymentId: editingPayment._id,
                data,
              });
            } else {
              addPaymentMutation.mutate(data);
            }
          }}
          onCancel={handleCloseForm}
        />
      </Modal>

      {paymentToDelete && (
        <ConfirmationModal
          isOpen={!!paymentToDelete}
          onClose={() => setPaymentToDelete(null)}
          onConfirm={() => deletePaymentMutation.mutate(paymentToDelete)}
          title={t("deletePaymentTitle")}
          message={t("deletePaymentMessage")}
        />
      )}
    </>
  );
}
