// frontend/src/pages/EmployeeAnalysis.tsx
import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft } from "lucide-react";
import { useTranslation } from "react-i18next";

// Services & Models
import * as api from "../services/api";
import type {
  EmployeeAnalysisData,
  ProgramPerformanceData,
  ServicePerformanceData,
} from "../context/models";

// Hooks
import { useDateRangeParams, DateFilter } from "../hooks/useDateRangeParams";

// Components
import DashboardSkeleton from "../components/skeletons/DashboardSkeleton";
import ProgramBookingsModal from "../components/employee/ProgramBookingsModal";
import StatCardsRow from "../components/employee_analysis/StatCardsRow";
import PerformanceSummaryCard from "../components/employee_analysis/PerformanceSummaryCard";
import ProgramPerformanceTable from "../components/employee_analysis/ProgramPerformanceTable";
import ServicePerformanceTable from "../components/employee_analysis/ServicePerformanceTable";

export default function EmployeeAnalysisPage() {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();

  // --- Modal State ---
  const [isBookingsModalOpen, setIsBookingsModalOpen] = useState(false);
  const [modalProgram, setModalProgram] = useState<{
    id: number;
    name: string;
  } | null>(null);

  // --- Program Filters ---
  const [programDateFilter, setProgramDateFilter] =
    useState<DateFilter>("month");
  const [programCustomDate, setProgramCustomDate] = useState({
    start: "",
    end: "",
  });
  const programDateParams = useDateRangeParams(
    programDateFilter,
    programCustomDate,
  );

  // --- Service Filters ---
  const [serviceDateFilter, setServiceDateFilter] =
    useState<DateFilter>("month");
  const [serviceCustomDate, setServiceCustomDate] = useState({
    start: "",
    end: "",
  });
  const serviceDateParams = useDateRangeParams(
    serviceDateFilter,
    serviceCustomDate,
  );

  // --- API Queries ---
  const { data: analysisData, isLoading: isLoadingAnalysis } =
    useQuery<EmployeeAnalysisData>({
      queryKey: ["employeeAnalysis", username],
      queryFn: () => api.getEmployeeAnalysis(username!),
      enabled: !!username,
    });

  const { data: programData, isLoading: isLoadingProgramData } =
    useQuery<ProgramPerformanceData>({
      queryKey: ["employeeProgramPerformance", username, programDateParams],
      queryFn: () =>
        api.getEmployeeProgramPerformance(
          username!,
          programDateParams.startDate,
          programDateParams.endDate,
        ),
      enabled: !!username,
    });

  const { data: serviceData, isLoading: isLoadingServiceData } =
    useQuery<ServicePerformanceData>({
      queryKey: ["employeeServicePerformance", username, serviceDateParams],
      queryFn: () =>
        api.getEmployeeServicePerformance(
          username!,
          serviceDateParams.startDate,
          serviceDateParams.endDate,
        ),
      enabled: !!username,
    });

  // --- Loading & Error States ---
  if (isLoadingAnalysis) return <DashboardSkeleton />;

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
  } = analysisData;

  // --- Data Preparation for Child Components ---
  const programSummaryMetrics = [
    {
      title: t("totalBookings"),
      value: programData?.programSummary.totalBookings || 0,
      unit: "",
    },
    {
      title: t("totalRevenue"),
      value: programData?.programSummary.totalRevenue || 0,
      unit: t("mad"),
    },
    {
      title: t("totalCost"),
      value: programData?.programSummary.totalCost || 0,
      unit: t("mad"),
    },
    {
      title: t("totalProfit"),
      value: programData?.programSummary.totalProfit || 0,
      unit: t("mad"),
    },
  ];

  const serviceSummaryMetrics = [
    {
      title: t("totalServicesPerformed"),
      value: serviceData?.serviceSummary.totalServices || 0,
      unit: "",
    },
    {
      title: t("totalRevenue"),
      value: serviceData?.serviceSummary.totalRevenue || 0,
      unit: t("mad"),
    },
    {
      title: t("totalCost"),
      value: serviceData?.serviceSummary.totalCost || 0,
      unit: t("mad"),
    },
    {
      title: t("totalProfit"),
      value: serviceData?.serviceSummary.totalProfit || 0,
      unit: t("mad"),
    },
  ];

  const handleProgramClick = (programId: number, programName: string) => {
    setModalProgram({ id: programId, name: programName });
    setIsBookingsModalOpen(true);
  };

  return (
    <div className="space-y-8 pb-10">
      {/* Header */}
      <div className="flex items-center">
        <button
          onClick={() => navigate("/employees")}
          className={`p-2 bg-secondary rounded-full hover:bg-secondary/80 transition-colors mr-4`}
          aria-label={t("back") as string}
        >
          <ChevronLeft className="w-6 h-6 text-foreground" />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            {t("employeeAnalysis", { username: employee.username })}
          </h1>
          <p className="text-muted-foreground mt-2">
            {t("performanceOverview", { username: employee.username })}
          </p>
        </div>
      </div>

      {/* Top Stat Cards */}
      <StatCardsRow
        programsCount={programsCreatedCount}
        bookingsCount={bookingsMadeCount}
        servicesCount={dailyServicesMadeCount}
      />

      {/* Performance Summary Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <PerformanceSummaryCard
          title="overallProgramPerformance"
          dateFilter={programDateFilter}
          setDateFilter={setProgramDateFilter}
          customDateRange={programCustomDate}
          setCustomDateRange={setProgramCustomDate}
          summaryData={programSummaryMetrics}
          isLoading={isLoadingProgramData}
        />
        <PerformanceSummaryCard
          title="overallServicePerformance"
          dateFilter={serviceDateFilter}
          setDateFilter={setServiceDateFilter}
          customDateRange={serviceCustomDate}
          setCustomDateRange={setServiceCustomDate}
          summaryData={serviceSummaryMetrics}
          isLoading={isLoadingServiceData}
        />
      </div>

      {/* Detailed Tables */}
      <ProgramPerformanceTable
        data={programData}
        isLoading={isLoadingProgramData}
        onProgramClick={handleProgramClick}
      />

      <ServicePerformanceTable
        data={serviceData}
        isLoading={isLoadingServiceData}
      />

      {/* Modals */}
      {modalProgram && (
        <ProgramBookingsModal
          isOpen={isBookingsModalOpen}
          onClose={() => setIsBookingsModalOpen(false)}
          username={employee.username}
          programId={modalProgram.id}
          programName={modalProgram.name}
          startDate={programDateParams.startDate}
          endDate={programDateParams.endDate}
        />
      )}
    </div>
  );
}
