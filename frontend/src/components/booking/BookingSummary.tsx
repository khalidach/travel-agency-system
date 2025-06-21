import React from "react";
import { useAuthContext } from "../../context/AuthContext";

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
  const { state } = useAuthContext();
  const userRole = state.user?.role;

  const allCards = [
    {
      title: "Total Bookings",
      value: stats.totalBookings,
      unit: "",
      roles: ["admin", "manager", "employee"],
    },
    {
      title: "Total Revenue",
      value: stats.totalRevenue,
      unit: "MAD",
      roles: ["admin", "manager"],
    },
    {
      title: "Total Cost",
      value: stats.totalCost,
      unit: "MAD",
      roles: ["admin", "manager"],
    },
    {
      title: "Total Profit",
      value: stats.totalProfit,
      unit: "MAD",
      color: "text-emerald-600",
      roles: ["admin", "manager"],
    },
    {
      title: "Total Paid",
      value: stats.totalPaid,
      unit: "MAD",
      color: "text-blue-600",
      roles: ["admin", "manager", "employee"],
    },
    {
      title: "Total Remaining",
      value: stats.totalRemaining,
      unit: "MAD",
      color: "text-orange-600",
      roles: ["admin", "manager", "employee"],
    },
  ];

  const visibleCards = allCards.filter(
    (card) => userRole && card.roles.includes(userRole)
  );

  // Correctly apply grid classes based on the number of visible cards
  const gridClasses =
    userRole === "employee"
      ? "grid-cols-1 sm:grid-cols-3"
      : "grid-cols-2 md:grid-cols-3 lg:grid-cols-6";

  return (
    <div className={`grid ${gridClasses} gap-4 text-center`}>
      {visibleCards.map((card, index) => (
        <div key={index} className="bg-white p-4 rounded-xl shadow-sm border">
          <p className="text-sm font-medium text-gray-500">{card.title}</p>
          <p
            className={`text-2xl font-bold mt-1 ${
              card.color || "text-gray-900"
            }`}
          >
            {typeof card.value === "number"
              ? card.value.toLocaleString()
              : card.value}
            {card.unit && <span className="text-sm"> {card.unit}</span>}
          </p>
        </div>
      ))}
    </div>
  );
}
