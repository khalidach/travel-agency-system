// frontend/src/components/employee_analysis/ServicePerformanceTable.tsx
import React from "react";
import { useTranslation } from "react-i18next";
import { ServicePerformanceData } from "../../context/models";

interface ServicePerformanceTableProps {
  data: ServicePerformanceData | undefined;
  isLoading: boolean;
}

const ServicePerformanceTable: React.FC<ServicePerformanceTableProps> = ({
  data,
  isLoading,
}) => {
  const { t } = useTranslation();
  const isRtl = document.documentElement.dir === "rtl";
  const alignClass = isRtl ? "text-left" : "text-left";

  const getServiceTypeColor = (type: string) => {
    switch (type) {
      case "airline-ticket":
        return "bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-200";
      case "hotel-reservation":
        return "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-200";
      case "reservation-ticket":
        return "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-200";
      case "visa":
        return "bg-teal-100 text-teal-700 dark:bg-teal-500/20 dark:text-teal-200";
      default:
        return "bg-secondary text-secondary-foreground";
    }
  };

  const headers = [
    "serviceType",
    "serviceCount",
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
                  colSpan={5}
                  className="text-center p-8 text-muted-foreground"
                >
                  {t("loading")}
                </td>
              </tr>
            ) : !data?.dailyServicePerformance?.length ? (
              <tr>
                <td
                  colSpan={5}
                  className="text-center p-8 text-muted-foreground"
                >
                  {t("noDataAvailable")}
                </td>
              </tr>
            ) : (
              data.dailyServicePerformance.map((item, index) => (
                <tr key={index} className="hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getServiceTypeColor(String(item.type))}`}
                    >
                      {t(String(item.type))}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                    {item.serviceCount}
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

export default ServicePerformanceTable;
