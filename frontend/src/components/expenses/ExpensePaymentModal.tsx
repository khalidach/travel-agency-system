// frontend/src/components/expenses/ExpensePaymentModal.tsx
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Trash2, CreditCard } from "lucide-react";
import Modal from "../Modal";
import PaymentForm from "../PaymentForm";
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
  const [paymentToDelete, setPaymentToDelete] = useState<string | null>(null);

  const addPaymentMutation = useMutation({
    mutationFn: (payment: Omit<Payment, "_id" | "id">) =>
      api.addExpensePayment(expense!.id, payment),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      toast.success(t("paymentAdded"));
      setIsPaymentFormOpen(false);
    },
    onError: () => toast.error(t("failedToAddPayment")),
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

  if (!expense || !isOpen) return null;

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
                  {expense.remainingBalance} {t("mad")}
                </span>
              </p>
            </div>
            <button
              onClick={() => setIsPaymentFormOpen(true)}
              className="btn-primary flex items-center gap-2 text-sm"
              disabled={expense.isFullyPaid}
            >
              <CreditCard className="w-4 h-4" />
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
                  <span className="font-bold">
                    {payment.amount} {t("mad")}
                  </span>
                  <span className="text-gray-500 mx-2">•</span>
                  <span className="capitalize">{t(payment.method)}</span>
                  <span className="text-gray-500 mx-2">•</span>
                  <span className="text-sm text-gray-500">
                    {new Date(payment.date).toLocaleDateString()}
                  </span>
                </div>
                <button
                  onClick={() => setPaymentToDelete(payment.id)}
                  className="text-red-500 hover:bg-red-50 p-2 rounded-full"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
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
        onClose={() => setIsPaymentFormOpen(false)}
        title={t("addPayment")}
      >
        <PaymentForm
          remainingBalance={expense.remainingBalance}
          onSave={(data) => addPaymentMutation.mutate(data)}
          onCancel={() => setIsPaymentFormOpen(false)}
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
