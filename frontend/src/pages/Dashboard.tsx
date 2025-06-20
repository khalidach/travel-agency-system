import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import {
  Users,
  DollarSign,
  TrendingUp,
  Package,
  Calendar,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { subDays, startOfDay, endOfDay, subYears } from "date-fns";
import * as api from "../services/api";
import { Link } from "react-router-dom";
import type { Program, Booking, PaginatedResponse } from "../context/models";
import DashboardSkeleton from "../components/skeletons/DashboardSkeleton";

export default function Dashboard() {
  const { t } = useTranslation();

  const {
    data: programResponse,
    isLoading: isLoadingPrograms,
    isError: isErrorPrograms,
  } = useQuery<PaginatedResponse<Program>>({
    queryKey: ["programs", "all"],
    queryFn: () => api.getPrograms(1, 10000), // Fetch all programs
  });
  const programs = programResponse?.data ?? [];

  const {
    data: bookingResponse,
    isLoading: isLoadingBookings,
    isError: isErrorBookings,
  } = useQuery<PaginatedResponse<Booking>>({
    queryKey: ["bookings", "all"],
    queryFn: () => api.getBookings(1, 10000), // Fetch all bookings
  });
  const bookings = bookingResponse?.data ?? [];

  const [dateFilter, setDateFilter] = useState("month");
  const [customDateRange, setCustomDateRange] = useState({
    start: "",
    end: "",
  });

  const { totalBookings, totalRevenue, totalCost, totalProfit } =
    useMemo(() => {
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
        case "year":
          startDate = startOfDay(subYears(now, 1));
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

      const filteredBookings = bookings.filter((booking) => {
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
    }, [bookings, dateFilter, customDateRange]);

  const metrics = [
    { title: t("totalBookings"), value: totalBookings },
    { title: t("totalRevenue"), value: `${totalRevenue.toLocaleString()} MAD` },
    { title: "Total Costs", value: `${totalCost.toLocaleString()} MAD` },
    { title: t("totalProfit"), value: `${totalProfit.toLocaleString()} MAD` },
  ];

  const programTypeData = [
    {
      name: "Hajj",
      value: programs.filter((p) => p.type === "Hajj").length,
      color: "#3b82f6",
    },
    {
      name: "Umrah",
      value: programs.filter((p) => p.type === "Umrah").length,
      color: "#059669",
    },
    {
      name: "Tourism",
      value: programs.filter((p) => p.type === "Tourism").length,
      color: "#ea580c",
    },
  ];

  const topStats = [
    {
      title: t("totalBookings"),
      value: bookings.length,
      icon: Users,
      color: "bg-blue-500",
    },
    {
      title: t("totalRevenue"),
      value: `${bookings
        .reduce((sum, b) => sum + Number(b.sellingPrice), 0)
        .toLocaleString()} MAD`,
      icon: DollarSign,
      color: "bg-emerald-500",
    },
    {
      title: t("totalProfit"),
      value: `${bookings
        .reduce((sum, b) => sum + Number(b.profit), 0)
        .toLocaleString()} MAD`,
      icon: TrendingUp,
      color: "bg-orange-500",
    },
    {
      title: t("activePrograms"),
      value: programs.length,
      icon: Package,
      color: "bg-purple-500",
    },
  ];

  const fullyPaidBookings = bookings.filter((b) => b.isFullyPaid).length;
  const pendingPayments = bookings.filter((b) => !b.isFullyPaid).length;

  if (isLoadingPrograms || isLoadingBookings) {
    return <DashboardSkeleton />;
  }

  if (isErrorPrograms || isErrorBookings) {
    return <div>Error loading dashboard data.</div>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">{t("dashboard")}</h1>
        <p className="text-gray-600 mt-2">
          Overview of your travel agency performance and key metrics
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {topStats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div
              key={index}
              className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    {stat.title}
                  </p>
                  <p className="text-2xl font-bold text-gray-900 mt-2">
                    {stat.value}
                  </p>
                </div>
                <div
                  className={`w-12 h-12 ${stat.color} rounded-xl flex items-center justify-center`}
                >
                  <Icon className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="pb-4 border-b border-gray-200">
            <div className="flex items-center flex-wrap gap-2">
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
                  onClick={() => setDateFilter("year")}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    dateFilter === "year"
                      ? "bg-white text-blue-600 shadow-sm"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  Last Year
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
            </div>
            {dateFilter === "custom" && (
              <div className="flex items-center space-x-2 mt-4">
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
              {metrics.map((metric) => (
                <tr
                  key={metric.title}
                  className="border-b last:border-b-0 border-gray-100"
                >
                  <td className="py-3 text-base font-medium text-gray-600">
                    {metric.title}
                  </td>
                  <td className="py-3 text-2xl font-bold text-gray-900 text-right">
                    {metric.value}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">
            Program Types Distribution
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={programTypeData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={120}
                paddingAngle={5}
                dataKey="value"
              >
                {programTypeData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex justify-center space-x-6 mt-4">
            {programTypeData.map((item, index) => (
              <div key={index} className="flex items-center">
                <div
                  className={`w-3 h-3 rounded-full mr-2`}
                  style={{ backgroundColor: item.color }}
                ></div>
                <span className="text-sm text-gray-600">{item.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Quick Actions
          </h3>
          <div className="space-y-3">
            <Link
              to="/booking"
              className="w-full flex items-center p-3 text-left hover:bg-gray-50 rounded-lg transition-colors"
            >
              <Calendar className="w-5 h-5 text-blue-500 mr-3" />
              <span className="text-sm font-medium text-gray-700">
                New Booking
              </span>
            </Link>
            <Link
              to="/programs"
              className="w-full flex items-center p-3 text-left hover:bg-gray-50 rounded-lg transition-colors"
            >
              <Package className="w-5 h-5 text-emerald-500 mr-3" />
              <span className="text-sm font-medium text-gray-700">
                Add Program
              </span>
            </Link>
            <Link
              to="/profit-report"
              className="w-full flex items-center p-3 text-left hover:bg-gray-50 rounded-lg transition-colors"
            >
              <TrendingUp className="w-5 h-5 text-orange-500 mr-3" />
              <span className="text-sm font-medium text-gray-700">
                View Reports
              </span>
            </Link>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Payment Status
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center">
                <CheckCircle2 className="w-5 h-5 text-emerald-500 mr-2" />
                <span className="text-sm text-gray-600">Fully Paid</span>
              </div>
              <span className="text-sm font-semibold text-gray-900">
                {fullyPaidBookings}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <div className="flex items-center">
                <Clock className="w-5 h-5 text-orange-500 mr-2" />
                <span className="text-sm text-gray-600">Pending</span>
              </div>
              <span className="text-sm font-semibold text-gray-900">
                {pendingPayments}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Recent Bookings
          </h3>
          <div className="space-y-3">
            {bookings.slice(0, 3).map((booking) => (
              <div
                key={booking.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {booking.clientNameFr}
                  </p>
                  <p className="text-xs text-gray-500">
                    {booking.passportNumber}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-900">
                    {Number(booking.sellingPrice).toLocaleString()} MAD
                  </p>
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
                      booking.isFullyPaid
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-orange-100 text-orange-700"
                    }`}
                  >
                    {booking.isFullyPaid ? "Paid" : "Pending"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
