// frontend/src/pages/ClientAnalysis.tsx
import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Phone, Mail, MapPin, FileText, Calendar } from "lucide-react";
import * as api from "../services/api";
import { Client, Income } from "../context/models";
import Modal from "../components/Modal";
import DeliveryNoteForm from "../components/incomes/DeliveryNoteForm";
import PaginationControls from "../components/ui/PaginationControls";

// Define the specific shape expected for the analysis view (includes incomes)
interface ClientDetail extends Client {
  incomes?: Income[];
  incomesTotal?: number;
  incomesTotalPages?: number;
  incomesPage?: number;
  totalAmount?: number;
  totalPaid?: number;
  totalRemaining?: number;
}

const ITEMS_PER_PAGE = 7;

export default function ClientAnalysis() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIncome, setSelectedIncome] = useState<Income | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { data: client, isLoading } = useQuery<ClientDetail>({
    queryKey: ["client", id, currentPage],
    queryFn: () => api.getClient(Number(id), currentPage, ITEMS_PER_PAGE),
    enabled: !!id,
  });

  if (isLoading) return <div className="p-8 text-center">{t("loading")}</div>;
  if (!client) return <div className="p-8 text-center">{t("notFound")}</div>;

  const totalAmount = client.totalAmount || 0;
  const totalPaid = client.totalPaid || 0;
  const totalRemaining = client.totalRemaining || 0;

  const handleRowClick = (income: Income) => {
    setSelectedIncome(income);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedIncome(null);
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
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              {client.name}
            </h1>
            <div className="flex flex-wrap gap-4 text-gray-500">
              {client.email && (
                <span className="flex items-center gap-2">
                  <Mail className="w-4 h-4" /> {client.email}
                </span>
              )}
              {client.phone && (
                <span className="flex items-center gap-2">
                  <Phone className="w-4 h-4" /> {client.phone}
                </span>
              )}
              {client.address && (
                <span className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" /> {client.address}
                </span>
              )}
            </div>
          </div>

          <div className="flex gap-4">
            <div className="text-left">
              <p className="text-sm text-gray-500">{t("totalSales")}</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {totalAmount.toLocaleString()}{" "}
                <span className="text-sm font-normal">{t("currency.MAD")}</span>
              </p>
            </div>
            <div className="text-left px-4 border-l border-gray-200">
              <p className="text-sm text-gray-500">{t("totalPaid")}</p>
              <p className="text-2xl font-bold text-emerald-600">
                {totalPaid.toLocaleString()}{" "}
                <span className="text-sm font-normal">{t("currency.MAD")}</span>
              </p>
            </div>
            <div className="text-left px-4 border-l border-gray-200">
              <p className="text-sm text-gray-500">{t("totalRemaining")}</p>
              <p className="text-2xl font-bold text-red-600">
                {totalRemaining.toLocaleString()}{" "}
                <span className="text-sm font-normal">{t("currency.MAD")}</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
        <FileText className="w-5 h-5" />
        {t("salesHistory")}
      </h2>

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
            {client.incomes?.map((income: Income) => (
              <tr
                key={income.id}
                onClick={() => handleRowClick(income)}
                className="hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors"
              >
                <td className="p-4 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    {new Date(income.date).toLocaleDateString()}
                  </div>
                </td>
                <td className="p-4 text-sm font-medium text-gray-900 dark:text-white">
                  {income.description}
                </td>
                <td className="p-4 text-sm font-medium">
                  {Number(income.amount).toLocaleString()} {t("currency.MAD")}
                </td>
                <td className="p-4 text-sm text-emerald-600">
                  {(
                    Number(income.amount) - Number(income.remainingBalance)
                  ).toLocaleString()}{" "}
                  {t("currency.MAD")}
                </td>
                <td className="p-4 text-sm text-red-600">
                  {Number(income.remainingBalance).toLocaleString()}{" "}
                  {t("currency.MAD")}
                </td>
                <td className="p-4">
                  <span
                    className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${income.isFullyPaid
                        ? "bg-green-100 text-green-800"
                        : "bg-yellow-100 text-yellow-800"
                      }`}
                  >
                    {income.isFullyPaid ? t("paid") : t("pending")}
                  </span>
                </td>
              </tr>
            ))}
            {(!client.incomes || client.incomes.length === 0) && (
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
        totalPages={client.incomesTotalPages || 1}
        totalCount={client.incomesTotal || 0}
        limit={ITEMS_PER_PAGE}
        onPageChange={setCurrentPage}
      />

      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={t("incomeDetails") || "Income Details"}
        size="xl"
      >
        {selectedIncome && selectedIncome.type === "delivery_note" ? (
          <DeliveryNoteForm
            initialData={selectedIncome}
            onSubmit={() => { }}
            onCancel={handleCloseModal}
            readOnly={true}
          />
        ) : selectedIncome ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">{t("date")}</p>
                <p className="font-medium">{new Date(selectedIncome.date).toLocaleDateString()}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">{t("category")}</p>
                <p className="font-medium">{selectedIncome.category || "-"}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">{t("description")}</p>
                <p className="font-medium">{selectedIncome.description}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">{t("amount")}</p>
                <p className="font-medium">{Number(selectedIncome.amount).toLocaleString()} {t("currency.MAD")}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">{t("paid")}</p>
                <p className="font-medium text-emerald-600">
                  {(Number(selectedIncome.amount) - Number(selectedIncome.remainingBalance)).toLocaleString()} {t("currency.MAD")}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">{t("remainingBalance")}</p>
                <p className="font-medium text-red-600">
                  {Number(selectedIncome.remainingBalance).toLocaleString()} {t("currency.MAD")}
                </p>
              </div>
            </div>
            <div className="flex justify-end pt-4 border-t">
              <button
                onClick={handleCloseModal}
                className="px-4 py-2 text-foreground border border-input rounded-lg hover:bg-muted transition-colors"
              >
                {t("close")}
              </button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
