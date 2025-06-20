import React from "react";

interface BookingSummaryProps {
  stats: {
    totalBookings: number;
    totalRevenue: number;
    totalCost: number;
    totalProfit: number;
    totalPaid: number;
    totalRemaining: number;
  };
}

export default function BookingSummary({ stats }: BookingSummaryProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 text-center">
      <div className="bg-white p-4 rounded-xl shadow-sm border">
        <p className="text-sm font-medium text-gray-500">Total Bookings</p>
        <p className="text-2xl font-bold text-gray-900 mt-1">
          {stats.totalBookings}
        </p>
      </div>
      <div className="bg-white p-4 rounded-xl shadow-sm border">
        <p className="text-sm font-medium text-gray-500">Total Revenue</p>
        <p className="text-2xl font-bold text-gray-900 mt-1">
          {stats.totalRevenue.toLocaleString()}{" "}
          <span className="text-sm">MAD</span>
        </p>
      </div>
      <div className="bg-white p-4 rounded-xl shadow-sm border">
        <p className="text-sm font-medium text-gray-500">Total Cost</p>
        <p className="text-2xl font-bold text-gray-900 mt-1">
          {stats.totalCost.toLocaleString()}{" "}
          <span className="text-sm">MAD</span>
        </p>
      </div>
      <div className="bg-white p-4 rounded-xl shadow-sm border">
        <p className="text-sm font-medium text-gray-500">Total Profit</p>
        <p className="text-2xl font-bold text-emerald-600 mt-1">
          {stats.totalProfit.toLocaleString()}{" "}
          <span className="text-sm">MAD</span>
        </p>
      </div>
      <div className="bg-white p-4 rounded-xl shadow-sm border">
        <p className="text-sm font-medium text-gray-500">Total Paid</p>
        <p className="text-2xl font-bold text-blue-600 mt-1">
          {stats.totalPaid.toLocaleString()}{" "}
          <span className="text-sm">MAD</span>
        </p>
      </div>
      <div className="bg-white p-4 rounded-xl shadow-sm border">
        <p className="text-sm font-medium text-gray-500">Total Remaining</p>
        <p className="text-2xl font-bold text-orange-600 mt-1">
          {stats.totalRemaining.toLocaleString()}{" "}
          <span className="text-sm">MAD</span>
        </p>
      </div>
    </div>
  );
}
