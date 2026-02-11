// frontend/src/components/program_pricing/PricingCard.tsx
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

  // Use semantic colors from index.css
  const getTypeColor = (type: string) => {
    switch (type) {
      case "Hajj":
        return "bg-info/15 text-info border border-info/20";
      case "Umrah":
        return "bg-success/15 text-success border border-success/20";
      case "Tourism":
        return "bg-warning/15 text-warning border border-warning/20";
      default:
        return "bg-secondary text-secondary-foreground border border-border";
    }
  };

  const getTicketPercentage = (type: string) =>
    pricing?.personTypes?.find((p) => p.type === type)?.ticketPercentage ??
    t("na");

  const formatCurrency = (amount: number | undefined) =>
    Number(amount || 0).toLocaleString();

  const isRtl = document.documentElement.dir === "rtl";
  const iconMargin = isRtl ? "ml-2" : "mr-2";
  const valueMargin = isRtl ? "mr-1" : "ml-1";

  return (
    <div className="bg-card text-card-foreground rounded-2xl p-6 shadow-sm border border-border flex flex-col justify-between hover:shadow-md transition-all duration-200">
      <div>
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-foreground">
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
                className="p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground rounded-lg transition-colors"
                title={t("edit") as string}
              >
                <Pencil className="w-4 h-4" />
              </button>
            )}
            {pricing && canModify && (
              <button
                onClick={() => onDelete(pricing.id)}
                className="p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive rounded-lg transition-colors"
                title={t("delete") as string}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {pricing ? (
          <div className="space-y-3 mb-4 text-sm text-muted-foreground">
            {/* Percentages Row */}
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center">
                <Users
                  className={`w-4 h-4 text-muted-foreground ${iconMargin}`}
                />
                <span>
                  Adult:{" "}
                  <span className="font-medium text-foreground">
                    {getTicketPercentage("adult")}%
                  </span>
                </span>
              </div>
              <div className="flex items-center">
                <span>
                  Child:{" "}
                  <span className="font-medium text-foreground">
                    {getTicketPercentage("child")}%
                  </span>
                </span>
              </div>
              <div className="flex items-center">
                <span>
                  Infant:{" "}
                  <span className="font-medium text-foreground">
                    {getTicketPercentage("infant")}%
                  </span>
                </span>
              </div>
            </div>

            {/* Pricing Details */}
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Plane
                    className={`w-4 h-4 text-muted-foreground ${iconMargin}`}
                  />
                  {t("flightTicketPrice")}:
                </div>
                <span className={`font-medium text-foreground ${valueMargin}`}>
                  {formatCurrency(pricing.ticketAirline)} {t("mad")}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Bus
                    className={`w-4 h-4 text-muted-foreground ${iconMargin}`}
                  />
                  {t("transportFees")}:
                </div>
                <span className={`font-medium text-foreground ${valueMargin}`}>
                  {formatCurrency(pricing.transportFees)} {t("mad")}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <CreditCard
                    className={`w-4 h-4 text-muted-foreground ${iconMargin}`}
                  />
                  {t("visaFees")}:
                </div>
                <span className={`font-medium text-foreground ${valueMargin}`}>
                  {formatCurrency(pricing.visaFees)} {t("mad")}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <User
                    className={`w-4 h-4 text-muted-foreground ${iconMargin}`}
                  />
                  {t("guideFees")}:
                </div>
                <span className={`font-medium text-foreground ${valueMargin}`}>
                  {formatCurrency(pricing.guideFees)} {t("mad")}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-border">
                <div className="flex items-center">
                  <Hotel
                    className={`w-4 h-4 text-muted-foreground ${iconMargin}`}
                  />
                  {t("hotels")}:{" "}
                  <span
                    className={`font-medium text-foreground ${valueMargin}`}
                  >
                    {totalHotels}
                  </span>
                </div>
                <div className="flex items-center">
                  <BedDouble
                    className={`w-4 h-4 text-muted-foreground ${iconMargin}`}
                  />
                  {t("roomType")}:{" "}
                  <span
                    className={`font-medium text-foreground ${valueMargin}`}
                  >
                    {totalRoomTypes}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground bg-muted/20 rounded-lg border border-dashed border-border">
            {t("noPricingSet")}
          </div>
        )}
      </div>

      {pricing && (
        <div className="pt-4 border-t border-border mt-auto">
          {pricing.employeeName && (
            <div className="flex items-center text-sm text-muted-foreground">
              <User className={`w-4 h-4 text-muted-foreground ${iconMargin}`} />
              <span>
                {t("addedBy")}{" "}
                <span className="font-medium text-foreground">
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
