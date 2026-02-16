// frontend/src/components/employee_analysis/ProgramPerformanceTable.tsx
import React from "react";
import { useTranslation } from "react-i18next";
import { ProgramPerformanceData } from "../../context/models";

interface ProgramPerformanceTableProps {
  data: ProgramPerformanceData | undefined;
  isLoading: boolean;
  onProgramClick: (programId: number, programName: string) => void;
}

const ProgramPerformanceTable: React.FC<ProgramPerformanceTableProps> = ({
  data,
  isLoading,
  onProgramClick,
}) => {
  const { t } = useTranslation();
  const isRtl = document.documentElement.dir === "rtl";
  const alignClass = isRtl ? "text-left" : "text-left";

  const getTypeColor = (type: string) => {
    switch (type) {
      case "Hajj":
        return "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-200";
      case "Umrah":
        return "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200";
      case "Tourism":
        return "bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-200";
      default:
        return "bg-secondary text-secondary-foreground";
    }
  };

  const headers = [
    "programName",
    "programType",
    "bookings",
    "totalSales",
    "totalCost",
    "totalProfit",
  ];

  return (
    <div className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-muted/50">
            <tr>
              {headers.map((key) => (
                <th
                  key={key}
                  className={`px-6 py-4 text-xs font-medium text-muted-foreground uppercase tracking-wider ${alignClass}`}
                >
                  {t(key)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-card divide-y divide-border">
            {isLoading ? (
              <tr>
                <td
                  colSpan={6}
                  className="text-center p-8 text-muted-foreground"
                >
                  <div className="flex justify-center items-center gap-2">
                    {t("loading")}
                  </div>
                </td>
              </tr>
            ) : !data?.programPerformance?.length ? (
              <tr>
                <td
                  colSpan={6}
                  className="text-center p-8 text-muted-foreground"
                >
                  {t("noDataAvailable")}
                </td>
              </tr>
            ) : (
              data.programPerformance.map((item, index) => (
                <tr
                  key={index}
                  className="hover:bg-muted/30 cursor-pointer transition-colors"
                  onClick={() =>
                    onProgramClick(
                      Number(item.programId),
                      String(item.programName),
                    )
                  }
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-foreground">
                      {item.programName}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getTypeColor(String(item.type))}`}
                    >
                      {t(String(item.type))}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                    {item.bookingCount}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                    {Number(item.totalSales).toLocaleString()} {t("mad")}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                    {Number(item.totalCost).toLocaleString()} {t("mad")}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                    {Number(item.totalProfit).toLocaleString()} {t("mad")}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ProgramPerformanceTable;
