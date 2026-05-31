// frontend/src/pages/EmployeeAnalysis.tsx
import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ChevronLeft,
  Package,
  Calendar,
  ConciergeBell,
  FileText,
  Percent,
  DollarSign,
  TrendingUp,
} from "lucide-react";
import { useTranslation } from "react-i18next";

// Services & Models
import * as api from "../services/api";
import type {
  EmployeeAnalysisData,
  EmployeeDetailedAnalyticsData,
  ProgramPerformanceData,
  ServicePerformanceData,
} from "../context/models";

// Hooks
import { useDateRangeParams, DateFilter } from "../hooks/useDateRangeParams";
import { useTheme } from "../context/ThemeContext";

// Components
import DashboardSkeleton from "../components/skeletons/DashboardSkeleton";
import ProgramBookingsModal from "../components/employee/ProgramBookingsModal";
import PerformanceCharts from "../components/employee_analysis/PerformanceCharts";
import RankingCard from "../components/employee_analysis/RankingCard";
import ProgramPerformanceTable from "../components/employee_analysis/ProgramPerformanceTable";
import ServicePerformanceTable from "../components/employee_analysis/ServicePerformanceTable";

export default function EmployeeAnalysisPage() {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { theme } = useTheme();

  // --- Modal State ---
  const [isBookingsModalOpen, setIsBookingsModalOpen] = useState(false);
  const [modalProgram, setModalProgram] = useState<{
    id: number;
    name: string;
  } | null>(null);

  // --- Unified Filters ---
  const [dateFilter, setDateFilter] = useState<DateFilter>("month");
  const [customDate, setCustomDate] = useState({
    start: "",
    end: "",
  });
  const dateParams = useDateRangeParams(dateFilter, customDate);

  const [isExporting, setIsExporting] = useState(false);

  // --- API Queries ---
  
  // 1. Overall counts (Always loaded for context)
  const { data: analysisData, isLoading: isLoadingAnalysis } =
    useQuery<EmployeeAnalysisData>({
      queryKey: ["employeeAnalysis", username],
      queryFn: () => api.getEmployeeAnalysis(username!),
      enabled: !!username,
    });

  // 2. Detailed Analytics (Performance trends, standing, sources)
  const { data: detailedAnalytics, isLoading: isLoadingDetailed } =
    useQuery<EmployeeDetailedAnalyticsData>({
      queryKey: ["employeeDetailedAnalytics", username, dateParams],
      queryFn: () =>
        api.getEmployeeDetailedAnalytics(
          username!,
          dateParams.startDate,
          dateParams.endDate,
        ),
      enabled: !!username,
    });

  // 3. Program performance table data
  const { data: programData, isLoading: isLoadingProgramData } =
    useQuery<ProgramPerformanceData>({
      queryKey: ["employeeProgramPerformance", username, dateParams],
      queryFn: () =>
        api.getEmployeeProgramPerformance(
          username!,
          dateParams.startDate,
          dateParams.endDate,
        ),
      enabled: !!username,
    });

  // 4. Service performance table data
  const { data: serviceData, isLoading: isLoadingServiceData } =
    useQuery<ServicePerformanceData>({
      queryKey: ["employeeServicePerformance", username, dateParams],
      queryFn: () =>
        api.getEmployeeServicePerformance(
          username!,
          dateParams.startDate,
          dateParams.endDate,
        ),
      enabled: !!username,
    });

  // --- Loading & Error States ---
  if (isLoadingAnalysis || isLoadingDetailed) return <DashboardSkeleton />;

  if (!analysisData) {
    return (
      <div className="text-center py-10">
        <h2 className="text-xl font-semibold text-foreground">
          {t("couldNotLoadAnalysis")}
        </h2>
        <button
          onClick={() => navigate("/employees")}
          className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition"
        >
          {t("backToEmployees")}
        </button>
      </div>
    );
  }

  const {
    employee,
    programsCreatedCount,
    bookingsMadeCount,
    dailyServicesMadeCount,
    facturesCreatedCount,
  } = analysisData;

  // --- Financial Aggregations ---
  const bookingRevenue = programData?.programSummary.totalRevenue || 0;
  const serviceRevenue = serviceData?.serviceSummary.totalRevenue || 0;
  const totalRevenue = bookingRevenue + serviceRevenue;
  const serviceProfit = serviceData?.serviceSummary.totalProfit || 0;

  // --- Event Handlers ---
  const handleProgramClick = (programId: number, programName: string) => {
    setModalProgram({ id: programId, name: programName });
    setIsBookingsModalOpen(true);
  };

  const filterButtons: { label: string; value: DateFilter }[] = [
    { label: "today", value: "today" },
    { label: "last7Days", value: "7days" },
    { label: "last30Days", value: "month" },
    { label: "customRange", value: "custom" },
  ];

  return (
    <div className="space-y-8 pb-10">
      {/* Header and Controls */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center">
          <button
            onClick={() => navigate("/employees")}
            className="p-2 bg-secondary rounded-full hover:bg-secondary/80 transition-colors mr-4 ml-4"
            aria-label={t("back") as string}
          >
            <ChevronLeft className="w-6 h-6 text-foreground" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-extrabold text-foreground tracking-tight">
                {t("employeeAnalysis", { username: employee.username })}
              </h1>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                employee.active 
                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300"
                  : "bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-300"
              }`}>
                {t(employee.active ? "active" : "inactive")}
              </span>
            </div>
            <p className="text-muted-foreground mt-1">
              {t("performanceOverview", { username: employee.username })}
            </p>
          </div>
        </div>

        {/* Global Action controls */}
        <div className="flex flex-col sm:flex-row gap-4 items-center self-start md:self-auto w-full md:w-auto">
          {/* Unified Date Range Controls */}
          <div className="flex items-center space-x-1 bg-muted/60 backdrop-blur border border-border/50 rounded-xl p-1 w-full sm:w-auto overflow-x-auto select-none">
            {filterButtons.map((btn) => (
              <button
                key={btn.value}
                onClick={() => setDateFilter(btn.value)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                  dateFilter === btn.value
                    ? "bg-card text-primary shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t(btn.label)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Custom Date Inputs */}
      {dateFilter === "custom" && (
        <div className="flex items-center space-x-2 bg-card p-4 rounded-xl border border-border w-max animate-fadeIn rtl:space-x-reverse">
          <input
            type="date"
            value={customDate.start}
            onChange={(e) =>
              setCustomDate({ ...customDate, start: e.target.value })
            }
            className="px-3 py-1.5 border border-input rounded-lg text-sm bg-background text-foreground focus:ring-1 focus:ring-primary"
          />
          <span className="text-muted-foreground text-sm">{t("to")}</span>
          <input
            type="date"
            value={customDate.end}
            onChange={(e) =>
              setCustomDate({ ...customDate, end: e.target.value })
            }
            className="px-3 py-1.5 border border-input rounded-lg text-sm bg-background text-foreground focus:ring-1 focus:ring-primary"
          />
        </div>
      )}

      {/* Dashboard Container */}
      <div className="space-y-8 p-1">
        {/* Advanced Financial KPI Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Total Revenue Card */}
          <div className="bg-card text-card-foreground rounded-2xl p-6 shadow-sm border border-border flex items-center justify-between transition-all hover:shadow-md">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {t("totalCombinedRevenue")}
              </p>
              <p className="text-3xl font-extrabold text-foreground mt-2">
                {totalRevenue.toLocaleString()} <span className="text-sm font-normal text-muted-foreground">{t("mad")}</span>
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 dark:bg-blue-500/20 flex items-center justify-center text-blue-500">
              <DollarSign className="w-6 h-6" />
            </div>
          </div>

          {/* Bookings Revenue Card */}
          <div className="bg-card text-card-foreground rounded-2xl p-6 shadow-sm border border-border flex items-center justify-between transition-all hover:shadow-md">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {t("bookingsRevenue")}
              </p>
              <p className="text-3xl font-extrabold text-foreground mt-2">
                {bookingRevenue.toLocaleString()} <span className="text-sm font-normal text-muted-foreground">{t("mad")}</span>
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 dark:bg-indigo-500/20 flex items-center justify-center text-indigo-500">
              <Calendar className="w-6 h-6" />
            </div>
          </div>

          {/* Services Revenue Card */}
          <div className="bg-card text-card-foreground rounded-2xl p-6 shadow-sm border border-border flex items-center justify-between transition-all hover:shadow-md">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {t("servicesRevenue")}
              </p>
              <p className="text-3xl font-extrabold text-foreground mt-2">
                {serviceRevenue.toLocaleString()} <span className="text-sm font-normal text-muted-foreground">{t("mad")}</span>
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-sky-500/10 dark:bg-sky-500/20 flex items-center justify-center text-sky-500">
              <ConciergeBell className="w-6 h-6" />
            </div>
          </div>

          {/* Services Profit Card */}
          <div className="bg-card text-card-foreground rounded-2xl p-6 shadow-sm border border-border flex items-center justify-between transition-all hover:shadow-md">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {t("servicesProfit")}
              </p>
              <p className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-2">
                {serviceProfit.toLocaleString()} <span className="text-sm font-normal text-muted-foreground">{t("mad")}</span>
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 flex items-center justify-center text-emerald-500">
              <TrendingUp className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Operational counts stat row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: t("totalBookingsMade"), value: programData?.programSummary.totalBookings || 0, icon: Calendar, color: "text-emerald-500 bg-emerald-500/10" },
            { label: t("totalServicesPerformed"), value: serviceData?.serviceSummary.totalServices || 0, icon: ConciergeBell, color: "text-purple-500 bg-purple-500/10" },
            { label: t("programsAdded"), value: programsCreatedCount, icon: Package, color: "text-blue-500 bg-blue-500/10" },
            { label: t("totalFactures"), value: facturesCreatedCount, icon: FileText, color: "text-amber-500 bg-amber-500/10" },
          ].map((stat, i) => (
            <div key={i} className="bg-card rounded-2xl p-4 shadow-sm border border-border flex items-center gap-4 transition-all hover:shadow-md">
              <div className={`p-3 rounded-xl ${stat.color} shrink-0`}>
                <stat.icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground line-clamp-1">{stat.label}</p>
                <p className="text-xl font-bold text-foreground mt-1">{stat.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Rankings and Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
          {/* Rankings Panel */}
          <div className="lg:col-span-1">
            <RankingCard
              ranking={detailedAnalytics?.ranking}
              bookingsCount={programData?.programSummary.totalBookings || 0}
              servicesCount={serviceData?.serviceSummary.totalServices || 0}
              totalRevenue={totalRevenue}
              isLoading={isLoadingDetailed}
            />
          </div>

          {/* Recharts Analytics Panel */}
          <div className="lg:col-span-2">
            <PerformanceCharts
              performanceData={detailedAnalytics?.performanceOverTime || []}
              sourceData={detailedAnalytics?.sourceBreakdown || []}
              isLoading={isLoadingDetailed}
            />
          </div>
        </div>

        {/* Detailed Data Tables section */}
        <div className="grid grid-cols-1 gap-8">
          <div>
            <h3 className="text-lg font-bold text-foreground mb-4">{t("detailedProgramPerformance")}</h3>
            <ProgramPerformanceTable
              data={programData}
              isLoading={isLoadingProgramData}
              onProgramClick={handleProgramClick}
            />
          </div>

          <div>
            <h3 className="text-lg font-bold text-foreground mb-4">{t("detailedServicePerformance")}</h3>
            <ServicePerformanceTable
              data={serviceData}
              isLoading={isLoadingServiceData}
            />
          </div>
        </div>
      </div>

      {/* Modals */}
      {modalProgram && (
        <ProgramBookingsModal
          isOpen={isBookingsModalOpen}
          onClose={() => setIsBookingsModalOpen(false)}
          username={employee.username}
          programId={modalProgram.id}
          programName={modalProgram.name}
          startDate={dateParams.startDate}
          endDate={dateParams.endDate}
        />
      )}
    </div>
  );
}
