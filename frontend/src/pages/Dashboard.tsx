// frontend/src/pages/Dashboard.tsx
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { HelpCircle } from "lucide-react";
import DashboardSkeleton from "../components/skeletons/DashboardSkeleton";
import VideoHelpModal from "../components/VideoHelpModal";
import { useDashboardData } from "../hooks/useDashboardData";

// Imported Components
import StatsGrid from "../components/dashboard/StatsGrid";
import DateMetricsSection from "../components/dashboard/DateMetricsSection";
import ServiceProfitChart from "../components/dashboard/ServiceProfitChart";
import QuickActionsCard from "../components/dashboard/QuickActionsCard";
import PaymentStatusCard from "../components/dashboard/PaymentStatusCard";
import RecentBookingsCard from "../components/dashboard/RecentBookingsCard";

export default function Dashboard() {
  const { t } = useTranslation();
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const {
    stats,
    isLoading,
    isError,
    dateFilter,
    setDateFilter,
    customDateRange,
    setCustomDateRange,
  } = useDashboardData();

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (isError) {
    return <div className="text-destructive">{t("errorLoadingDashboard")}</div>;
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header Section */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            {t("dashboard")}
          </h1>
          <p className="text-muted-foreground mt-2">{t("dashboardSubtitle")}</p>
        </div>
        <button
          onClick={() => setIsHelpModalOpen(true)}
          className="p-2 text-muted-foreground bg-muted rounded-full hover:bg-accent hover:text-accent-foreground transition-colors"
          aria-label={t("help") as string}
        >
          <HelpCircle className="w-6 h-6" />
        </button>
      </div>

      {/* Top Stats Cards */}
      <StatsGrid allTimeStats={stats.allTimeStats} />

      {/* Middle Grid: Metrics & Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-1 gap-8">
        <DateMetricsSection
          dateFilter={dateFilter}
          setDateFilter={setDateFilter}
          customDateRange={customDateRange}
          setCustomDateRange={setCustomDateRange}
          dateFilteredStats={stats.dateFilteredStats}
        />
        <ServiceProfitChart data={stats.dailyServiceProfitData} />
      </div>

      {/* Bottom Grid: Actions & Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <QuickActionsCard />
        <PaymentStatusCard paymentStatus={stats.paymentStatus} />
        <RecentBookingsCard recentBookings={stats.recentBookings} />
      </div>

      {/* Help Modal */}
      <VideoHelpModal
        isOpen={isHelpModalOpen}
        onClose={() => setIsHelpModalOpen(false)}
        videoId="qVEeJb4HqfA"
        title={t("dashboardOverview")}
      />
    </div>
  );
}
