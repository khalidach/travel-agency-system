// frontend/src/pages/SupplierAnalysis.tsx
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Phone, Mail, FileText, Calendar } from "lucide-react";
import * as api from "../services/api";
import { Supplier, Expense } from "../context/models";

// Define the specific shape expected for the analysis view (includes expenses)
interface SupplierDetail extends Supplier {
  expenses?: Expense[];
}

export default function SupplierAnalysis() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const { data: supplier, isLoading } = useQuery<SupplierDetail>({
    queryKey: ["supplier", id],
    queryFn: () => api.getSupplier(Number(id)),
    enabled: !!id,
  });

  if (isLoading) return <div className="p-8 text-center">{t("loading")}</div>;
  if (!supplier) return <div className="p-8 text-center">{t("notFound")}</div>;

  // Calculate stats from the expenses array returned by the detailed endpoint
  const totalAmount =
    supplier.expenses?.reduce(
      (acc: number, curr: Expense) => acc + Number(curr.amount),
      0,
    ) || 0;

  const totalRemaining =
    supplier.expenses?.reduce(
      (acc: number, curr: Expense) => acc + Number(curr.remainingBalance),
      0,
    ) || 0;

  const totalPaid = totalAmount - totalRemaining;

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
              {supplier.name}
            </h1>
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
        {t("purchaseHistory")}
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
            {supplier.expenses?.map((expense: Expense) => (
              <tr
                key={expense.id}
                className="hover:bg-gray-50 dark:hover:bg-gray-700/50"
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
                  {Number(expense.amount).toLocaleString()} {t("currency.MAD")}
                </td>
                <td className="p-4 text-sm text-emerald-600">
                  {(
                    Number(expense.amount) - Number(expense.remainingBalance)
                  ).toLocaleString()}{" "}
                  {t("currency.MAD")}
                </td>
                <td className="p-4 text-sm text-red-600">
                  {Number(expense.remainingBalance).toLocaleString()}{" "}
                  {t("currency.MAD")}
                </td>
                <td className="p-4">
                  <span
                    className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                      expense.isFullyPaid
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
    </div>
  );
}
