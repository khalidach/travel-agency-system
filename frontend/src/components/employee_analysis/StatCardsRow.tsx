import React from "react";
import { useTranslation } from "react-i18next";
import { Package, Calendar, ConciergeBell, FileText } from "lucide-react";

interface StatCardsRowProps {
  programsCount: number;
  bookingsCount: number;
  servicesCount: number;
  facturesCount: number;
}

const StatCardsRow: React.FC<StatCardsRowProps> = ({
  programsCount,
  bookingsCount,
  servicesCount,
  facturesCount,
}) => {
  const { t } = useTranslation();

  const cards = [
    {
      title: t("programsAdded"),
      value: programsCount,
      icon: Package,
      color: "bg-blue-500",
    },
    {
      title: t("totalBookingsMade"),
      value: bookingsCount,
      icon: Calendar,
      color: "bg-emerald-500",
    },
    {
      title: t("totalServicesPerformed"),
      value: servicesCount,
      icon: ConciergeBell,
      color: "bg-purple-500",
    },
    {
      title: t("totalFactures"),
      value: facturesCount,
      icon: FileText,
      color: "bg-amber-500",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      {cards.map((card) => (
        <div
          key={card.title}
          className="bg-card rounded-2xl p-6 shadow-sm border border-border hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                {card.title}
              </p>
              <p className="text-3xl font-bold text-foreground mt-2">
                {card.value}
              </p>
            </div>
            <div
              className={`w-12 h-12 ${card.color} rounded-xl flex items-center justify-center`}
            >
              <card.icon className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default StatCardsRow;
