// frontend/src/components/booking/HotelRoomSelection.tsx
import React, { useMemo } from "react";
// import { useTranslation } from "react-i18next"; // Removed due to environment constraints
import type { Program, Package, ProgramVariation } from "../../context/models";

// Mock implementation of useTranslation to resolve environment issues
const useTranslation = () => ({
  t: (key: string, options?: { count?: number }) => {
    if (options && typeof options.count !== "undefined") {
      // Simple pluralization for the known keys
      if (key === "nights_other") {
        return `${options.count} ${options.count > 1 ? "nights" : "night"}`;
      }
      if (key === "guests") {
        return `${options.count} ${options.count > 1 ? "guests" : "guest"}`;
      }
    }
    // Simple key-to-text mapping
    const translations: { [key: string]: string } = {
      hotelAndRoomSelection: "Hotel & Room Selection",
      selectHotel: "Select Hotel",
      selectAHotel: "Select a hotel",
      roomType: "Room Type",
      selectRoomType: "Select a room type",
    };
    return translations[key] || key;
  },
});

interface HotelRoomSelectionProps {
  selectedProgram: Program | null;
  selectedVariation: ProgramVariation | null;
  selectedPackage: Package | null;
  selectedHotel: {
    cities: string[];
    hotelNames: string[];
    roomTypes: string[];
  };
  updateHotelSelection: (cityIndex: number, hotelName: string) => void;
  updateRoomTypeSelection: (cityIndex: number, roomType: string) => void;
}

export default function HotelRoomSelection({
  selectedVariation,
  selectedPackage,
  selectedHotel,
  updateHotelSelection,
  updateRoomTypeSelection,
}: HotelRoomSelectionProps) {
  const { t } = useTranslation();

  if (
    !selectedPackage ||
    !(selectedVariation?.cities || []).some((c) => c.nights > 0)
  ) {
    return null;
  }

  return (
    <div>
      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
        {t("hotelAndRoomSelection")}
      </h3>
      <div className="space-y-4">
        {(selectedVariation?.cities || []).map((city, cityIndex) => {
          const selectedHotelForCity = selectedHotel.hotelNames[cityIndex];

          const roomTypesForHotel = useMemo(() => {
            if (!selectedHotelForCity || !selectedPackage) {
              return [];
            }
            const roomTypeMap = new Map<string, number>();
            selectedPackage.prices.forEach((price) => {
              const hotelCombinationParts = price.hotelCombination.split("_");
              if (hotelCombinationParts[cityIndex] === selectedHotelForCity) {
                price.roomTypes.forEach((rt) => {
                  if (!roomTypeMap.has(rt.type)) {
                    roomTypeMap.set(rt.type, rt.guests);
                  }
                });
              }
            });
            return Array.from(roomTypeMap.entries()).map(([type, guests]) => ({
              type,
              guests,
            }));
          }, [selectedHotelForCity, selectedPackage, cityIndex]);

          return (
            <div
              key={city.name}
              className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
            >
              <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-3">
                {city.name} ({t("nights_other", { count: city.nights })})
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t("selectHotel")}
                  </label>
                  <select
                    value={selectedHotel.hotelNames[cityIndex] || ""}
                    onChange={(e) =>
                      updateHotelSelection(cityIndex, e.target.value)
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  >
                    <option value="">{t("selectAHotel")}</option>
                    {(selectedPackage?.hotels[city.name] || []).map(
                      (hotel: string) => (
                        <option key={hotel} value={hotel}>
                          {hotel}
                        </option>
                      )
                    )}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t("roomType")}
                  </label>
                  <select
                    value={selectedHotel.roomTypes[cityIndex] || ""}
                    onChange={(e) =>
                      updateRoomTypeSelection(cityIndex, e.target.value)
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    disabled={!selectedHotelForCity}
                  >
                    <option value="">
                      {t(
                        selectedHotelForCity ? "selectRoomType" : "selectAHotel"
                      )}
                    </option>
                    {roomTypesForHotel.map((rt) => (
                      <option key={rt.type} value={rt.type}>
                        {rt.type} ({t("guests", { count: rt.guests })})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
