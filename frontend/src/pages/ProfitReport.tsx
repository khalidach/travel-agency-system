import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ChartTooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import {
  HelpCircle,
  ArrowUpDown,
  Download,
  Calendar,
  Filter,
  DollarSign,
  TrendingUp,
  Wallet,
  Users,
} from "lucide-react";
import {
  subDays,
  startOfDay,
  endOfDay,
  format,
  startOfQuarter,
  startOfYear,
} from "date-fns";
import * as api from "../services/api";
import DashboardSkeleton from "../components/skeletons/DashboardSkeleton";
import { usePagination } from "../hooks/usePagination";
import PaginationControls from "../components/booking/PaginationControls";
import { ProgramType, Pagination } from "../context/models";
import VideoHelpModal from "../components/VideoHelpModal";

// Interfaces
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

interface MonthlyTrendItem {
  month: string;
  bookings: number;
  sales: number;
  profit: number;
}

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

  // Filters state
  const [filterType, setFilterType] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("allTime");
  const [customDateRange, setCustomDateRange] = useState({ start: "", end: "" });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  // Chart & Table configurations
  const [chartMetric, setChartMetric] = useState<"bookings" | "sales" | "profit">("bookings");
  const [progSortField, setProgSortField] = useState<string>("programName");
  const [progSortAsc, setProgSortAsc] = useState<boolean>(true);
  const [svcSortField, setSvcSortField] = useState<string>("type");
  const [svcSortAsc, setSvcSortAsc] = useState<boolean>(true);

  // Parse date ranges
  const dateParams = useMemo(() => {
    const now = new Date();
    let startDate: Date | null = null;
    const endDate: Date = endOfDay(now);

    switch (dateFilter) {
      case "today":
        startDate = startOfDay(now);
        break;
      case "7days":
        startDate = startOfDay(subDays(now, 7));
        break;
      case "30days":
        startDate = startOfDay(subDays(now, 30));
        break;
      case "thisQuarter":
        startDate = startOfQuarter(now);
        break;
      case "thisYear":
        startDate = startOfYear(now);
        break;
      case "custom":
        if (customDateRange.start && customDateRange.end) {
          return {
            startDate: customDateRange.start,
            endDate: customDateRange.end,
          };
        }
        return { startDate: undefined, endDate: undefined };
      case "allTime":
      default:
        return { startDate: undefined, endDate: undefined };
    }

    return {
      startDate: format(startDate, "yyyy-MM-dd"),
      endDate: format(endDate, "yyyy-MM-dd"),
    };
  }, [dateFilter, customDateRange]);

  // API Queries
  const {
    data: reportData,
    isLoading,
    isError,
  } = useQuery<ProfitReportData>({
    queryKey: ["profitReport", filterType, currentPage, dateParams],
    queryFn: () =>
      api.getProfitReport(
        filterType,
        currentPage,
        itemsPerPage,
        dateParams.startDate,
        dateParams.endDate
      ),
  });

  const {
    data: dailyReportData,
    isLoading: isDailyLoading,
    isError: isDailyError,
  } = useQuery<any>({
    queryKey: ["dailyServiceReport", dateParams],
    queryFn: () =>
      api.getDailyServiceReport(dateParams.startDate, dateParams.endDate),
  });

  // Extract raw details
  const detailedPerformanceData = reportData?.detailedPerformanceData ?? [];
  const monthlyTrend = reportData?.monthlyTrend ?? [];
  const pagination = reportData?.pagination;
  const byType: any[] = dailyReportData?.byType ?? [];

  // Pagination hook
  const paginationRange = usePagination({
    currentPage,
    totalCount: pagination?.totalCount ?? 0,
    pageSize: itemsPerPage,
  });

  // Unified financial statistics calculation
  const stats = useMemo(() => {
    const progSales = reportData?.summary?.totalSales ?? 0;
    const progCost = reportData?.summary?.totalCost ?? 0;
    const progProfit = reportData?.summary?.totalProfit ?? 0;
    const progBookings = reportData?.summary?.totalBookings ?? 0;

    const svcSales = dailyReportData?.dateFilteredSummary?.totalRevenue ?? 0;
    const svcCost = dailyReportData?.dateFilteredSummary?.totalCost ?? 0;
    const svcProfit = dailyReportData?.dateFilteredSummary?.totalProfit ?? 0;
    const svcCount = dailyReportData?.dateFilteredSummary?.totalSalesCount ?? 0;

    const totalSalesCount = progBookings + svcCount;
    const totalRevenue = progSales + svcSales;
    const totalCost = progCost + svcCost;
    const totalProfit = progProfit + svcProfit;
    const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

    return {
      totalSalesCount,
      totalRevenue,
      totalCost,
      totalProfit,
      profitMargin,
    };
  }, [reportData, dailyReportData]);

  // Donut chart share logic
  const donutData = useMemo(() => {
    const progProfit = reportData?.summary?.totalProfit ?? 0;
    const svcProfit = dailyReportData?.dateFilteredSummary?.totalProfit ?? 0;

    if (progProfit <= 0 && svcProfit <= 0) return [];

    return [
      {
        name: t("programsRevenueShare"),
        value: Math.max(0, progProfit),
        color: "hsl(var(--primary))",
      },
      {
        name: t("dailyServicesRevenueShare"),
        value: Math.max(0, svcProfit),
        color: "hsl(var(--chart-2))",
      },
    ];
  }, [reportData, dailyReportData, t]);

  // Sorting
  const sortedDetailedPerformanceData = useMemo(() => {
    const data = [...detailedPerformanceData];
    data.sort((a: any, b: any) => {
      let valA = a[progSortField];
      let valB = b[progSortField];

      if (typeof valA === "string") {
        return progSortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return progSortAsc ? valA - valB : valB - valA;
    });
    return data;
  }, [detailedPerformanceData, progSortField, progSortAsc]);

  const sortedByType = useMemo(() => {
    const data = [...byType];
    data.sort((a: any, b: any) => {
      let valA = a[svcSortField];
      let valB = b[svcSortField];

      if (svcSortField === "profitMargin") {
        const revA = Number(a.totalSalePrice);
        const revB = Number(b.totalSalePrice);
        valA = revA > 0 ? (Number(a.totalProfit) / revA) * 100 : 0;
        valB = revB > 0 ? (Number(b.totalProfit) / revB) * 100 : 0;
      }

      if (typeof valA === "string") {
        return svcSortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return svcSortAsc ? Number(valA) - Number(valB) : Number(valB) - Number(valA);
    });
    return data;
  }, [byType, svcSortField, svcSortAsc]);

  const handleProgSort = (field: string) => {
    if (progSortField === field) {
      setProgSortAsc(!progSortAsc);
    } else {
      setProgSortField(field);
      setProgSortAsc(true);
    }
  };

  const handleSvcSort = (field: string) => {
    if (svcSortField === field) {
      setSvcSortAsc(!svcSortAsc);
    } else {
      setSvcSortField(field);
      setSvcSortAsc(true);
    }
  };

  // Backend Excel Exporter
  const [isExporting, setIsExporting] = useState(false);

  const handleExportExcel = async () => {
    setIsExporting(true);
    try {
      const blob = await api.exportProfitReportToExcel(
        filterType,
        dateParams.startDate,
        dateParams.endDate
      );
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);

      let dateString = "lifetime";
      if (dateParams.startDate && dateParams.endDate) {
        dateString = `${dateParams.startDate}_to_${dateParams.endDate}`;
      }
      link.setAttribute("download", `profit_report_${dateString}.xlsx`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Failed to export profit report Excel", error);
    } finally {
      setIsExporting(false);
    }
  };

  // Header Sorting Indicator Builder
  const renderSortableHeader = (
    field: string,
    label: string,
    currentField: string,
    isAsc: boolean,
    onSort: (field: string) => void
  ) => {
    const isSorted = currentField === field;
    return (
      <th
        className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-left cursor-pointer hover:bg-muted/30 transition-colors select-none"
        onClick={() => onSort(field)}
      >
        <div className="flex items-center gap-1.5">
          <span>{label}</span>
          <ArrowUpDown
            className={`w-3.5 h-3.5 ${isSorted ? "text-primary" : "text-muted-foreground/40"
              }`}
          />
        </div>
      </th>
    );
  };

  if ((isLoading && !reportData) || (isDailyLoading && !dailyReportData)) {
    return <DashboardSkeleton />;
  }

  if (isError || isDailyError) {
    return (
      <div className="text-destructive font-medium p-4 rounded-xl bg-destructive/10 border border-destructive/20">
        {t("errorLoadingDashboard")}
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Top Title Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground bg-gradient-to-r from-foreground to-foreground/75 bg-clip-text text-transparent">
            {t("profitReportTitle")}
          </h1>
          <p className="text-muted-foreground mt-1">
            {t("profitReportSubtitle")}
          </p>
        </div>
        <div className="flex items-center gap-3 self-start sm:self-center ">
          <button
            onClick={handleExportExcel}
            disabled={isExporting}
            className="inline-flex items-center gap-2 bg-primary hover:bg-primary/95 text-primary-foreground font-semibold px-3 py-2 text-sm rounded-xl transition-all shadow-sm cursor-pointer disabled:opacity-50"
          >
            <Download className="w-4.5 h-4.5" />
            <span>{isExporting ? t("exporting") : t("exportToExcel")}</span>
          </button>
          <button
            onClick={() => setIsHelpModalOpen(true)}
            className="p-2.5 text-muted-foreground bg-secondary hover:text-foreground hover:bg-secondary/80 rounded-xl transition-all duration-200 shadow-sm border border-border cursor-pointer"
            aria-label={t("help") as string}
          >
            <HelpCircle className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* FILTER PANEL */}
      <div className="bg-card rounded-2xl p-6 shadow-sm border border-border space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">
              {t("filters")}
            </h3>
          </div>

          {/* Date Presets Dropdown */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <span>{t("dateOfBooking")}</span>
            </div>
            <select
              value={dateFilter}
              onChange={(e) => {
                setDateFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-background border border-border rounded-xl px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all cursor-pointer"
            >
              <option value="allTime">{t("allTime")}</option>
              <option value="today">{t("today")}</option>
              <option value="7days">{t("last7Days")}</option>
              <option value="30days">{t("last30Days")}</option>
              <option value="thisMonth">{t("thisMonth") || "This Month"}</option>
              <option value="thisQuarter">{t("thisQuarter") || "This Quarter"}</option>
              <option value="thisYear">{t("thisYear") || "This Year"}</option>
              <option value="custom">{t("customRange")}</option>
            </select>
          </div>
        </div>

        {/* Custom Range Inputs */}
        {dateFilter === "custom" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-border max-w-lg">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={customDateRange.start}
                onChange={(e) => {
                  setCustomDateRange((prev) => ({
                    ...prev,
                    start: e.target.value,
                  }));
                  setCurrentPage(1);
                }}
                className="w-full bg-background border border-border rounded-xl px-3.5 py-2 text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">
                End Date
              </label>
              <input
                type="date"
                value={customDateRange.end}
                onChange={(e) => {
                  setCustomDateRange((prev) => ({
                    ...prev,
                    end: e.target.value,
                  }));
                  setCurrentPage(1);
                }}
                className="w-full bg-background border border-border rounded-xl px-3.5 py-2 text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all"
              />
            </div>
          </div>
        )}
      </div>

      {/* DYNAMIC METRIC CARDS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        {/* Sales Card */}
        <div className="bg-card rounded-2xl p-6 border border-border hover:shadow-md transition-all duration-300 relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                {t("totalSalesCount") || "Total Sales"}
              </span>
              <span className="text-3xl font-extrabold tracking-tight block">
                {stats.totalSalesCount.toLocaleString()}
              </span>
            </div>
            <div className="w-12 h-12 bg-blue-500/10 text-blue-500 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <Users className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Revenue Card */}
        <div className="bg-card rounded-2xl p-6 border border-border hover:shadow-md transition-all duration-300 relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                {t("totalRevenue")}
              </span>
              <span className="text-3xl font-extrabold tracking-tight block">
                {stats.totalRevenue.toLocaleString()} <span className="text-sm font-normal text-muted-foreground">{t("mad")}</span>
              </span>
            </div>
            <div className="w-12 h-12 bg-emerald-500/10 text-emerald-500 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Cost Card */}
        <div className="bg-card rounded-2xl p-6 border border-border hover:shadow-md transition-all duration-300 relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                {t("totalCosts")}
              </span>
              <span className="text-3xl font-extrabold tracking-tight block">
                {stats.totalCost.toLocaleString()} <span className="text-sm font-normal text-muted-foreground">{t("mad")}</span>
              </span>
            </div>
            <div className="w-12 h-12 bg-purple-500/10 text-purple-500 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Profit Card */}
        <div className="bg-card rounded-2xl p-6 border border-border hover:shadow-md transition-all duration-300 relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                {t("totalProfit")}
              </span>
              <span className={`text-3xl font-extrabold tracking-tight block ${stats.totalProfit >= 0 ? "text-success" : "text-destructive"}`}>
                {stats.totalProfit.toLocaleString()} <span className="text-sm font-normal text-muted-foreground">{t("mad")}</span>
              </span>
            </div>
            <div className="w-12 h-12 bg-orange-500/10 text-orange-500 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Margin Card */}
        <div className="bg-card rounded-2xl p-6 border border-border hover:shadow-md transition-all duration-300 relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <div className="space-y-2 w-full">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                {t("profitMargin")}
              </span>
              <span className="text-3xl font-extrabold tracking-tight block">
                {stats.profitMargin.toFixed(1)}%
              </span>
              <div className="w-full bg-secondary h-1.5 rounded-full overflow-hidden mt-2">
                <div
                  className="bg-primary h-full transition-all duration-500"
                  style={{ width: `${Math.max(0, Math.min(100, stats.profitMargin))}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* GRAPH SECTION: INTERACTIVE LINE CHART & DONUT CHART */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Interactive Line Chart block */}
        <div className="bg-card rounded-2xl p-6 shadow-sm border border-border lg:col-span-2 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-foreground">
                {t("monthlyProfitTrend")}
              </h3>
              <p className="text-xs text-muted-foreground">
                Last 12 months financial progression
              </p>
            </div>

            {/* Metric Selector Toggles */}
            <div className="inline-flex rounded-xl bg-secondary p-1 border border-border">
              <button
                onClick={() => setChartMetric("bookings")}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${chartMetric === "bookings"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
                  }`}
              >
                {t("bookingsTrend") || "Bookings"}
              </button>
              <button
                onClick={() => setChartMetric("sales")}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${chartMetric === "sales"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
                  }`}
              >
                {t("revenueTrend") || "Revenue"}
              </button>
              <button
                onClick={() => setChartMetric("profit")}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${chartMetric === "profit"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
                  }`}
              >
                {t("profitTrend") || "Profit"}
              </button>
            </div>
          </div>

          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={monthlyTrend}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="hsl(var(--border))"
              />
              <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" />
              <YAxis stroke="hsl(var(--muted-foreground))" />
              <ChartTooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--popover))",
                  borderColor: "hsl(var(--border))",
                  color: "hsl(var(--popover-foreground))",
                  borderRadius: "var(--radius)",
                }}
                formatter={(value: number) => {
                  if (chartMetric === "bookings") {
                    return [`${value.toLocaleString()}`, t("totalBookings")];
                  }
                  return [`${value.toLocaleString()} DH`, chartMetric === "sales" ? t("totalRevenue") : t("totalProfit")];
                }}
              />
              <Line
                type="monotone"
                dataKey={chartMetric === "bookings" ? "bookings" : chartMetric}
                stroke={
                  chartMetric === "bookings"
                    ? "hsl(var(--primary))"
                    : chartMetric === "sales"
                      ? "hsl(var(--chart-3))"
                      : "hsl(var(--success))"
                }
                strokeWidth={3}
                dot={{
                  fill:
                    chartMetric === "bookings"
                      ? "hsl(var(--primary))"
                      : chartMetric === "sales"
                        ? "hsl(var(--chart-3))"
                        : "hsl(var(--success))",
                  strokeWidth: 2,
                  r: 5,
                }}
                activeDot={{
                  r: 7,
                  stroke: "hsl(var(--background))",
                }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Donut Chart Block */}
        <div className="bg-card rounded-2xl p-6 shadow-sm border border-border lg:col-span-1 flex flex-col justify-between space-y-6">
          <div>
            <h3 className="text-lg font-bold text-foreground">
              {t("donutChartTitle") || "Profit Distribution"}
            </h3>
            <p className="text-xs text-muted-foreground">
              Income generation sources
            </p>
          </div>

          <div className="flex-1 flex items-center justify-center">
            {donutData.length === 0 ? (
              <span className="text-sm font-medium text-muted-foreground">
                No profit data available
              </span>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={donutData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={75}
                    paddingAngle={6}
                    dataKey="value"
                  >
                    {donutData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <ChartTooltip
                    formatter={(value: number) => [`${value.toLocaleString()} DH`]}
                    contentStyle={{
                      backgroundColor: "hsl(var(--popover))",
                      borderColor: "hsl(var(--border))",
                      color: "hsl(var(--popover-foreground))",
                      borderRadius: "var(--radius)",
                    }}
                  />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* PROGRAMS PERFORMANCE BLOCK */}
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-foreground">
              {t("profitProgramTitle")}
            </h2>
            <p className="text-muted-foreground text-sm">
              {t("profitProgramSubtitle")}
            </p>
          </div>

          {/* Program Type Tabs */}
          <div className="inline-flex rounded-xl bg-secondary p-1 border border-border">
            {["all", "Hajj", "Umrah", "Tourism"].map((type) => (
              <button
                key={type}
                onClick={() => {
                  setFilterType(type);
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${filterType === type
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
                  }`}
              >
                {type === "all" ? t("allTypes") : t(type)}
              </button>
            ))}
          </div>
        </div>

        {/* Detailed Program Table */}
        <div className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  {renderSortableHeader(
                    "programName",
                    t("programName"),
                    progSortField,
                    progSortAsc,
                    handleProgSort
                  )}
                  {renderSortableHeader(
                    "type",
                    t("programType"),
                    progSortField,
                    progSortAsc,
                    handleProgSort
                  )}
                  {renderSortableHeader(
                    "bookings",
                    t("bookings"),
                    progSortField,
                    progSortAsc,
                    handleProgSort
                  )}
                  {renderSortableHeader(
                    "totalSales",
                    t("totalSales"),
                    progSortField,
                    progSortAsc,
                    handleProgSort
                  )}
                  {renderSortableHeader(
                    "totalCost",
                    t("totalCost"),
                    progSortField,
                    progSortAsc,
                    handleProgSort
                  )}
                  {renderSortableHeader(
                    "totalProfit",
                    t("totalProfit"),
                    progSortField,
                    progSortAsc,
                    handleProgSort
                  )}
                  {renderSortableHeader(
                    "profitMargin",
                    t("profitMargin"),
                    progSortField,
                    progSortAsc,
                    handleProgSort
                  )}
                </tr>
              </thead>
              <tbody className="bg-card divide-y divide-border">
                {sortedDetailedPerformanceData.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-6 py-12 text-center text-sm font-medium text-muted-foreground"
                    >
                      {t("noProgramsFound")}
                    </td>
                  </tr>
                ) : (
                  sortedDetailedPerformanceData.map((item) => (
                    <tr
                      key={item.id}
                      className="hover:bg-muted/30 transition-colors cursor-pointer"
                      onClick={() => navigate(`/booking/program/${item.id}`)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-semibold text-foreground">
                          {item.programName}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex px-2.5 py-0.5 text-xs font-semibold rounded-full ${item.type === "Hajj"
                            ? "bg-chart-1/10 text-chart-1"
                            : item.type === "Umrah"
                              ? "bg-chart-2/10 text-chart-2"
                              : "bg-chart-3/10 text-chart-3"
                            }`}
                        >
                          {t(item.type)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">
                        {item.bookings}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-foreground">
                        {item.totalSales.toLocaleString()} {t("mad")}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                        {item.totalCost.toLocaleString()} {t("mad")}
                      </td>
                      <td
                        className={`px-6 py-4 whitespace-nowrap text-sm font-bold ${item.totalProfit >= 0
                          ? "text-success"
                          : "text-destructive"
                          }`}
                      >
                        {item.totalProfit.toLocaleString()} {t("mad")}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                        <div className="flex items-center gap-3">
                          <span
                            className={`font-bold ${item.profitMargin < 10
                              ? "text-amber-500"
                              : item.profitMargin > 25
                                ? "text-primary"
                                : "text-foreground"
                              }`}
                          >
                            {item.profitMargin.toFixed(1)}%
                          </span>
                          <div className="w-16 bg-secondary h-1.5 rounded-full overflow-hidden hidden sm:block">
                            <div
                              className={`h-full rounded-full ${item.profitMargin < 10
                                ? "bg-amber-500"
                                : item.profitMargin > 25
                                  ? "bg-primary"
                                  : "bg-success"
                                }`}
                              style={{
                                width: `${Math.max(
                                  0,
                                  Math.min(item.profitMargin, 100)
                                )}%`,
                              }}
                            ></div>
                          </div>
                          {item.profitMargin < 10 && item.bookings > 0 && (
                            <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-amber-500/10 text-amber-500 uppercase tracking-tight">
                              {t("lowMarginWarning") || "Low"}
                            </span>
                          )}
                          {item.profitMargin > 25 && item.bookings > 0 && (
                            <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-primary/10 text-primary uppercase tracking-tight">
                              {t("highMarginBadge") || "High"}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
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
      </div>

      {/* DAILY SERVICES PERFORMANCE BLOCK */}
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-foreground">
              {t("dailyServiceReportTitle")}
            </h2>
            <p className="text-muted-foreground text-sm">
              {t("dailyServiceReportSubtitle")}
            </p>
          </div>
        </div>

        {/* Service Performance Table */}
        <div className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden">
          <table className="w-full border-collapse">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                {renderSortableHeader(
                  "type",
                  t("serviceType"),
                  svcSortField,
                  svcSortAsc,
                  handleSvcSort
                )}
                {renderSortableHeader(
                  "count",
                  t("totalSalesCount"),
                  svcSortField,
                  svcSortAsc,
                  handleSvcSort
                )}
                {renderSortableHeader(
                  "totalOriginalPrice",
                  t("originalPrice"),
                  svcSortField,
                  svcSortAsc,
                  handleSvcSort
                )}
                {renderSortableHeader(
                  "totalSalePrice",
                  t("totalPrice"),
                  svcSortField,
                  svcSortAsc,
                  handleSvcSort
                )}
                {renderSortableHeader(
                  "totalProfit",
                  t("profit"),
                  svcSortField,
                  svcSortAsc,
                  handleSvcSort
                )}
                {renderSortableHeader(
                  "profitMargin",
                  t("profitMargin"),
                  svcSortField,
                  svcSortAsc,
                  handleSvcSort
                )}
              </tr>
            </thead>
            <tbody className="bg-card divide-y divide-border">
              {sortedByType.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-12 text-center text-sm font-medium text-muted-foreground"
                  >
                    {t("noServices")}
                  </td>
                </tr>
              ) : (
                sortedByType.map((item) => {
                  const itemTotalRevenue = Number(item.totalSalePrice);
                  const itemTotalProfit = Number(item.totalProfit);
                  const itemProfitMargin =
                    itemTotalRevenue > 0
                      ? (itemTotalProfit / itemTotalRevenue) * 100
                      : 0;

                  return (
                    <tr
                      key={item.type}
                      className="hover:bg-muted/30 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-foreground">
                        {t(item.type)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">
                        {Number(item.count).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                        {Number(item.totalOriginalPrice).toLocaleString()} {t("mad")}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-foreground">
                        {itemTotalRevenue.toLocaleString()} {t("mad")}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-success">
                        {itemTotalProfit.toLocaleString()} {t("mad")}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-primary">
                        {itemProfitMargin.toFixed(1)}%
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
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
