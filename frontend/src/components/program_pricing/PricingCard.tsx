import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  Pencil,
  Trash2,
  Plane,
  CreditCard,
  User,
  Hotel,
  BedDouble,
  Bus,
  Users,
} from "lucide-react";
import type { Program, User as UserType } from "../../context/models";

interface PricingCardProps {
  program: Program;
  currentUser: UserType | null;
  onEdit: (program: Program) => void;
  onDelete: (pricingId: number) => void;
}

export const PricingCard: React.FC<PricingCardProps> = ({
  program,
  currentUser,
  onEdit,
  onDelete,
}) => {
  const { t } = useTranslation();
  const pricing = program.pricing;

  // Determine permissions
  const canModify =
    currentUser?.role === "admin" ||
    currentUser?.id === pricing?.employeeId ||
    !pricing;

  // Logic extracted from the main page to calculate stats
  const { totalHotels, totalRoomTypes } = useMemo(() => {
    const hotelSet = new Set<string>();
    const roomTypeSet = new Set<string>();

    if (program.packages) {
      program.packages.forEach((pkg) => {
        // Count Hotels
        if (pkg.hotels) {
          Object.values(pkg.hotels).forEach((hotelList) => {
            (hotelList as string[]).forEach((hotelName) => {
              if (hotelName) hotelSet.add(hotelName);
            });
          });
        }
        // Count Room Types
        if (pkg.prices) {
          pkg.prices.forEach((price) => {
            if (price.roomTypes) {
              price.roomTypes.forEach((rt) => {
                if (rt.type) roomTypeSet.add(rt.type);
              });
            }
          });
        }
      });
    }
    return {
      totalHotels: hotelSet.size,
      totalRoomTypes: roomTypeSet.size,
    };
  }, [program]);

  // Helper for tag colors
  const getTypeColor = (type: string) => {
    switch (type) {
      case "Hajj":
        return "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300";
      case "Umrah":
        return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300";
      case "Tourism":
        return "bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300";
      default:
        return "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300";
    }
  };

  const getTicketPercentage = (type: string) =>
    pricing?.personTypes?.find((p) => p.type === type)?.ticketPercentage ??
    "N/A";

  const formatCurrency = (amount: number | undefined) =>
    Number(amount || 0).toLocaleString();

  const isRtl = document.documentElement.dir === "rtl";
  const iconMargin = isRtl ? "ml-2" : "mr-2";
  const valueMargin = isRtl ? "mr-1" : "ml-1";

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col justify-between hover:shadow-md transition-all duration-200">
      <div>
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {program.name}
            </h3>
            <span
              className={`inline-block px-3 py-1 text-xs font-medium rounded-full mt-2 ${getTypeColor(
                program.type,
              )}`}
            >
              {program.type}
            </span>
          </div>
          <div className="flex space-x-1">
            {canModify && (
              <button
                onClick={() => onEdit(program)}
                className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <Pencil className="w-4 h-4" />
              </button>
            )}
            {pricing && canModify && (
              <button
                onClick={() => onDelete(pricing.id)}
                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {pricing ? (
          <div className="space-y-3 mb-4 text-sm text-gray-600 dark:text-gray-400">
            {/* Percentages Row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Users
                  className={`w-4 h-4 text-gray-400 dark:text-gray-500 ${iconMargin}`}
                />
                <span>
                  Adult:{" "}
                  <span className="font-medium text-gray-800 dark:text-gray-200">
                    {getTicketPercentage("adult")}%
                  </span>
                </span>
              </div>
              <div className="flex items-center">
                <span>
                  Child:{" "}
                  <span className="font-medium text-gray-800 dark:text-gray-200">
                    {getTicketPercentage("child")}%
                  </span>
                </span>
              </div>
              <div className="flex items-center">
                <span>
                  Infant:{" "}
                  <span className="font-medium text-gray-800 dark:text-gray-200">
                    {getTicketPercentage("infant")}%
                  </span>
                </span>
              </div>
            </div>

            {/* Pricing Details */}
            <div className="flex items-center">
              <Plane
                className={`w-4 h-4 text-gray-400 dark:text-gray-500 ${iconMargin}`}
              />
              {t("flightTicketPrice")}:{" "}
              <span
                className={`font-medium text-gray-800 dark:text-gray-200 ${valueMargin}`}
              >
                {formatCurrency(pricing.ticketAirline)} {t("mad")}
              </span>
            </div>
            <div className="flex items-center">
              <Bus
                className={`w-4 h-4 text-gray-400 dark:text-gray-500 ${iconMargin}`}
              />
              {t("transportFees")}:{" "}
              <span
                className={`font-medium text-gray-800 dark:text-gray-200 ${valueMargin}`}
              >
                {formatCurrency(pricing.transportFees)} {t("mad")}
              </span>
            </div>
            <div className="flex items-center">
              <CreditCard
                className={`w-4 h-4 text-gray-400 dark:text-gray-500 ${iconMargin}`}
              />
              {t("visaFees")}:{" "}
              <span
                className={`font-medium text-gray-800 dark:text-gray-200 ${valueMargin}`}
              >
                {formatCurrency(pricing.visaFees)} {t("mad")}
              </span>
            </div>
            <div className="flex items-center">
              <User
                className={`w-4 h-4 text-gray-400 dark:text-gray-500 ${iconMargin}`}
              />
              {t("guideFees")}:{" "}
              <span
                className={`font-medium text-gray-800 dark:text-gray-200 ${valueMargin}`}
              >
                {formatCurrency(pricing.guideFees)} {t("mad")}
              </span>
            </div>
            <div className="flex items-center">
              <Hotel
                className={`w-4 h-4 text-gray-400 dark:text-gray-500 ${iconMargin}`}
              />
              {t("hotels")}:{" "}
              <span
                className={`font-medium text-gray-800 dark:text-gray-200 ${valueMargin}`}
              >
                {totalHotels}
              </span>
            </div>
            <div className="flex items-center">
              <BedDouble
                className={`w-4 h-4 text-gray-400 dark:text-gray-500 ${iconMargin}`}
              />
              {t("roomType")}:{" "}
              <span
                className={`font-medium text-gray-800 dark:text-gray-200 ${valueMargin}`}
              >
                {totalRoomTypes}
              </span>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-400">
            {t("noPricingSet")}
          </div>
        )}
      </div>

      {pricing && (
        <div className="pt-4 border-t border-gray-100 dark:border-gray-700 space-y-2 text-sm text-gray-600 dark:text-gray-400">
          {pricing.employeeName && (
            <div className="flex items-center">
              <User
                className={`w-4 h-4 text-gray-400 dark:text-gray-500 ${iconMargin}`}
              />
              <span>
                {t("addedBy")}{" "}
                <span className="font-medium text-gray-800 dark:text-gray-200">
                  {pricing.employeeName}
                </span>
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
