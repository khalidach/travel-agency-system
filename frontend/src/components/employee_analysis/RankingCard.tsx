import React from "react";
import { useTranslation } from "react-i18next";
import { Trophy, TrendingUp, DollarSign, Percent } from "lucide-react";
import { EmployeeRankingInfo } from "../../context/models";

interface RankingCardProps {
  ranking: EmployeeRankingInfo | undefined;
  bookingsCount: number;
  servicesCount: number;
  totalRevenue: number;
  totalProfit: number;
  isLoading: boolean;
}

const RankingCard: React.FC<RankingCardProps> = ({
  ranking,
  bookingsCount,
  servicesCount,
  totalRevenue,
  totalProfit,
  isLoading,
}) => {
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <div className="bg-card rounded-2xl p-6 shadow-sm border border-border h-full animate-pulse">
        <div className="h-6 bg-muted rounded w-1/3 mb-4"></div>
        <div className="space-y-4">
          <div className="h-12 bg-muted rounded w-full"></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="h-16 bg-muted rounded"></div>
            <div className="h-16 bg-muted rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  const rank = ranking?.rank || 1;
  const totalEmployees = ranking?.totalEmployees || 1;

  // Margin calculation
  const marginPercent = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

  // Average transaction value
  const totalOperations = bookingsCount + servicesCount;
  const avgTicket = totalOperations > 0 ? totalRevenue / totalOperations : 0;

  // Visual text for standings
  const getOrdinalSuffix = (num: number) => {
    const lang = document.documentElement.lang || "fr";
    if (lang === "en") {
      const j = num % 10, k = num % 100;
      if (j === 1 && k !== 11) return num + "st";
      if (j === 2 && k !== 12) return num + "nd";
      if (j === 3 && k !== 13) return num + "rd";
      return num + "th";
    }
    if (lang === "ar") {
      return `المرتبة ${num}`;
    }
    // French fallback (1er, 2e, etc.)
    return num === 1 ? "1er" : `${num}e`;
  };

  // Percentile background gradient or text
  const isTopPerformer = rank === 1 && totalEmployees > 1;

  return (
    <div className="bg-card text-card-foreground rounded-2xl shadow-sm border border-border overflow-hidden h-full flex flex-col justify-between transition-all hover:shadow-md">
      {/* Card Header with gradient banner if top performer */}
      <div className={`p-6 pb-4 flex items-center justify-between border-b border-border ${
        isTopPerformer 
          ? "bg-gradient-to-r from-amber-500/10 via-yellow-500/5 to-transparent dark:from-amber-500/20" 
          : ""
      }`}>
        <div>
          <h3 className="text-lg font-semibold text-foreground">{t("employeeStanding")}</h3>
          <p className="text-sm text-muted-foreground">{t("standingSubText")}</p>
        </div>
        <div className={`p-3 rounded-2xl ${
          isTopPerformer 
            ? "bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400" 
            : "bg-primary/10 text-primary"
        }`}>
          <Trophy className="w-6 h-6" />
        </div>
      </div>

      {/* Main Ranking Display */}
      <div className="p-6 space-y-6 flex-grow">
        <div className="flex items-center gap-4">
          <div className="text-5xl font-extrabold text-foreground tracking-tight">
            {getOrdinalSuffix(rank)}
          </div>
          <div className="text-sm text-muted-foreground leading-snug">
            {t("outOfEmployees", { count: totalEmployees })}
            {isTopPerformer && (
              <span className="block text-xs font-semibold text-amber-600 dark:text-amber-400 mt-1 uppercase tracking-wider">
                🏆 {t("topPerformer")}
              </span>
            )}
          </div>
        </div>

        {/* Mini progress indicator */}
        {totalEmployees > 1 && (
          <div className="w-full bg-muted h-2 rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-500 ${
                isTopPerformer ? "bg-amber-500" : "bg-primary"
              }`}
              style={{ width: `${Math.max(10, ((totalEmployees - rank + 1) / totalEmployees) * 100)}%` }}
            />
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4 pt-2">
          {/* Profit Margin */}
          <div className="p-4 bg-muted/40 rounded-2xl border border-border/50 flex flex-col justify-between">
            <div className="flex items-center gap-1.5 text-muted-foreground mb-2">
              <Percent className="w-4 h-4 text-emerald-500" />
              <span className="text-xs font-medium uppercase tracking-wider">{t("profitMargin")}</span>
            </div>
            <span className="text-2xl font-bold text-foreground">
              {marginPercent.toFixed(1)}%
            </span>
          </div>

          {/* Average Ticket */}
          <div className="p-4 bg-muted/40 rounded-2xl border border-border/50 flex flex-col justify-between">
            <div className="flex items-center gap-1.5 text-muted-foreground mb-2">
              <DollarSign className="w-4 h-4 text-blue-500" />
              <span className="text-xs font-medium uppercase tracking-wider">{t("averageTicket")}</span>
            </div>
            <span className="text-xl font-bold text-foreground truncate" title={`${avgTicket.toLocaleString()} ${t("mad")}`}>
              {Math.round(avgTicket).toLocaleString()} <span className="text-xs font-normal text-muted-foreground">{t("mad")}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Footer message */}
      <div className="p-6 pt-0 border-t border-border/30 bg-muted/20 text-xs text-muted-foreground flex items-center gap-2">
        <TrendingUp className="w-4 h-4 text-primary shrink-0" />
        <span>
          {rank === 1 
            ? t("keepUpExcellentWork") 
            : t("rankImprovementText", { nextRank: rank - 1 })}
        </span>
      </div>
    </div>
  );
};

export default RankingCard;
