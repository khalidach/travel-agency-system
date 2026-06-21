// frontend/src/pages/SupplierAnalysis.tsx
import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Phone, Mail, FileText, Calendar, CreditCard, Edit2, Trash2 } from "lucide-react";
import * as api from "../services/api";
import { Supplier, Expense } from "../context/models";
import Modal from "../components/Modal";
import OrderNoteForm from "../components/expenses/OrderNoteForm";
import PaginationControls from "../components/ui/PaginationControls";
import SupplierGeneralPaymentModal from "../components/suppliers/SupplierGeneralPaymentModal";
import ConfirmationModal from "../components/modals/ConfirmationModal";
import { toast } from "react-hot-toast";

// Define the specific shape expected for the analysis view (includes expenses)
interface SupplierDetail extends Supplier {
  expenses?: Expense[];
  expensesTotal?: number;
  expensesTotalPages?: number;
  expensesPage?: number;
  totalAmount?: number;
  totalPaid?: number;
  totalRemaining?: number;
}

const ITEMS_PER_PAGE = 7;

export default function SupplierAnalysis() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const [currentPage, setCurrentPage] = useState(1);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isGeneralPaymentModalOpen, setIsGeneralPaymentModalOpen] = useState(false);

  const [activeTab, setActiveTab] = useState<"purchases" | "payments">("purchases");
  const [paymentsPage, setPaymentsPage] = useState(1);
  const [selectedGeneralPayment, setSelectedGeneralPayment] = useState<any>(null);
  const [paymentToDelete, setPaymentToDelete] = useState<any>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  const { data: supplier, isLoading } = useQuery<SupplierDetail>({
    queryKey: ["supplier", id, currentPage],
    queryFn: () => api.getSupplier(Number(id), currentPage, ITEMS_PER_PAGE),
    enabled: !!id,
  });

  const PAYMENTS_ITEMS_PER_PAGE = 7;
  const { data: paymentsData, isLoading: isPaymentsLoading } = useQuery({
    queryKey: ["supplier-general-payments", id, paymentsPage],
    queryFn: () => api.getSupplierGeneralPayments(Number(id), paymentsPage, PAYMENTS_ITEMS_PER_PAGE),
    enabled: !!id && activeTab === "payments",
  });

  const deletePaymentMutation = useMutation({
    mutationFn: (paymentId: number) => api.deleteSupplierGeneralPayment(Number(id), paymentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["supplier", id] });
      queryClient.invalidateQueries({ queryKey: ["supplier-general-payments", id] });
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
      queryClient.invalidateQueries({ queryKey: ["profitReport"] });
      toast.success(t("paymentDeleted") || "General payment deleted and reverted successfully.");
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || err.message || "Failed to delete payment.");
    }
  });

  const handleConfirmDeletePayment = () => {
    if (paymentToDelete) {
      deletePaymentMutation.mutate(paymentToDelete.id);
    }
  };

  const handleExportExcel = async () => {
    if (!id || !supplier) return;
    setIsExporting(true);
    try {
      const blob = await api.exportSupplierAnalysisToExcel(Number(id), "ar");
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      
      const sanitizedName = supplier.name.replace(/[\/\\:\*\?"<>\|]/g, "");
      link.setAttribute("download", `supplier_analysis_${sanitizedName}.xlsx`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Failed to export supplier analysis Excel", error);
    } finally {
      setIsExporting(false);
    }
  };

  if (isLoading) return <div className="p-8 text-center">{t("loading")}</div>;
  if (!supplier) return <div className="p-8 text-center">{t("notFound")}</div>;

  const totalAmount = supplier.totalAmount || 0;
  const totalPaid = supplier.totalPaid || 0;
  const totalRemaining = supplier.totalRemaining || 0;

  const topCurrency = supplier.expenses && supplier.expenses.length > 0 && supplier.expenses[0].currency 
    ? supplier.expenses[0].currency 
    : "MAD";

  const getCurrencyDisplay = (curr?: string) => {
    const code = curr || "MAD";
    const translation = t(`currency.${code}`);
    return translation.includes('.') ? code : translation;
  };

  const handleRowClick = (expense: Expense) => {
    setSelectedExpense(expense);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedExpense(null);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> {t("back")}
      </button>

      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex flex-col md:flex-row justify-between gap-6">
          <div>
            <div className="flex flex-wrap items-center gap-4 mb-2">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                {supplier.name}
              </h1>
              <button
                onClick={handleExportExcel}
                disabled={isExporting}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-all disabled:opacity-50 text-sm font-medium shadow-sm hover:shadow-md hover:-translate-y-0.5"
              >
                <FileText className="w-4 h-4" />
                {isExporting ? t("exporting") : t("exportToExcel")}
              </button>
              <button
                onClick={() => {
                  setSelectedGeneralPayment(null);
                  setIsGeneralPaymentModalOpen(true);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg transition-all text-sm font-medium shadow-sm hover:shadow-md hover:-translate-y-0.5"
              >
                <CreditCard className="w-4 h-4" />
                {t("generalPayment") || "General Payment"}
              </button>
            </div>

            <div className="flex gap-4 text-gray-500">
              {supplier.email && (
                <span className="flex items-center gap-2">
                  <Mail className="w-4 h-4" /> {supplier.email}
                </span>
              )}
              {supplier.phone && (
                <span className="flex items-center gap-2">
                  <Phone className="w-4 h-4" /> {supplier.phone}
                </span>
              )}
            </div>
          </div>

          <div className="flex gap-4">
            <div className="text-left">
              <p className="text-sm text-gray-500">{t("totalPurchases")}</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {totalAmount.toLocaleString()}{" "}
                <span className="text-sm font-normal">{getCurrencyDisplay(topCurrency)}</span>
              </p>
            </div>
            <div className="text-left px-4 border-l border-gray-200">
              <p className="text-sm text-gray-500">{t("totalPaid")}</p>
              <p className="text-2xl font-bold text-emerald-600">
                {totalPaid.toLocaleString()}{" "}
                <span className="text-sm font-normal">{getCurrencyDisplay(topCurrency)}</span>
              </p>
            </div>
            <div className="text-left px-4 border-l border-gray-200">
              <p className="text-sm text-gray-500">{t("totalRemaining")}</p>
              <p className="text-2xl font-bold text-red-600">
                {totalRemaining.toLocaleString()}{" "}
                <span className="text-sm font-normal">{getCurrencyDisplay(topCurrency)}</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setActiveTab("purchases")}
          className={`py-3 px-6 font-medium text-sm border-b-2 transition-colors ${
            activeTab === "purchases"
              ? "border-primary text-primary"
              : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
          }`}
        >
          {t("purchaseHistory")}
        </button>
        <button
          onClick={() => setActiveTab("payments")}
          className={`py-3 px-6 font-medium text-sm border-b-2 transition-colors ${
            activeTab === "payments"
              ? "border-primary text-primary"
              : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
          }`}
        >
          {t("generalPayments") || "General Payments"}
        </button>
      </div>

      {activeTab === "purchases" ? (
        <>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  <th className="p-4 text-xs uppercase text-gray-500">
                    {t("date")}
                  </th>
                  <th className="p-4 text-xs uppercase text-gray-500">
                    {t("description")}
                  </th>
                  <th className="p-4 text-xs uppercase text-gray-500">
                    {t("amount")}
                  </th>
                  <th className="p-4 text-xs uppercase text-gray-500">
                    {t("paid")}
                  </th>
                  <th className="p-4 text-xs uppercase text-gray-500">
                    {t("remainingBalance")}
                  </th>
                  <th className="p-4 text-xs uppercase text-gray-500">
                    {t("status")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {supplier.expenses?.map((expense: Expense) => (
                  <tr
                    key={expense.id}
                    onClick={() => handleRowClick(expense)}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors"
                  >
                    <td className="p-4 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        {new Date(expense.date).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="p-4 text-sm font-medium text-gray-900 dark:text-white">
                      {expense.description}
                    </td>
                    <td className="p-4 text-sm font-medium">
                      {Number(expense.amount).toLocaleString()} {getCurrencyDisplay(expense.currency)}
                    </td>
                    <td className="p-4 text-sm text-emerald-600">
                      {(
                        Number(expense.amount) - Number(expense.remainingBalance)
                      ).toLocaleString()}{" "}
                      {getCurrencyDisplay(expense.currency)}
                    </td>
                    <td className="p-4 text-sm text-red-600">
                      {Number(expense.remainingBalance).toLocaleString()}{" "}
                      {getCurrencyDisplay(expense.currency)}
                    </td>
                    <td className="p-4">
                      <span
                        className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${expense.isFullyPaid
                            ? "bg-green-100 text-green-800"
                            : "bg-yellow-100 text-yellow-800"
                          }`}
                      >
                        {expense.isFullyPaid ? t("paid") : t("pending")}
                      </span>
                    </td>
                  </tr>
                ))}
                {(!supplier.expenses || supplier.expenses.length === 0) && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-gray-500">
                      {t("noTransactions")}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <PaginationControls
            currentPage={currentPage}
            totalPages={supplier.expensesTotalPages || 1}
            totalCount={supplier.expensesTotal || 0}
            limit={ITEMS_PER_PAGE}
            onPageChange={setCurrentPage}
          />
        </>
      ) : (
        <>
          {isPaymentsLoading ? (
            <div className="p-8 text-center text-gray-500">{t("loading")}</div>
          ) : (
            <>
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-gray-50 dark:bg-gray-700/50">
                    <tr>
                      <th className="p-4 text-xs uppercase text-gray-500">
                        {t("date")}
                      </th>
                      <th className="p-4 text-xs uppercase text-gray-500">
                        {t("paymentAmount") || "Amount"}
                      </th>
                      <th className="p-4 text-xs uppercase text-gray-500">
                        {t("targetedType") || "Target"}
                      </th>
                      <th className="p-4 text-xs uppercase text-gray-500">
                        {t("paymentMethod") || "Method"}
                      </th>
                      <th className="p-4 text-xs uppercase text-gray-500">
                        {t("description")}
                      </th>
                      <th className="p-4 text-xs uppercase text-gray-500">
                        {t("actions")}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {paymentsData?.payments?.map((payment: any) => (
                      <tr
                        key={payment.id}
                        className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                      >
                        <td className="p-4 text-sm text-gray-600">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-gray-400" />
                            {new Date(payment.date).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="p-4 text-sm font-medium text-gray-900 dark:text-white">
                          {Number(payment.amount).toLocaleString()} {getCurrencyDisplay(payment.currency)}
                          {payment.currency !== "MAD" && (
                            <span className="text-xs text-gray-500 block">
                              ({Number(payment.amountMAD).toLocaleString()} MAD)
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-sm text-gray-600">
                          {payment.bookingType === "all"
                            ? t("allServices") || "All Services"
                            : t(`bookingTypes.${payment.bookingType}`) || payment.bookingType}
                        </td>
                        <td className="p-4 text-sm text-gray-600">
                          {t(`paymentMethods.${payment.method}`) || t(payment.method) || payment.method}
                        </td>
                        <td className="p-4 text-sm text-gray-600 text-ellipsis overflow-hidden max-w-[200px]" title={payment.labelPaper}>
                          {payment.labelPaper}
                        </td>
                        <td className="p-4 text-sm">
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => {
                                setSelectedGeneralPayment(payment);
                                setIsGeneralPaymentModalOpen(true);
                              }}
                              className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition-colors"
                              title={t("edit") || "Edit"}
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                setPaymentToDelete(payment);
                                setIsDeleteConfirmOpen(true);
                              }}
                              className="p-1.5 text-red-600 hover:text-red-800 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors"
                              title={t("delete") || "Delete"}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {(!paymentsData?.payments || paymentsData.payments.length === 0) && (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-gray-500">
                          {t("noTransactions")}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <PaginationControls
                currentPage={paymentsPage}
                totalPages={paymentsData?.totalPages || 1}
                totalCount={paymentsData?.total || 0}
                limit={PAYMENTS_ITEMS_PER_PAGE}
                onPageChange={setPaymentsPage}
              />
            </>
          )}
        </>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={t("expenseDetails") || "Expense Details"}
        size="xl"
      >
        {selectedExpense && (
          <OrderNoteForm
            initialData={selectedExpense}
            onSubmit={() => { }} // No-op for read-only
            onCancel={handleCloseModal}
            readOnly={true} // Enable preview mode
          />
        )}
      </Modal>

      <SupplierGeneralPaymentModal
        supplierId={Number(id)}
        supplierName={supplier.name}
        isOpen={isGeneralPaymentModalOpen}
        onClose={() => {
          setIsGeneralPaymentModalOpen(false);
          setSelectedGeneralPayment(null);
        }}
        defaultCurrency={topCurrency}
        totalRemaining={totalRemaining}
        payment={selectedGeneralPayment}
      />

      <ConfirmationModal
        isOpen={isDeleteConfirmOpen}
        onClose={() => {
          setIsDeleteConfirmOpen(false);
          setPaymentToDelete(null);
        }}
        onConfirm={handleConfirmDeletePayment}
        title={t("deleteGeneralPayment") || "Delete General Payment"}
        message={t("deleteGeneralPaymentConfirm") || "Are you sure you want to delete this general payment? This will revert the applied amounts on the supplier's order notes."}
        confirmText={t("delete") || "Delete"}
        cancelText={t("cancel") || "Cancel"}
      />
    </div>
  );
}

