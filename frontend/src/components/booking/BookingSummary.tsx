// frontend/src/components/booking/BookingSummary.tsx
import React from "react";
import { useTranslation } from "react-i18next";
import { useAuthContext } from "../../context/AuthContext"; // استيراد hook السياق للمصادقة

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
  const { t } = useTranslation();
  const { state: authState } = useAuthContext();
  const userRole = authState.user?.role; // الحصول على دور المستخدم الحالي

  // تحديد البطاقات التي سيتم عرضها بناءً على دور المستخدم
  const allCards = [
    {
      title: t("totalBookings"),
      value: stats.totalBookings,
      unit: "",
    },
    {
      title: t("totalRevenue"),
      value: stats.totalRevenue,
      unit: t("mad"),
    },
    {
      title: t("totalPaid"),
      value: stats.totalPaid,
      unit: t("mad"),
      color: "text-blue-600",
    },
    {
      title: t("totalRemaining"),
      value: stats.totalRemaining,
      unit: t("mad"),
      color: "text-orange-600",
    },
  ];

  // إضافة بطاقات التكلفة والربح فقط إذا كان المستخدم مسؤولاً (Admin)
  if (userRole === "admin") {
    allCards.splice(
      2,
      0,
      {
        // إدراج البطاقات في الموضع الصحيح
        title: t("totalCosts"),
        value: stats.totalCost,
        unit: t("mad"),
      },
      {
        title: t("totalProfit"),
        value: stats.totalProfit,
        unit: t("mad"),
        color: "text-emerald-600",
      }
    );
  }

  // تحديد فئة تخطيط الشبكة بناءً على دور المستخدم
  const gridLayoutClass =
    userRole === "admin"
      ? "lg:grid-cols-6" // 6 أعمدة للمسؤولين
      : "lg:grid-cols-4"; // 4 أعمدة للموظفين والمديرين

  return (
    <div
      className={`grid grid-cols-2 md:grid-cols-3 ${gridLayoutClass} gap-4 text-center`}
    >
      {allCards.map((card, index) => (
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
