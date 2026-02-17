// frontend/src/components/expenses/ExpensePaymentModal.tsx
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Trash2, CreditCard, Edit2 } from "lucide-react"; // Added Edit2
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
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [isPaymentFormOpen, setIsPaymentFormOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null); // New state
  const [paymentToDelete, setPaymentToDelete] = useState<string | null>(null);

  const addPaymentMutation = useMutation({
    mutationFn: (payment: Omit<Payment, "_id" | "id">) =>
      api.addExpensePayment(expense!.id, payment),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
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
            <button
              onClick={() => setIsPaymentFormOpen(true)}
              className="inline-flex items-center px-3 py-1 text-sm bg-success text-white rounded-lg hover:bg-success/90 transition-colors"
              disabled={expense.isFullyPaid}
            >
              <CreditCard className={`w-4 h-4 mr-2`} />
              {t("addPayment")}
            </button>
          </div>

          <div className="space-y-2">
            {expense.advancePayments?.map((payment) => (
              <div
                key={payment.id}
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
                    {payment.labelPaper && (
                      <span className="mx-2">• {payment.labelPaper}</span>
                    )}
                    <span className="mx-2">•</span>
                    <span>{new Date(payment.date).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleEditClick(payment)}
                    className="text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 p-2 rounded-full transition-colors"
                    title={t("edit") as string}
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setPaymentToDelete(payment.id)}
                    className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 p-2 rounded-full transition-colors"
                    title={t("delete") as string}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
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
          onSave={(data) => {
            if (editingPayment) {
              updatePaymentMutation.mutate({
                paymentId: editingPayment.id,
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
