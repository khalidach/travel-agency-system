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
  const alignClass = isRtl ? "text-right" : "text-left";

  const getTypeColor = (type: string) => {
    switch (type) {
      case "Hajj":
        return "bg-blue-100 text-blue-700";
      case "Umrah":
        return "bg-emerald-100 text-emerald-700";
      case "Tourism":
        return "bg-orange-100 text-orange-700";
      default:
        return "bg-gray-100 text-gray-700";
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
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              {headers.map((key) => (
                <th
                  key={key}
                  className={`px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider ${alignClass}`}
                >
                  {t(key)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="text-center p-8 text-gray-500">
                  <div className="flex justify-center items-center gap-2">
                    {/* Add Spinner component here if available */}
                    {t("loading")}
                  </div>
                </td>
              </tr>
            ) : !data?.programPerformance?.length ? (
              <tr>
                <td colSpan={6} className="text-center p-8 text-gray-500">
                  {t("noDataAvailable")}
                </td>
              </tr>
            ) : (
              data.programPerformance.map((item, index) => (
                <tr
                  key={index}
                  className="hover:bg-blue-50 cursor-pointer transition-colors"
                  onClick={() =>
                    onProgramClick(
                      Number(item.programId),
                      String(item.programName),
                    )
                  }
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {item.programName}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getTypeColor(String(item.type))}`}
                    >
                      {/* FIX: Explicitly cast item.type to String to fix TypeScript error */}
                      {t(String(item.type))}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {item.bookingCount}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {Number(item.totalSales).toLocaleString()} {t("mad")}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {Number(item.totalCost).toLocaleString()} {t("mad")}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-emerald-600">
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
