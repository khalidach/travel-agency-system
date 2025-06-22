import React, { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, Package, Calendar } from "lucide-react";
import * as api from "../services/api";
import type {
  Program,
  Booking,
  Employee,
  PaginatedResponse,
} from "../context/models";
import DashboardSkeleton from "../components/skeletons/DashboardSkeleton";
import { subDays, startOfDay, endOfDay } from "date-fns";

type DateFilter = "today" | "7days" | "month" | "custom";

export default function EmployeeAnalysisPage() {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();

  // --- Data Fetching ---
  const { data: programResponse, isLoading: isLoadingPrograms } = useQuery<
    PaginatedResponse<Program>
  >({
    queryKey: ["programs", "all"],
    queryFn: () => api.getPrograms(1, 10000),
  });
  const allPrograms = programResponse?.data ?? [];

  const { data: bookingResponse, isLoading: isLoadingBookings } = useQuery<
    PaginatedResponse<Booking>
  >({
    queryKey: ["bookings", "all"],
    queryFn: () => api.getBookings(1, 10000),
  });
  const allBookings = bookingResponse?.data ?? [];

  const { data: employeesData, isLoading: isLoadingEmployees } = useQuery<{
    employees: Employee[];
  }>({
    queryKey: ["employees"],
    queryFn: api.getEmployees,
  });

  const employee = useMemo(
    () => employeesData?.employees.find((e) => e.username === username),
    [employeesData, username]
  );

  // --- State for Date Filtering ---
  const [dateFilter, setDateFilter] = useState<DateFilter>("month");
  const [customDateRange, setCustomDateRange] = useState({
    start: "",
    end: "",
  });

  // --- Memoized Calculations ---
  const programsCreatedByEmployee = useMemo(() => {
    if (!employee) return [];
    return allPrograms.filter((p) => p.employeeId === employee.id);
  }, [allPrograms, employee]);

  const bookingsMadeByEmployee = useMemo(() => {
    if (!employee) return [];
    return allBookings.filter((b) => b.employeeId === employee.id);
  }, [allBookings, employee]);

  const programPerformanceData = useMemo(() => {
    if (!employee) return [];
    return allPrograms.map((program) => {
      const bookingsForThisProgramByEmployee = bookingsMadeByEmployee.filter(
        (b) => b.tripId === program.id.toString()
      );

      const totalBookings = bookingsForThisProgramByEmployee.length;
      const totalSales = bookingsForThisProgramByEmployee.reduce(
        (sum, booking) => sum + Number(booking.sellingPrice),
        0
      );
      const totalCost = bookingsForThisProgramByEmployee.reduce(
        (sum, booking) => sum + Number(booking.basePrice),
        0
      );
      const totalProfit = bookingsForThisProgramByEmployee.reduce(
        (sum, booking) => sum + Number(booking.profit),
        0
      );

      return {
        programName: program.name,
        type: program.type,
        bookingCount: totalBookings,
        totalSales,
        totalCost,
        totalProfit,
      };
    });
  }, [allPrograms, bookingsMadeByEmployee, employee]);

  const dateFilteredStats = useMemo(() => {
    if (!employee)
      return {
        totalBookings: 0,
        totalRevenue: 0,
        totalCost: 0,
        totalProfit: 0,
      };
    const now = new Date();
    let startDate: Date;
    let endDate: Date = endOfDay(now);

    switch (dateFilter) {
      case "today":
        startDate = startOfDay(now);
        break;
      case "month":
        startDate = startOfDay(subDays(now, 30));
        break;
      case "custom":
        startDate = customDateRange.start
          ? startOfDay(new Date(customDateRange.start))
          : startOfDay(subDays(now, 7));
        endDate = customDateRange.end
          ? endOfDay(new Date(customDateRange.end))
          : endOfDay(now);
        break;
      case "7days":
      default:
        startDate = startOfDay(subDays(now, 7));
        break;
    }

    const filteredBookings = bookingsMadeByEmployee.filter((booking) => {
      const bookingDate = new Date(booking.createdAt);
      return bookingDate >= startDate && bookingDate <= endDate;
    });

    return {
      totalBookings: filteredBookings.length,
      totalRevenue: filteredBookings.reduce(
        (sum, b) => sum + Number(b.sellingPrice),
        0
      ),
      totalCost: filteredBookings.reduce(
        (sum, b) => sum + Number(b.basePrice),
        0
      ),
      totalProfit: filteredBookings.reduce(
        (sum, b) => sum + Number(b.profit),
        0
      ),
    };
  }, [bookingsMadeByEmployee, dateFilter, customDateRange, employee]);

  if (isLoadingPrograms || isLoadingBookings || isLoadingEmployees) {
    return <DashboardSkeleton />;
  }

  if (!employee) {
    return (
      <div className="text-center py-10">
        <h2 className="text-xl font-semibold">Employee not found</h2>
        <button
          onClick={() => navigate("/employees")}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg"
        >
          Back to Employees
        </button>
      </div>
    );
  }

  const statCards = [
    {
      title: "Programs Added",
      value: programsCreatedByEmployee.length,
      icon: Package,
    },
    {
      title: "Total Bookings Made",
      value: bookingsMadeByEmployee.length,
      icon: Calendar,
    },
  ];

  const financialMetrics = [
    {
      title: "Total Bookings",
      value: dateFilteredStats.totalBookings,
      unit: "",
    },
    {
      title: "Total Revenue",
      value: dateFilteredStats.totalRevenue,
      unit: "MAD",
    },
    { title: "Total Cost", value: dateFilteredStats.totalCost, unit: "MAD" },
    {
      title: "Total Profit",
      value: dateFilteredStats.totalProfit,
      unit: "MAD",
    },
  ];

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

  return (
    <div className="space-y-8">
      <div className="flex items-center">
        <button
          onClick={() => navigate("/employees")}
          className="p-2 mr-4 bg-gray-100 rounded-full hover:bg-gray-200"
        >
          <ChevronLeft className="w-6 h-6 text-gray-700" />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Employee Analysis: {employee.username}
          </h1>
          <p className="text-gray-600 mt-2">
            Performance overview for {employee.username}.
          </p>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
        {statCards.map((card) => (
          <div
            key={card.title}
            className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  {card.title}
                </p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {card.value}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center">
                <card.icon className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Date Filters for Bookings */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Filter Performance by Date
        </h3>
        <div className="flex flex-col sm:flex-row gap-4 items-center">
          <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setDateFilter("today")}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                dateFilter === "today"
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Today
            </button>
            <button
              onClick={() => setDateFilter("7days")}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                dateFilter === "7days"
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Last 7 Days
            </button>
            <button
              onClick={() => setDateFilter("month")}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                dateFilter === "month"
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Last 30 Days
            </button>
            <button
              onClick={() => setDateFilter("custom")}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                dateFilter === "custom"
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Custom
            </button>
          </div>
          {dateFilter === "custom" && (
            <div className="flex items-center space-x-2">
              <input
                type="date"
                value={customDateRange.start}
                onChange={(e) =>
                  setCustomDateRange({
                    ...customDateRange,
                    start: e.target.value,
                  })
                }
                className="px-3 py-1 border border-gray-300 rounded-lg"
              />
              <span>to</span>
              <input
                type="date"
                value={customDateRange.end}
                onChange={(e) =>
                  setCustomDateRange({
                    ...customDateRange,
                    end: e.target.value,
                  })
                }
                className="px-3 py-1 border border-gray-300 rounded-lg"
              />
            </div>
          )}
        </div>
        <table className="w-full mt-4">
          <tbody>
            {financialMetrics.map((metric) => (
              <tr
                key={metric.title}
                className="border-b last:border-b-0 border-gray-100"
              >
                <td className="py-3 text-base font-medium text-gray-600">
                  {metric.title}
                </td>
                <td className="py-3 text-2xl font-bold text-gray-900 text-right">
                  {metric.value.toLocaleString()} {metric.unit}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Bookings per Program Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">
            Overall Program Performance
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Program Name
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Bookings
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Sales
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Cost
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Profit
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {programPerformanceData.map((item, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {item.programName}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getTypeColor(
                        item.type
                      )}`}
                    >
                      {item.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {item.bookingCount}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {item.totalSales.toLocaleString()} MAD
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {item.totalCost.toLocaleString()} MAD
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-emerald-600">
                    {item.totalProfit.toLocaleString()} MAD
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
