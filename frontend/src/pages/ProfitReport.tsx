import React, { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";
import {
  Filter,
  TrendingUp,
  DollarSign,
  Calendar,
  Package,
  HelpCircle, // Import help icon
} from "lucide-react";
import * as api from "../services/api";
import DashboardSkeleton from "../components/skeletons/DashboardSkeleton";
import { usePagination } from "../hooks/usePagination";
import PaginationControls from "../components/booking/PaginationControls";
import { PaginatedResponse } from "../context/models";
import VideoHelpModal from "../components/VideoHelpModal"; // Import the modal

interface ProfitReportData {
  topProgramsData: any[];
  detailedPerformanceData: any[];
  monthlyTrend: any[];
  pagination: PaginatedResponse<any>["pagination"];
  summary: {
    totalBookings: number;
    totalSales: number;
    totalProfit: number;
    totalCost: number;
  };
}

export default function ProfitReport() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false); // State for the modal

  const [filterType, setFilterType] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  const {
    data: reportData,
    isLoading,
    isError,
  } = useQuery<ProfitReportData>({
    queryKey: ["profitReport", filterType, currentPage],
    queryFn: () => api.getProfitReport(filterType, currentPage, itemsPerPage),
  });

  const topProgramsData = reportData?.topProgramsData ?? [];
  const detailedPerformanceData = reportData?.detailedPerformanceData ?? [];
  const monthlyTrend = reportData?.monthlyTrend ?? [];
  const pagination = reportData?.pagination;
  const summary = reportData?.summary;

  const totals = useMemo(() => {
    const totalSales = summary?.totalSales ?? 0;
    const totalProfit = summary?.totalProfit ?? 0;
    const profitMargin = totalSales > 0 ? (totalProfit / totalSales) * 100 : 0;

    return {
      totalBookings: summary?.totalBookings ?? 0,
      totalSales,
      totalProfit,
      profitMargin,
    };
  }, [summary]);

  const paginationRange = usePagination({
    currentPage,
    totalCount: pagination?.totalCount ?? 0,
    pageSize: itemsPerPage,
  });

  if (isLoading && !reportData) {
    return <DashboardSkeleton />;
  }

  if (isError) {
    return <div>{t("errorLoadingDashboard")}</div>;
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            {t("profitReportTitle")}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            {t("profitReportSubtitle")}
          </p>
        </div>
        <button
          onClick={() => setIsHelpModalOpen(true)}
          className="p-2 text-gray-500 bg-gray-100 rounded-full hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
          aria-label="Help"
        >
          <HelpCircle className="w-6 h-6" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                {t("totalBookings")}
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-2">
                {totals.totalBookings.toLocaleString()}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center">
              <Calendar className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                {t("totalSales")}
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-2">
                {totals.totalSales.toLocaleString()} {t("mad")}
              </p>
            </div>
            <div className="w-12 h-12 bg-emerald-500 rounded-xl flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                {t("totalProfit")}
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-2">
                {totals.totalProfit.toLocaleString()} {t("mad")}
              </p>
            </div>
            <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                {t("profitMargin")}
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-2">
                {totals.profitMargin.toFixed(1)}%
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center">
              <Package className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex items-center space-x-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {t("filters")}
            </span>
          </div>
          <select
            value={filterType}
            onChange={(e) => {
              setFilterType(e.target.value);
              setCurrentPage(1); // Reset page on filter change
            }}
            className="px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          >
            <option value="all">{t("allProgramTypes")}</option>
            <option value="Hajj">Hajj</option>
            <option value="Umrah">Umrah</option>
            <option value="Tourism">Tourism</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-6">
            {t("profitByProgram")}
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={topProgramsData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="programName"
                stroke="#6b7280"
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis stroke="#6b7280" />
              <Tooltip
                formatter={(value: number) => [
                  `${value.toLocaleString()} MAD`,
                  t("totalProfit"),
                ]}
              />
              <Bar dataKey="totalProfit" fill="#059669" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-6">
            {t("monthlyProfitTrend")}
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={monthlyTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip
                formatter={(value: number) => [
                  `${value.toLocaleString()} MAD`,
                  t("totalProfit"),
                ]}
              />
              <Line
                type="monotone"
                dataKey="profit"
                stroke="#3b82f6"
                strokeWidth={3}
                dot={{ fill: "#3b82f6", strokeWidth: 2, r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {t("detailedProgramPerformance")}
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700/50">
              <tr>
                <th
                  className={`px-6 py-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider ${
                    document.documentElement.dir === "rtl"
                      ? "text-right"
                      : "text-left"
                  }`}
                >
                  {t("programName")}
                </th>
                <th
                  className={`px-6 py-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider ${
                    document.documentElement.dir === "rtl"
                      ? "text-right"
                      : "text-left"
                  }`}
                >
                  {t("programType")}
                </th>
                <th
                  className={`px-6 py-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider ${
                    document.documentElement.dir === "rtl"
                      ? "text-right"
                      : "text-left"
                  }`}
                >
                  {t("bookings")}
                </th>
                <th
                  className={`px-6 py-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider ${
                    document.documentElement.dir === "rtl"
                      ? "text-right"
                      : "text-left"
                  }`}
                >
                  {t("totalSales")}
                </th>
                <th
                  className={`px-6 py-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider ${
                    document.documentElement.dir === "rtl"
                      ? "text-right"
                      : "text-left"
                  }`}
                >
                  {t("totalCost")}
                </th>
                <th
                  className={`px-6 py-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider ${
                    document.documentElement.dir === "rtl"
                      ? "text-right"
                      : "text-left"
                  }`}
                >
                  {t("totalProfit")}
                </th>
                <th
                  className={`px-6 py-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider ${
                    document.documentElement.dir === "rtl"
                      ? "text-right"
                      : "text-left"
                  }`}
                >
                  {t("profitMargin")}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {detailedPerformanceData.map((item) => (
                <tr
                  key={item.id}
                  className="hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors cursor-pointer"
                  onClick={() => navigate(`/booking/program/${item.id}`)}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {item.programName}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        item.type === "Hajj"
                          ? "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300"
                          : item.type === "Umrah"
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300"
                          : "bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300"
                      }`}
                    >
                      {item.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300">
                    {item.bookings}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300">
                    {item.totalSales.toLocaleString()} {t("mad")}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                    {item.totalCost.toLocaleString()} {t("mad")}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                    {item.totalProfit.toLocaleString()} {t("mad")}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300">
                    <div className="flex items-center">
                      <span
                        className={`${
                          document.documentElement.dir === "rtl"
                            ? "ml-2"
                            : "mr-2"
                        }`}
                      >
                        {item.profitMargin.toFixed(1)}%
                      </span>
                      <div className="w-16 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className="bg-emerald-500 h-2 rounded-full"
                          style={{
                            width: `${Math.min(item.profitMargin, 100)}%`,
                          }}
                        ></div>
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {pagination && pagination.totalPages > 1 && (
          <PaginationControls
            currentPage={currentPage}
            totalPages={pagination.totalPages}
            onPageChange={setCurrentPage}
            paginationRange={paginationRange}
          />
        )}
      </div>

      <VideoHelpModal
        isOpen={isHelpModalOpen}
        onClose={() => setIsHelpModalOpen(false)}
        videoId="qVEeJb4HqfA"
        title="Dashboard & Profit Report Overview"
      />
    </div>
  );
}
