// frontend/src/pages/IncomeManagement.tsx
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
    ArrowRightLeft,
    Download,
} from "lucide-react";
import * as api from "../services/api";
import { Income, FacturationSettings } from "../context/models";
import Modal from "../components/Modal";
import ConfirmationModal from "../components/modals/ConfirmationModal";
import IncomePaymentModal from "../components/incomes/IncomePaymentModal";
import DeliveryNoteForm from "../components/incomes/DeliveryNoteForm";
import IncomeForm from "../components/incomes/IncomeForm";
import FactureForm from "../components/facturation/FactureForm";
import { toast } from "react-hot-toast";
import PaginationControls from "../components/ui/PaginationControls";
import { useAuthContext } from "../context/AuthContext";
import { pdf } from "@react-pdf/renderer";
import { saveAs } from "file-saver";
import DeliveryNotePDF from "../components/incomes/DeliveryNotePDF";

export default function IncomeManagement() {
    const { t } = useTranslation();
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState<"delivery_note" | "regular">(
        "delivery_note"
    );
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [selectedIncome, setSelectedIncome] = useState<Income | null>(null);
    const [incomeToDelete, setIncomeToDelete] = useState<number | null>(null);
    const [incomeToConvert, setIncomeToConvert] = useState<Income | null>(null);
    const [isFactureModalOpen, setIsFactureModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedBookingType, setSelectedBookingType] = useState("");
    const [selectedClient, setSelectedClient] = useState("");

    // Bulk deletion state
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
    const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const { state: authState } = useAuthContext();
    const { data: settings } = useQuery<FacturationSettings>({
        queryKey: ["settings"],
        queryFn: api.getSettings,
    });

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


    const handleTabChange = (val: "delivery_note" | "regular") => {
        setActiveTab(val);
        setCurrentPage(1);
        setSearchTerm("");
        setSelectedBookingType("");
        setSelectedClient("");
        setSelectedIds(new Set());
    };

    const { data: incomesData, isLoading } = useQuery<{
        incomes: Income[];
        total: number;
        page: number;
        totalPages: number;
    }>({
        queryKey: [
            "incomes",
            activeTab,
            currentPage,
            itemsPerPage,
            searchTerm,
            selectedBookingType,
            selectedClient,
        ],
        queryFn: () =>
            api.getIncomes({
                type: activeTab,
                page: currentPage,
                limit: itemsPerPage,
                searchTerm,
                bookingType: selectedBookingType,
                client: selectedClient,
            }),
    });

    const incomes = incomesData?.incomes || [];

    const activeIncome = selectedIncome
        ? incomes?.find((e) => e.id === selectedIncome.id) || selectedIncome
        : null;

    const createMutation = useMutation({
        mutationFn: api.createIncome,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["incomes"] });
            queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
            queryClient.invalidateQueries({ queryKey: ["profitReport"] });
            toast.success(t("incomeCreated", { defaultValue: "Income Created" }));
            setIsFormOpen(false);
        },
        onError: () => toast.error(t("errorCreatingIncome", { defaultValue: "Error Creating Income" })),
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: number; data: Partial<Income> }) =>
            api.updateIncome(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["incomes"] });
            queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
            queryClient.invalidateQueries({ queryKey: ["profitReport"] });
            toast.success(t("incomeUpdated", { defaultValue: "Income Updated" }));
            setIsFormOpen(false);
        },
        onError: () => toast.error(t("errorUpdatingIncome", { defaultValue: "Error Updating Income" })),
    });

    const deleteMutation = useMutation({
        mutationFn: api.deleteIncome,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["incomes"] });
            queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
            queryClient.invalidateQueries({ queryKey: ["profitReport"] });
            toast.success(t("incomeDeleted", { defaultValue: "Income Deleted" }));
            setIncomeToDelete(null);
        },
        onError: () => toast.error(t("errorDeletingIncome", { defaultValue: "Error Deleting Income" })),
    });

    const bulkDeleteMutation = useMutation({
        mutationFn: api.bulkDeleteIncomes,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["incomes"] });
            queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
            queryClient.invalidateQueries({ queryKey: ["profitReport"] });
            toast.success(t("incomesDeleted", { defaultValue: "Incomes Deleted" }));
            setSelectedIds(new Set());
            setShowBulkDeleteConfirm(false);
        },
        onError: () => toast.error(t("errorDeletingIncome", { defaultValue: "Error Deleting Income" })),
    });



    const handleFactureSave = async (data: any) => {
        try {
            // Create the facture using the provided data
            const newFacture = await api.createFacture(data);

            // Link the new facture to the source income
            if (incomeToConvert) {
                await api.updateIncome(incomeToConvert.id, { factureId: newFacture.id });
                toast.success(t("convertedToFacture", { defaultValue: "Successfully converted to invoice" }));
            }

            queryClient.invalidateQueries({ queryKey: ["incomes"] });
            queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
            queryClient.invalidateQueries({ queryKey: ["profitReport"] });
            setIsFactureModalOpen(false);
            setIncomeToConvert(null);
        } catch (error: any) {
            toast.error(error.message || t("errorConvertingToFacture", { defaultValue: "Error converting to invoice" }));
        }
    };

    const handleDownloadPDF = async (income: Income) => {
        try {
            const doc = <DeliveryNotePDF 
                income={income} 
                settings={settings} 
                agencyName={authState.user?.agencyName} 
            />;
            
            const blob = await pdf(doc).toBlob();
            const clientName = income.client ? income.client.replace(/\s/g, "_") : income.id.toString();
            const docNumber = income.deliveryNoteNumber || income.id;
            saveAs(blob, `Bon_de_Vente_${docNumber}_${clientName}.pdf`);
            
            toast.success(t("downloadStarted") || "Download started");
        } catch (error) {
            console.error("PDF Generation error:", error);
            toast.error("Failed to generate PDF");
        }
    };

    const toggleSelectAll = () => {
        if (selectedIds.size === incomes.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(incomes.map((e) => e.id)));
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

    const handleEdit = (income: Income) => {
        setSelectedIncome(income);
        setIsFormOpen(true);
    };

    const handleManagePayments = (income: Income) => {
        setSelectedIncome(income);
        setIsPaymentModalOpen(true);
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Wallet className="w-8 h-8 text-primary" />
                        {t("incomesManagement")}
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">
                        {t("incomesSubtitle")}
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    {selectedIds.size > 0 && (
                        <button
                            onClick={() => setShowBulkDeleteConfirm(true)}
                            className="flex items-center gap-2 bg-red-600 text-white hover:bg-red-700 transition-colors px-4 py-2 rounded-lg"
                        >
                            <Trash2 className="w-4 h-4" />
                            {t("deleteSelected")} ({selectedIds.size})
                        </button>
                    )}
                    <button
                        onClick={() => {
                            setSelectedIncome(null);
                            setIsFormOpen(true);
                        }}
                        className="btn-primary flex items-center gap-2 bg-primary text-white hover:bg-primary/90 transition-colors px-4 py-2 rounded-lg"
                    >
                        <Plus className="w-4 h-4" />
                        {activeTab === "delivery_note"
                            ? t("addDeliveryNote")
                            : t("addRegularIncome")}
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex space-x-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl w-fit">
                <button
                    onClick={() => handleTabChange("delivery_note")}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === "delivery_note"
                        ? "bg-white dark:bg-gray-700 text-primary shadow-sm"
                        : "text-gray-500 hover:text-gray-900 dark:hover:text-gray-200"
                        }`}
                >
                    <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        {t("deliveryNotes")}
                    </div>
                </button>
                <button
                    onClick={() => handleTabChange("regular")}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === "regular"
                        ? "bg-white dark:bg-gray-700 text-primary shadow-sm"
                        : "text-gray-500 hover:text-gray-900 dark:hover:text-gray-200"
                        }`}
                >
                    <div className="flex items-center gap-2">
                        <Building className="w-4 h-4" />
                        {t("regularIncomes")}
                    </div>
                </button>
            </div>

            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4 bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                        type="text"
                        placeholder={t("searchIncomes") as string}
                        value={searchTerm}
                        onChange={(e) => handleSearchChange(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                </div>

                {activeTab === "delivery_note" && (
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
                    </>
                )}
            </div>

            {/* List */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                {isLoading ? (
                    <div className="p-8 text-center text-gray-500">{t("loading")}</div>
                ) : !incomes?.length ? (
                    <div className="p-12 text-center">
                        <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Wallet className="w-8 h-8 text-gray-400" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                            {t("noIncomesFound", { defaultValue: "No Incomes Found" })}
                        </h3>
                        <p className="text-gray-500 dark:text-gray-400">
                            {t("createIncomeLead")}
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
                                                incomes.length > 0 &&
                                                selectedIds.size === incomes.length
                                            }
                                            onChange={toggleSelectAll}
                                            className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary/20 cursor-pointer"
                                        />
                                    </th>
                                    <th className="p-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase text-left">
                                        {t("date")}
                                    </th>
                                    <th className="p-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase text-left">
                                        {activeTab === "delivery_note"
                                            ? t("deliveryNoteNumber")
                                            : t("description")}
                                    </th>
                                    <th className="p-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase text-left w-[12%]">
                                        {activeTab === "delivery_note"
                                            ? t("client")
                                            : t("category")}
                                    </th>

                                    {/* Removed Booking Type column */}

                                    <th className="p-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase text-left">
                                        {t("amount")}
                                    </th>

                                    <th className="p-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase text-left">
                                        {t("paid")}
                                    </th>

                                    {activeTab === "delivery_note" && (
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
                                {incomes.map((income: Income) => (
                                    <tr
                                        key={income.id}
                                        className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                                    >
                                        <td className="p-4">
                                            <input
                                                type="checkbox"
                                                checked={selectedIds.has(income.id)}
                                                onChange={() => toggleSelectOne(income.id)}
                                                className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary/20 cursor-pointer"
                                            />
                                        </td>
                                        <td className="p-4 text-sm text-gray-600 dark:text-gray-300">
                                            {new Date(income.date).toLocaleDateString()}
                                        </td>
                                        <td className="p-4 text-sm font-medium text-gray-900 dark:text-white">
                                            {activeTab === "delivery_note"
                                                ? income.deliveryNoteNumber || "-"
                                                : income.description}
                                        </td>
                                        <td className="p-4 text-sm text-gray-600 dark:text-gray-300">
                                            {activeTab === "delivery_note"
                                                ? income.client
                                                : t(income.category || "", { defaultValue: income.category })}
                                        </td>

                                        {/* Removed Booking Type data cell */}

                                        <td className="p-4 text-sm text-left font-medium text-gray-900 dark:text-white">
                                            {Number(income.amount).toLocaleString()}{" "}
                                            {t(`currency.${income.currency}`, { defaultValue: income.currency || "MAD" })}
                                        </td>

                                        <td className="p-4 text-sm text-left text-emerald-600 font-medium">
                                            {(activeTab === "regular"
                                                ? Number(income.amount)
                                                : Number(income.amount) - Number(income.remainingBalance)
                                            ).toLocaleString()}{" "}
                                            {t(`currency.${income.currency}`, { defaultValue: income.currency || "MAD" })}
                                        </td>

                                        {activeTab === "delivery_note" && (
                                            <td className="p-4 text-sm text-left text-red-600 font-medium">
                                                {Number(income.remainingBalance).toLocaleString()}{" "}
                                                {t(`currency.${income.currency}`, { defaultValue: income.currency || "MAD" })}
                                            </td>
                                        )}

                                        <td className="p-4 text-left">
                                            <span
                                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${income.isFullyPaid
                                                    ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                                                    : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
                                                    }`}
                                            >
                                                {income.isFullyPaid ? (
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
                                            {activeTab === "delivery_note" && income.factureId && (
                                                <div className="mt-1">
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                                                        {t("invoiced")}
                                                    </span>
                                                </div>
                                            )}
                                        </td>
                                        <td className="p-4 text-left">
                                            <div className="flex justify-start gap-2">
                                                {activeTab === "delivery_note" && (
                                                    <>
                                                        <button
                                                            onClick={() => handleDownloadPDF(income)}
                                                            className="p-2 text-gray-600 hover:text-green-600 dark:text-gray-400 dark:hover:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                                                            title={t("download") as string}
                                                        >
                                                            <Download className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleManagePayments(income)}
                                                            className="p-2 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-colors"
                                                            title={t("managePayments") as string}
                                                        >
                                                            <CreditCard className="w-4 h-4" />
                                                        </button>
                                                        {!income.factureId && (
                                                            <button
                                                                onClick={() => {
                                                                    setIncomeToConvert(income);
                                                                    setIsFactureModalOpen(true);
                                                                }}
                                                                className="p-2 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-colors"
                                                                title={t("convertToFacture") as string}
                                                            >
                                                                <ArrowRightLeft className="w-4 h-4" />
                                                            </button>
                                                        )}
                                                    </>
                                                )}
                                                <button
                                                    onClick={() => handleEdit(income)}
                                                    className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => setIncomeToDelete(income.id)}
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

                {incomesData && incomesData.totalPages > 1 && (
                    <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                        <PaginationControls
                            currentPage={currentPage}
                            totalPages={incomesData.totalPages}
                            totalCount={incomesData.total}
                            limit={itemsPerPage}
                            onPageChange={(page) => setCurrentPage(page)}
                        />
                    </div>
                )}
            </div>

            <Modal
                isOpen={isFormOpen}
                onClose={() => setIsFormOpen(false)}
                title={
                    activeIncome
                        ? t("editIncome")
                        : activeTab === "delivery_note"
                            ? t("addDeliveryNote")
                            : t("addRegularIncome")
                }
                size={activeTab === "delivery_note" ? "xl2" : "xl"}
            >
                {activeTab === "delivery_note" ? (
                    <DeliveryNoteForm
                        initialData={activeIncome || undefined}
                        onSubmit={(data) => {
                            if (activeIncome) {
                                updateMutation.mutate({ id: activeIncome.id, data });
                            } else {
                                createMutation.mutate({ ...data, type: "delivery_note" });
                            }
                        }}
                        onCancel={() => setIsFormOpen(false)}
                    />
                ) : (
                    <IncomeForm
                        initialData={activeIncome || undefined}
                        onSubmit={(data) => {
                            if (activeIncome) {
                                updateMutation.mutate({ id: activeIncome.id, data });
                            } else {
                                createMutation.mutate({ ...data, type: "regular" });
                            }
                        }}
                        onCancel={() => setIsFormOpen(false)}
                    />
                )}
            </Modal>

            <IncomePaymentModal
                income={activeIncome}
                isOpen={isPaymentModalOpen}
                onClose={() => setIsPaymentModalOpen(false)}
            />

            {incomeToDelete && (
                <ConfirmationModal
                    isOpen={!!incomeToDelete}
                    onClose={() => setIncomeToDelete(null)}
                    onConfirm={() => deleteMutation.mutate(incomeToDelete)}
                    title={t("deleteIncomeTitle", { defaultValue: "Delete Income" })}
                    message={t("deleteIncomeMessage", { defaultValue: "Are you sure you want to delete this income?" })}
                />
            )}

            {isFactureModalOpen && incomeToConvert && (
                <Modal
                    isOpen={isFactureModalOpen}
                    onClose={() => {
                        setIsFactureModalOpen(false);
                        setIncomeToConvert(null);
                    }}
                    title={t("convertToFacture", { defaultValue: "Convert to Invoice" })}
                    size="xl"
                >
                    <FactureForm
                        onSave={handleFactureSave}
                        onCancel={() => {
                            setIsFactureModalOpen(false);
                            setIncomeToConvert(null);
                        }}
                        existingFacture={{
                            clientName: incomeToConvert.client || "",
                            clientAddress: incomeToConvert.clientAddress || "",
                            clientICE: incomeToConvert.clientICE || "",
                            date: incomeToConvert.date,
                            items: (incomeToConvert.items || []).map((item: any) => ({
                                description: item.description || "",
                                quantity: Number(item.quantity) || 1,
                                prixUnitaire: Number(item.prixUnitaire || item.unitPrice) || 0,
                                fraisServiceUnitaire: Number(item.fraisServiceUnitaire) || 0,
                                total: Number(item.total) || 0
                            })),
                            type: "facture",
                            showMargin: incomeToConvert.showMargin ?? true,
                            prixTotalHorsFrais: incomeToConvert.prixTotalHorsFrais || incomeToConvert.amount,
                            totalFraisServiceHT: incomeToConvert.totalFraisServiceHT || 0,
                            tva: incomeToConvert.tva || 0,
                            total: incomeToConvert.amount,
                            notes: incomeToConvert.notes || `Converted from Delivery Note #${incomeToConvert.deliveryNoteNumber || incomeToConvert.id}`
                        } as any}
                    />
                </Modal>
            )}

            <ConfirmationModal
                isOpen={showBulkDeleteConfirm}
                onClose={() => setShowBulkDeleteConfirm(false)}
                onConfirm={() => bulkDeleteMutation.mutate(Array.from(selectedIds))}
                title={t("deleteIncomeTitle", { defaultValue: "Delete Income" })}
                message={`${t("bulkDeleteIncomeMessage", { defaultValue: "Are you sure you want to delete the selected incomes?" })} (${selectedIds.size})`}
            />
        </div>
    );
}
