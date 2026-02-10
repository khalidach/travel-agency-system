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
  const alignClass = isRtl ? "text-right" : "text-left";

  const getServiceTypeColor = (type: string) => {
    switch (type) {
      case "airline-ticket":
        return "bg-sky-100 text-sky-700";
      case "hotel-reservation":
        return "bg-amber-100 text-amber-700";
      case "reservation-ticket":
        return "bg-rose-100 text-rose-700";
      case "visa":
        return "bg-teal-100 text-teal-700";
      default:
        return "bg-gray-100 text-gray-700";
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
                <td colSpan={5} className="text-center p-8 text-gray-500">
                  {t("loading")}...
                </td>
              </tr>
            ) : !data?.dailyServicePerformance?.length ? (
              <tr>
                <td colSpan={5} className="text-center p-8 text-gray-500">
                  {t("noDataAvailable")}
                </td>
              </tr>
            ) : (
              data.dailyServicePerformance.map((item, index) => (
                <tr key={index} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getServiceTypeColor(String(item.type))}`}
                    >
                      {t(String(item.type))}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {item.serviceCount}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {Number(item.totalSales).toLocaleString()} MAD
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {Number(item.totalCost).toLocaleString()} MAD
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-emerald-600">
                    {Number(item.totalProfit).toLocaleString()} MAD
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
