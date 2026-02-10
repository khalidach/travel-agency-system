// frontend/src/pages/AgencyReports.tsx
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  Building,
  Package,
  Calendar,
  FileText,
  ArrowRight,
} from "lucide-react";
import * as api from "../services/api";
import BookingSkeleton from "../components/skeletons/BookingSkeleton";
import { User } from "../context/models";

// Define the summary report structure
interface AgencySummary extends Pick<
  User,
  "id" | "agencyName" | "username" | "activeUser"
> {
  agencyId: number;
  programsCount: number;
  bookingsCount: number;
  facturesCount: number;
}

const AgencyReportsList = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");

  // Fetch summary report for all sub-agencies
  const { data: agencies = [], isLoading } = useQuery<AgencySummary[]>({
    queryKey: ["agenciesSummaryReport"],
    queryFn: api.getAgenciesSummaryReport,
  });

  const filteredAgencies = agencies.filter(
    (agency) =>
      agency.agencyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      agency.username.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  if (isLoading) {
    return <BookingSkeleton />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          تقارير الوكالات
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          ملخص أداء الوكالات الفرعية.
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
        <input
          type="text"
          placeholder="ابحث عن الوكالات بالاسم أو اسم المستخدم..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          dir="rtl"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredAgencies.map((agency) => (
          <div
            key={agency.agencyId}
            onClick={() => navigate(`/owner/reports/${agency.agencyId}`)}
            className="group bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-lg hover:border-indigo-500 transition-all duration-300 cursor-pointer flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-4 pb-2 border-b dark:border-gray-700">
                <div className="flex items-center">
                  <Building className="w-6 h-6 text-indigo-500 dark:text-indigo-400" />
                  <h3 className="text-xl font-semibold ml-3 text-gray-900 dark:text-gray-100">
                    {agency.agencyName}
                  </h3>
                </div>
                <span
                  className={`px-3 py-1 text-xs font-medium rounded-full ${
                    agency.activeUser
                      ? "bg-green-100 text-green-700"
                      : "bg-red-100 text-red-700"
                  }`}
                >
                  {agency.activeUser ? "نشط" : "غير نشط"}
                </span>
              </div>

              <div className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
                <div className="flex items-center">
                  <Package className="w-4 h-4 text-blue-500 ml-2" />
                  <span>
                    عدد البرامج:{" "}
                    <span className="font-semibold text-gray-900 dark:text-gray-100">
                      {agency.programsCount}
                    </span>
                  </span>
                </div>
                <div className="flex items-center">
                  <Calendar className="w-4 h-4 text-emerald-500 ml-2" />
                  <span>
                    عدد الحجوزات:{" "}
                    <span className="font-semibold text-gray-900 dark:text-gray-100">
                      {agency.bookingsCount}
                    </span>
                  </span>
                </div>
                <div className="flex items-center">
                  <FileText className="w-4 h-4 text-orange-500 ml-2" />
                  <span>
                    عدد الفواتير:{" "}
                    <span className="font-semibold text-gray-900 dark:text-gray-100">
                      {agency.facturesCount}
                    </span>
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-700 flex items-center justify-end text-indigo-600 dark:text-indigo-400 font-medium">
              عرض التقرير المفصل
              <ArrowRight className="w-4 h-4 mr-2 transform transition-transform group-hover:translate-x-1" />
            </div>
          </div>
        ))}
      </div>

      {filteredAgencies.length === 0 && (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-2xl border border-dashed dark:border-gray-700">
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            لا توجد وكالات مطابقة
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            حاول تعديل البحث أو إضافة وكالات جديدة.
          </p>
        </div>
      )}
    </div>
  );
};

export default AgencyReportsList;
