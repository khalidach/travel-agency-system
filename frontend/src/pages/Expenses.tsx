// frontend/src/pages/Expenses.tsx
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  Plus,
  Search,
  Trash2,
  Edit2,
  CreditCard,
  Wallet,
  FileText,
  Building,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import * as api from "../services/api";
import { Expense } from "../context/models";
import Modal from "../components/Modal";
import ConfirmationModal from "../components/modals/ConfirmationModal";
import ExpensePaymentModal from "../components/expenses/ExpensePaymentModal";
import OrderNoteForm from "../components/expenses/OrderNoteForm";
import RegularExpenseForm from "../components/expenses/RegularExpenseForm";
import { toast } from "react-hot-toast";

export default function Expenses() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"order_note" | "regular">(
    "order_note",
  );
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [expenseToDelete, setExpenseToDelete] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const { data: expenses, isLoading } = useQuery<Expense[]>({
    queryKey: ["expenses", activeTab],
    queryFn: () => api.getExpenses({ type: activeTab }),
  });

  const createMutation = useMutation({
    mutationFn: api.createExpense,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      toast.success(t("expenseCreated"));
      setIsFormOpen(false);
    },
    onError: () => toast.error(t("errorCreatingExpense")),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Expense> }) =>
      api.updateExpense(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      toast.success(t("expenseUpdated"));
      setIsFormOpen(false);
    },
    onError: () => toast.error(t("errorUpdatingExpense")),
  });

  const deleteMutation = useMutation({
    mutationFn: api.deleteExpense,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      toast.success(t("expenseDeleted"));
      setExpenseToDelete(null);
    },
    onError: () => toast.error(t("errorDeletingExpense")),
  });

  const filteredExpenses = expenses?.filter(
    (expense: Expense) =>
      expense.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      expense.beneficiary?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const handleEdit = (expense: Expense) => {
    setSelectedExpense(expense);
    setIsFormOpen(true);
  };

  const handleManagePayments = (expense: Expense) => {
    setSelectedExpense(expense);
    setIsPaymentModalOpen(true);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Wallet className="w-8 h-8 text-primary" />
            {t("expensesManagement")}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {t("expensesSubtitle")}
          </p>
        </div>
        <button
          onClick={() => {
            setSelectedExpense(null);
            setIsFormOpen(true);
          }}
          className="btn-primary flex items-center gap-2 bg-primary text-white hover:bg-primary/90 transition-colors px-4 py-2 rounded-lg"
        >
          <Plus className="w-4 h-4" />
          {activeTab === "order_note"
            ? t("addOrderNote")
            : t("addRegularExpense")}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab("order_note")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === "order_note"
              ? "bg-white dark:bg-gray-700 text-primary shadow-sm"
              : "text-gray-500 hover:text-gray-900 dark:hover:text-gray-200"
          }`}
        >
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            {t("orderNotes")}
          </div>
        </button>
        <button
          onClick={() => setActiveTab("regular")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === "regular"
              ? "bg-white dark:bg-gray-700 text-primary shadow-sm"
              : "text-gray-500 hover:text-gray-900 dark:hover:text-gray-200"
          }`}
        >
          <div className="flex items-center gap-2">
            <Building className="w-4 h-4" />
            {t("regularExpenses")}
          </div>
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-4 bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder={t("searchExpenses") as string}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
      </div>

      {/* List */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500">{t("loading")}</div>
        ) : !filteredExpenses?.length ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <Wallet className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              {t("noExpensesFound")}
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              {t("createExpenseLead")}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  <th className="p-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    {t("date")}
                  </th>
                  <th className="p-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    {t("description")}
                  </th>
                  <th className="p-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    {activeTab === "order_note"
                      ? t("beneficiary")
                      : t("category")}
                  </th>
                  <th className="p-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase text-left">
                    {t("amount")}
                  </th>
                  <th className="p-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase text-left">
                    {t("paid")}
                  </th>
                  {activeTab === "order_note" && (
                    <th className="p-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase text-left">
                      {t("remainingBalance")}
                    </th>
                  )}

                  <th className="p-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase text-left">
                    {t("status")}
                  </th>
                  <th className="p-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase text-left">
                    {t("actions")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {filteredExpenses.map((expense: Expense) => (
                  <tr
                    key={expense.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    <td className="p-4 text-sm text-gray-600 dark:text-gray-300">
                      {new Date(expense.date).toLocaleDateString()}
                    </td>
                    <td className="p-4 text-sm font-medium text-gray-900 dark:text-white">
                      {expense.description}
                    </td>
                    <td className="p-4 text-sm text-gray-600 dark:text-gray-300">
                      {activeTab === "order_note"
                        ? expense.beneficiary
                        : t(expense.category || "")}
                    </td>

                    {/* Amount - Shows Original Currency */}
                    <td className="p-4 text-sm text-left font-medium text-gray-900 dark:text-white">
                      {Number(expense.amount).toLocaleString()}{" "}
                      {expense.currency || "MAD"}
                    </td>

                    {/* Paid - Shows Original Currency */}
                    <td className="p-4 text-sm text-left text-emerald-600 font-medium">
                      {(activeTab === "regular"
                        ? Number(expense.amount)
                        : Number(expense.amount) -
                          Number(expense.remainingBalance)
                      ).toLocaleString()}{" "}
                      {expense.currency || "MAD"}
                    </td>

                    {/* Remaining - Shows Original Currency */}
                    {activeTab === "order_note" && (
                      <td className="p-4 text-sm text-left text-red-600 font-medium">
                        {Number(expense.remainingBalance).toLocaleString()}{" "}
                        {expense.currency || "MAD"}
                      </td>
                    )}

                    <td className="p-4 text-left">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          expense.isFullyPaid
                            ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                            : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
                        }`}
                      >
                        {expense.isFullyPaid ? (
                          <>
                            <CheckCircle className="w-3 h-3 mr-1" />
                            {t("fullyPaid")}
                          </>
                        ) : (
                          <>
                            <AlertCircle className="w-3 h-3 mr-1" />
                            {t("pending")}
                          </>
                        )}
                      </span>
                    </td>
                    <td className="p-4 text-left">
                      <div className="flex justify-start gap-2">
                        {/* Only show Payment Management for Order Notes */}
                        {activeTab === "order_note" && (
                          <button
                            onClick={() => handleManagePayments(expense)}
                            className="p-2 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-colors"
                            title={t("managePayments") as string}
                          >
                            <CreditCard className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleEdit(expense)}
                          className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setExpenseToDelete(expense.id)}
                          className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={
          selectedExpense
            ? t("editExpense")
            : activeTab === "order_note"
              ? t("addOrderNote")
              : t("addRegularExpense")
        }
      >
        {activeTab === "order_note" ? (
          <OrderNoteForm
            initialData={selectedExpense || undefined}
            onSubmit={(data) => {
              if (selectedExpense) {
                updateMutation.mutate({ id: selectedExpense.id, data });
              } else {
                createMutation.mutate({ ...data, type: "order_note" });
              }
            }}
            onCancel={() => setIsFormOpen(false)}
          />
        ) : (
          <RegularExpenseForm
            initialData={selectedExpense || undefined}
            onSubmit={(data) => {
              if (selectedExpense) {
                updateMutation.mutate({ id: selectedExpense.id, data });
              } else {
                createMutation.mutate({ ...data, type: "regular" });
              }
            }}
            onCancel={() => setIsFormOpen(false)}
          />
        )}
      </Modal>

      <ExpensePaymentModal
        expense={selectedExpense}
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
      />

      {expenseToDelete && (
        <ConfirmationModal
          isOpen={!!expenseToDelete}
          onClose={() => setExpenseToDelete(null)}
          onConfirm={() => deleteMutation.mutate(expenseToDelete)}
          title={t("deleteExpenseTitle")}
          message={t("deleteExpenseMessage")}
        />
      )}
    </div>
  );
}
