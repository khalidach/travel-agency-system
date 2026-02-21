import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
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
  Wallet,
  HelpCircle,
} from "lucide-react";
import * as api from "../services/api";
import DashboardSkeleton from "../components/skeletons/DashboardSkeleton";
import { usePagination } from "../hooks/usePagination";
import PaginationControls from "../components/booking/PaginationControls";
import { ProgramType, Pagination } from "../context/models";
import VideoHelpModal from "../components/VideoHelpModal";

// Defined interface for the performance table rows
interface DetailedPerformanceItem {
  id: number;
  programName: string;
  type: ProgramType;
  bookings: number;
  totalSales: number;
  totalCost: number;
  totalProfit: number;
  profitMargin: number;
}

// Defined interface for the chart data
interface MonthlyTrendItem {
  month: string;
  bookings: number;
}

// Updated main interface to remove 'any'
interface ProfitReportData {
  detailedPerformanceData: DetailedPerformanceItem[];
  monthlyTrend: MonthlyTrendItem[];
  pagination: Pagination;
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
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);

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
      totalCost: summary?.totalCost ?? 0,
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
    return <div className="text-destructive">{t("errorLoadingDashboard")}</div>;
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            {t("profitReportTitle")}
          </h1>
          <p className="text-muted-foreground mt-2">
            {t("profitReportSubtitle")}
          </p>
        </div>
        <button
          onClick={() => setIsHelpModalOpen(true)}
          className="p-2 text-secondary-foreground bg-secondary rounded-full hover:bg-secondary/80 transition-colors"
          aria-label={t("help") as string}
        >
          <HelpCircle className="w-6 h-6" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Bookings Card */}
        <div className="bg-card text-card-foreground rounded-2xl p-6 shadow-sm border border-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                {t("totalBookings")}
              </p>
              <p className="text-2xl font-bold mt-2">
                {totals.totalBookings.toLocaleString()}
              </p>
            </div>
            <div className="w-12 h-12 bg-chart-1 rounded-xl flex items-center justify-center">
              <Calendar className="w-6 h-6 text-primary-foreground" />
            </div>
          </div>
        </div>

        {/* Total Sales Card */}
        <div className="bg-card text-card-foreground rounded-2xl p-6 shadow-sm border border-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                {t("totalSales")}
              </p>
              <p className="text-2xl font-bold mt-2">
                {totals.totalSales.toLocaleString()} {t("mad")}
              </p>
            </div>
            <div className="w-12 h-12 bg-chart-2 rounded-xl flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-primary-foreground" />
            </div>
          </div>
        </div>
        {/* Total Cost Card */}
        <div className="bg-card text-card-foreground rounded-2xl p-6 shadow-sm border border-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                {t("totalCost")}
              </p>
              <p className="text-2xl font-bold mt-2">
                {totals.totalCost.toLocaleString()} {t("mad")}
              </p>
            </div>
            <div className="w-12 h-12 bg-chart-4 rounded-xl flex items-center justify-center">
              <Wallet className="w-6 h-6 text-primary-foreground" />
            </div>
          </div>
        </div>
        {/* Total Profit Card */}
        <div className="bg-card text-card-foreground rounded-2xl p-6 shadow-sm border border-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                {t("totalProfit")}
              </p>
              <p className="text-2xl font-bold mt-2">
                {totals.totalProfit.toLocaleString()} {t("mad")}
              </p>
            </div>
            <div className="w-12 h-12 bg-chart-3 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-primary-foreground" />
            </div>
          </div>
        </div>


      </div>

      <div className="bg-card rounded-2xl p-6 shadow-sm border border-border">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex items-center space-x-2">
            <Filter className="w-5 h-5 text-muted-foreground" />
            <span className="text-sm font-medium text-card-foreground">
              {t("filters")}
            </span>
          </div>
          <select
            value={filterType}
            onChange={(e) => {
              setFilterType(e.target.value);
              setCurrentPage(1);
            }}
            className="px-4 py-2 border border-input rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent bg-background text-foreground"
          >
            <option value="all">{t("allProgramTypes")}</option>
            <option value="Hajj">{t("Hajj")}</option>
            <option value="Umrah">{t("Umrah")}</option>
            <option value="Tourism">{t("Tourism")}</option>
            <option value="Ramadan">{t("Ramadan")}</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-1 gap-8">
        <div className="bg-card rounded-2xl p-6 shadow-sm border border-border">
          <h3 className="text-lg font-semibold text-card-foreground mb-6">
            {t("monthlyBookingsTrend")}
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={monthlyTrend}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="hsl(var(--border))"
              />
              <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" />
              <YAxis stroke="hsl(var(--muted-foreground))" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--popover))",
                  borderColor: "hsl(var(--border))",
                  color: "hsl(var(--popover-foreground))",
                  borderRadius: "var(--radius)",
                }}
                formatter={(value: number) => [
                  `${value.toLocaleString()} ${t("bookings")}`,
                  t("totalBookings"),
                ]}
              />
              <Line
                type="monotone"
                dataKey="bookings"
                stroke="hsl(var(--primary))"
                strokeWidth={3}
                dot={{
                  fill: "hsl(var(--primary))",
                  strokeWidth: 2,
                  r: 6,
                }}
                activeDot={{
                  r: 8,
                  stroke: "hsl(var(--background))",
                }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <h3 className="text-lg font-semibold text-card-foreground">
            {t("detailedProgramPerformance")}
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                {[
                  "programName",
                  "programType",
                  "bookings",
                  "totalSales",
                  "totalCost",
                  "totalProfit",
                  "profitMargin",
                ].map((header) => (
                  <th
                    key={header}
                    className={`px-6 py-4 text-xs font-medium text-muted-foreground uppercase tracking-wider text-left`}
                  >
                    {t(header)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-card divide-y divide-border">
              {detailedPerformanceData.map((item) => (
                <tr
                  key={item.id}
                  className="hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => navigate(`/booking/program/${item.id}`)}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-foreground">
                      {item.programName}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${item.type === "Hajj"
                        ? "bg-chart-1/20 text-chart-1"
                        : item.type === "Umrah"
                          ? "bg-chart-2/20 text-chart-2"
                          : "bg-chart-3/20 text-chart-3"
                        }`}
                    >
                      {t(item.type)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                    {item.bookings}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                    {item.totalSales.toLocaleString()} {t("mad")}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                    {item.totalCost.toLocaleString()} {t("mad")}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-success">
                    {item.totalProfit.toLocaleString()} {t("mad")}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                    <div className="flex items-center">
                      <span className={`mr-2`}>
                        {item.profitMargin.toFixed(1)}%
                      </span>
                      <div className="w-16 bg-secondary rounded-full h-2">
                        <div
                          className="bg-success h-2 rounded-full"
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
        title={t("dashboardOverview")}
      />
    </div>
  );
}
