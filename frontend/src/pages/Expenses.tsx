// frontend/src/pages/Expenses.tsx
import { useState, useMemo } from "react";
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
  ArrowUpRight,
  ArrowDownLeft,
} from "lucide-react";
import * as api from "../services/api";
import { Expense, Supplier } from "../context/models";
import Modal from "../components/Modal";
import ConfirmationModal from "../components/modals/ConfirmationModal";
import ExpensePaymentModal from "../components/expenses/ExpensePaymentModal";
import OrderNoteForm from "../components/expenses/OrderNoteForm";
import RegularExpenseForm from "../components/expenses/RegularExpenseForm";
import { toast } from "react-hot-toast";
import PaginationControls from "../components/ui/PaginationControls";
import { useBranchContext } from "../context/BranchContext";

export default function Expenses() {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"order_note" | "regular" | "iata_easypay">(
    "order_note",
  );
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [expenseToDelete, setExpenseToDelete] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBookingType, setSelectedBookingType] = useState("");
  const [selectedSupplier, setSelectedSupplier] = useState("");
  const [formPrefill, setFormPrefill] = useState<any>(null);

  // Bulk deletion state
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // IATA Wallet Pagination
  const [walletPage, setWalletPage] = useState(1);

  // Reset pagination when filters change
  const handleSearchChange = (val: string) => {
    setSearchTerm(val);
    setCurrentPage(1);
    setSelectedIds(new Set());
  };

  const handleBookingTypeChange = (val: string) => {
    setSelectedBookingType(val);
    setCurrentPage(1);
    setSelectedIds(new Set());
  };

  const handleSupplierChange = (val: string) => {
    setSelectedSupplier(val);
    setCurrentPage(1);
    setSelectedIds(new Set());
  };

  const handleTabChange = (val: "order_note" | "regular" | "iata_easypay") => {
    setActiveTab(val);
    setCurrentPage(1);
    setSearchTerm("");
    setSelectedBookingType("");
    setSelectedSupplier("");
    setSelectedIds(new Set());
  };

  // Fetch Suppliers for filter
  const { data: suppliersData } = useQuery<{ suppliers: Supplier[]; total: number }>({
    queryKey: ["suppliers"],
    queryFn: () => api.getSuppliers(false, 1, 1000),
  });

  const { selectedBranchId } = useBranchContext();

  // Fetch ALL expenses for wallet balance calculations (up to 10k limit)
  const { data: allExpensesData } = useQuery<{ expenses: Expense[] }>({
    queryKey: ["allExpensesForWallet", selectedBranchId],
    queryFn: () => api.getExpenses({ limit: 10000, branchId: selectedBranchId }),
  });

  const allExpenses = allExpensesData?.expenses || [];

  // Wallet Calculations
  const totalTopUps = useMemo(() => {
    return allExpenses
      .filter((e) => e.category === "iata_easypay_topup")
      .reduce((sum, e) => sum + Number(e.amount), 0);
  }, [allExpenses]);

  const totalDeductions = useMemo(() => {
    let sum = 0;
    allExpenses.forEach((e) => {
      if (e.advancePayments && Array.isArray(e.advancePayments)) {
        e.advancePayments.forEach((p) => {
          if (p.method === "iata_easypay") {
            sum += Number(p.amount);
          }
        });
      }
    });
    return sum;
  }, [allExpenses]);

  const walletBalance = totalTopUps - totalDeductions;

  // IATA Transaction list compilation
  const iataTransactions = useMemo(() => {
    const list: {
      id: string;
      date: string;
      type: "deposit" | "deduction";
      description: string;
      amount: number;
      method?: string;
      expenseId?: number;
    }[] = [];

    allExpenses.forEach((e) => {
      // 1. Deposits
      if (e.category === "iata_easypay_topup") {
        const payMethod = e.advancePayments?.[0]?.method || "transfer";
        list.push({
          id: `topup-${e.id}`,
          date: e.date,
          type: "deposit",
          description: e.description || t("topUpWallet"),
          amount: Number(e.amount),
          method: payMethod,
          expenseId: e.id,
        });
      }

      // 2. Deductions
      if (e.advancePayments && Array.isArray(e.advancePayments)) {
        e.advancePayments.forEach((p) => {
          if (p.method === "iata_easypay") {
            list.push({
              id: `deduction-${e.id}-${p.id || p._id}`,
              date: p.date,
              type: "deduction",
              description: `${e.beneficiary || "IATA"} - ${e.description}`,
              amount: Number(p.amount),
              expenseId: e.id,
            });
          }
        });
      }
    });

    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [allExpenses, t]);

  const walletLimit = 10;
  const totalWalletPages = Math.ceil(iataTransactions.length / walletLimit);
  const paginatedWalletTransactions = useMemo(() => {
    return iataTransactions.slice(
      (walletPage - 1) * walletLimit,
      walletPage * walletLimit
    );
  }, [iataTransactions, walletPage]);

  const handleTopUpClick = () => {
    setSelectedExpense(null);
    setFormPrefill({
      category: "iata_easypay_topup",
      description: t("iata_easypay_topup") || "IATA EasyPay Wallet Top-Up",
      amount: 0,
      date: new Date().toISOString().split("T")[0],
    });
    setIsFormOpen(true);
  };

  const handleLogFlightClick = () => {
    setSelectedExpense(null);
    setFormPrefill({
      bookingType: "Flight",
      beneficiary: "IATA EasyPay",
      description: "",
      amount: 0,
      date: new Date().toISOString().split("T")[0],
      items: [
        {
          description: "",
          quantity: 1,
          unitPrice: 0,
          nights: 1,
          total: 0,
        },
      ],
    });
    setActiveTab("order_note");
    setIsFormOpen(true);
  };

  const { data: expensesData, isLoading } = useQuery<{
    expenses: Expense[];
    total: number;
    page: number;
    totalPages: number;
  }>({
    queryKey: [
      "expenses",
      activeTab,
      currentPage,
      itemsPerPage,
      searchTerm,
      selectedBookingType,
      selectedSupplier,
      selectedBranchId,
    ],
    queryFn: () =>
      api.getExpenses({
        type: activeTab === "iata_easypay" ? undefined : activeTab,
        page: currentPage,
        limit: itemsPerPage,
        searchTerm,
        bookingType: selectedBookingType,
        beneficiary: selectedSupplier,
        branchId: selectedBranchId,
      }),
    enabled: activeTab !== "iata_easypay",
  });

  const expenses = expensesData?.expenses || [];

  // Find the most up-to-date version of the selected expense from the fetched list
  const activeExpense = selectedExpense
    ? expenses?.find((e) => e.id === selectedExpense.id) || selectedExpense
    : null;

  const createMutation = useMutation({
    mutationFn: api.createExpense,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["allExpensesForWallet"] });
      queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
      queryClient.invalidateQueries({ queryKey: ["profitReport"] });
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      queryClient.invalidateQueries({ queryKey: ["client"] });
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      queryClient.invalidateQueries({ queryKey: ["supplier"] });
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
      queryClient.invalidateQueries({ queryKey: ["allExpensesForWallet"] });
      queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
      queryClient.invalidateQueries({ queryKey: ["profitReport"] });
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      queryClient.invalidateQueries({ queryKey: ["client"] });
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      queryClient.invalidateQueries({ queryKey: ["supplier"] });
      toast.success(t("expenseUpdated"));
      setIsFormOpen(false);
    },
    onError: () => toast.error(t("errorUpdatingExpense")),
  });

  const deleteMutation = useMutation({
    mutationFn: api.deleteExpense,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["allExpensesForWallet"] });
      queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
      queryClient.invalidateQueries({ queryKey: ["profitReport"] });
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      queryClient.invalidateQueries({ queryKey: ["client"] });
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      queryClient.invalidateQueries({ queryKey: ["supplier"] });
      toast.success(t("expenseDeleted"));
      setExpenseToDelete(null);
    },
    onError: () => toast.error(t("errorDeletingExpense")),
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: api.bulkDeleteExpenses,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["allExpensesForWallet"] });
      queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
      queryClient.invalidateQueries({ queryKey: ["profitReport"] });
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      queryClient.invalidateQueries({ queryKey: ["client"] });
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      queryClient.invalidateQueries({ queryKey: ["supplier"] });
      toast.success(t("expensesDeleted"));
      setSelectedIds(new Set());
      setShowBulkDeleteConfirm(false);
    },
    onError: () => toast.error(t("errorDeletingExpense")),
  });

  const toggleSelectAll = () => {
    if (selectedIds.size === expenses.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(expenses.map((e) => e.id)));
    }
  };

  const toggleSelectOne = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const [exportingId, setExportingId] = useState<number | null>(null);

  const handleExportExcel = async (expense: Expense) => {
    setExportingId(expense.id);
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
      setExportingId(null);
    }
  };

  const [isExportingIata, setIsExportingIata] = useState(false);

  const handleExportIataExcel = async () => {
    setIsExportingIata(true);
    try {
      const blob = await api.exportIataWalletToExcel("ar", selectedBranchId);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `كشف_حساب_محفظة_إياتا.xlsx`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success(t("exportSuccess"));
    } catch (error) {
      console.error("Failed to export IATA wallet Excel", error);
      toast.error(t("exportFailed"));
    } finally {
      setIsExportingIata(false);
    }
  };

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
        <div className="flex items-center gap-3">
          {selectedIds.size > 0 && activeTab !== "iata_easypay" && (
            <button
              onClick={() => setShowBulkDeleteConfirm(true)}
              className="flex items-center gap-2 bg-red-600 text-white hover:bg-red-700 transition-colors px-4 py-2 rounded-lg"
            >
              <Trash2 className="w-4 h-4" />
              {t("deleteSelected")} ({selectedIds.size})
            </button>
          )}

          {activeTab === "iata_easypay" ? (
            <div className="flex items-center gap-2">
              <button
                onClick={handleTopUpClick}
                className="flex items-center gap-2 bg-emerald-600 text-white hover:bg-emerald-700 transition-colors px-4 py-2 rounded-lg font-medium shadow-sm hover:shadow"
              >
                <Plus className="w-4 h-4" />
                {t("topUpWallet")}
              </button>
              <button
                onClick={handleLogFlightClick}
                className="flex items-center gap-2 bg-primary text-white hover:bg-primary/90 transition-colors px-4 py-2 rounded-lg font-medium shadow-sm hover:shadow"
              >
                <Plus className="w-4 h-4" />
                {t("logFlightTicket")}
              </button>
            </div>
          ) : (
            <button
              onClick={() => {
                setSelectedExpense(null);
                setFormPrefill(null);
                setIsFormOpen(true);
              }}
              className="btn-primary flex items-center gap-2 bg-primary text-white hover:bg-primary/90 transition-colors px-4 py-2 rounded-lg"
            >
              <Plus className="w-4 h-4" />
              {activeTab === "order_note"
                ? t("addOrderNote")
                : t("addRegularExpense")}
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl w-fit">
        <button
          onClick={() => handleTabChange("order_note")}
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
          onClick={() => handleTabChange("regular")}
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
        <button
          onClick={() => handleTabChange("iata_easypay")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === "iata_easypay"
              ? "bg-white dark:bg-gray-700 text-primary shadow-sm"
              : "text-gray-500 hover:text-gray-900 dark:hover:text-gray-200"
          }`}
        >
          <div className="flex items-center gap-2">
            <Wallet className="w-4 h-4" />
            {t("iataWallet") || "IATA EasyPay"}
          </div>
        </button>
      </div>

      {/* IATA EasyPay Dashboard Widget */}
      {activeTab === "iata_easypay" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in">
          {/* Balance Card */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <Wallet className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">{t("iataBalance")}</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {walletBalance.toLocaleString()} MAD
              </p>
            </div>
          </div>

          {/* Total Top-Ups Card */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-950/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <ArrowUpRight className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">{t("totalTopUps")}</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {totalTopUps.toLocaleString()} MAD
              </p>
            </div>
          </div>

          {/* Total Deductions Card */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-950/30 flex items-center justify-center text-red-600 dark:text-red-400">
              <ArrowDownLeft className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">{t("totalDeductions")}</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {totalDeductions.toLocaleString()} MAD
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Filters (Hidden for IATA Wallet) */}
      {activeTab !== "iata_easypay" && (
        <div className="flex flex-col md:flex-row gap-4 bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder={t("searchExpenses") as string}
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          {/* Booking Type & Supplier Filters (Order Notes Only) */}
          {activeTab === "order_note" && (
            <>
              <select
                value={selectedBookingType}
                onChange={(e) => handleBookingTypeChange(e.target.value)}
                className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="">{t("allBookingTypes") || "All Types"}</option>
                <option value="Hotel">{t("bookingTypes.Hotel")}</option>
                <option value="Flight">{t("bookingTypes.Flight")}</option>
                <option value="Visa">{t("bookingTypes.Visa")}</option>
                <option value="Transfer">{t("bookingTypes.Transfer")}</option>
                <option value="Other">{t("bookingTypes.Other")}</option>
              </select>

              <select
                value={selectedSupplier}
                onChange={(e) => handleSupplierChange(e.target.value)}
                className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/20 min-w-[200px]"
              >
                <option value="">{t("allSuppliers") || "All Suppliers"}</option>
                {suppliersData?.suppliers?.map((supplier) => (
                  <option key={supplier.id} value={supplier.name}>
                    {supplier.name}
                  </option>
                ))}
              </select>
            </>
          )}
        </div>
      )}

      {/* Main List */}
      {activeTab === "iata_easypay" ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-700/30 flex justify-between items-center">
            <h3 className="font-semibold text-gray-900 dark:text-white">{t("iataTransactions")}</h3>
            <button
              onClick={handleExportIataExcel}
              disabled={isExportingIata}
              className="flex items-center gap-2 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-all disabled:opacity-50 text-xs font-medium shadow-sm hover:shadow"
            >
              <FileText className="w-3.5 h-3.5" />
              {isExportingIata ? t("exporting") : t("exportToExcel")}
            </button>
          </div>
          {!paginatedWalletTransactions.length ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <Wallet className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                {t("noTransactions") || "No Transactions Recorded"}
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                {t("noTransactionsLead") || "Add deposits or log ticket deductions to start tracking."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-gray-50 dark:bg-gray-700/50">
                  <tr>
                    <th className="p-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{t("date")}</th>
                    <th className="p-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{t("description")}</th>
                    <th className="p-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{t("type")}</th>
                    <th className="p-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{t("amount")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {paginatedWalletTransactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <td className="p-4 text-sm text-gray-600 dark:text-gray-300">
                        {new Date(tx.date).toLocaleDateString()}
                      </td>
                      <td className="p-4 text-sm font-medium text-gray-900 dark:text-white">
                        {tx.description}
                      </td>
                      <td className="p-4 text-sm">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          tx.type === "deposit"
                            ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                            : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                        }`}>
                          {tx.type === "deposit" ? t("iata_easypay_topup") : t("bookingTypes.Flight") || "Flight"}
                        </span>
                      </td>
                      <td className={`p-4 text-sm font-semibold ${
                        tx.type === "deposit" ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                      }`}>
                        {tx.type === "deposit" ? "+" : "-"} {tx.amount.toLocaleString()} MAD
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {totalWalletPages > 1 && (
            <div className="p-4 border-t border-gray-200 dark:border-gray-700">
              <PaginationControls
                currentPage={walletPage}
                totalPages={totalWalletPages}
                totalCount={iataTransactions.length}
                limit={walletLimit}
                onPageChange={(page) => setWalletPage(page)}
              />
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center text-gray-500">{t("loading")}</div>
          ) : !expenses?.length ? (
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
                    <th className="p-4 w-[40px]">
                      <input
                        type="checkbox"
                        checked={
                          expenses.length > 0 &&
                          selectedIds.size === expenses.length
                        }
                        onChange={toggleSelectAll}
                        className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary/20 cursor-pointer"
                      />
                    </th>
                    <th className="p-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase text-left">
                      {t("date")}
                    </th>
                    <th className="p-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase text-left">
                      {t("description")}
                    </th>
                    <th className="p-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase text-left w-[12%]">
                      {activeTab === "order_note"
                        ? t("beneficiary")
                        : t("category")}
                    </th>

                    {/* NEW: Booking Type & Ref (Order Notes Only) */}
                    {activeTab === "order_note" && (
                      <>
                        <th className="p-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase text-left w-[10%]">
                          {t("bookingType")}
                        </th>
                      </>
                    )}

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

                    <th className="p-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase text-left w-[15%]">
                      {t("status")}
                    </th>
                    <th className="p-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase text-left">
                      {t("actions")}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {expenses.map((expense: Expense) => (
                    <tr
                      key={expense.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                    >
                      <td className="p-4">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(expense.id)}
                          onChange={() => toggleSelectOne(expense.id)}
                          className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary/20 cursor-pointer"
                        />
                      </td>
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

                      {/* NEW: Booking Type & Ref Data */}
                      {activeTab === "order_note" && (
                        <>
                          <td className="p-4 text-sm text-gray-600 dark:text-gray-300">
                            {expense.bookingType
                              ? t(`bookingTypes.${expense.bookingType}`)
                              : "-"}
                          </td>
                        </>
                      )}

                      {/* Amount - Shows Original Currency */}
                      <td className="p-4 text-sm text-left font-medium text-gray-900 dark:text-white">
                        {Number(expense.amount).toLocaleString()}{" "}
                        {t(`currency.${expense.currency}`) ||
                          expense.currency ||
                          "dh"}
                      </td>

                      {/* Paid - Shows Original Currency */}
                      <td className="p-4 text-sm text-left text-emerald-600 font-medium">
                        {(activeTab === "regular"
                          ? Number(expense.amount)
                          : Number(expense.amount) -
                          Number(expense.remainingBalance)
                        ).toLocaleString()}{" "}
                        {t(`currency.${expense.currency}`) ||
                          expense.currency ||
                          "dh"}
                      </td>

                      {/* Remaining - Shows Original Currency */}
                      {activeTab === "order_note" && (
                        <td className="p-4 text-sm text-left text-red-600 font-medium">
                          {Number(expense.remainingBalance).toLocaleString()}{" "}
                          {t(`currency.${expense.currency}`) ||
                            expense.currency ||
                            "dh"}
                        </td>
                      )}

                      <td className="p-4 text-left">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${expense.isFullyPaid
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
                            onClick={() => handleExportExcel(expense)}
                            disabled={exportingId === expense.id}
                            className="p-2 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-colors disabled:opacity-50"
                            title={t("exportToExcel") as string}
                          >
                            <FileText className="w-4 h-4" />
                          </button>
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

          {/* Pagination Controls */}
          {expensesData && expensesData.totalPages > 1 && (
            <div className="p-4 border-t border-gray-200 dark:border-gray-700">
              <PaginationControls
                currentPage={currentPage}
                totalPages={expensesData.totalPages}
                totalCount={expensesData.total}
                limit={itemsPerPage}
                onPageChange={(page) => setCurrentPage(page)}
              />
            </div>
          )}
        </div>
      )}

      <Modal
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setFormPrefill(null);
        }}
        title={
          activeExpense
            ? t("editExpense")
            : activeTab === "order_note"
              ? t("addOrderNote")
              : t("addRegularExpense")
        }
        size={activeTab === "order_note" ? "xl2" : "xl"}
      >
        {activeTab === "order_note" ? (
          <OrderNoteForm
            key={activeExpense?.id || (formPrefill ? "prefill" : "new")}
            initialData={activeExpense || formPrefill || undefined}
            onSubmit={(data) => {
              if (activeExpense) {
                updateMutation.mutate({ id: activeExpense.id, data });
              } else {
                createMutation.mutate({ ...data, type: "order_note" });
              }
              setFormPrefill(null);
            }}
            onCancel={() => {
              setIsFormOpen(false);
              setFormPrefill(null);
            }}
          />
        ) : (
          <RegularExpenseForm
            key={activeExpense?.id || (formPrefill ? "prefill" : "new")}
            initialData={activeExpense || formPrefill || undefined}
            onSubmit={(data) => {
              if (activeExpense) {
                updateMutation.mutate({ id: activeExpense.id, data });
              } else {
                createMutation.mutate({ ...data, type: "regular" });
              }
              setFormPrefill(null);
            }}
            onCancel={() => {
              setIsFormOpen(false);
              setFormPrefill(null);
            }}
          />
        )}
      </Modal>

      <ExpensePaymentModal
        expense={activeExpense}
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

      <ConfirmationModal
        isOpen={showBulkDeleteConfirm}
        onClose={() => setShowBulkDeleteConfirm(false)}
        onConfirm={() =>
          bulkDeleteMutation.mutate(Array.from(selectedIds))
        }
        title={t("deleteExpenseTitle")}
        message={`${t("bulkDeleteExpenseMessage")} (${selectedIds.size})`}
      />
    </div>
  );
}
