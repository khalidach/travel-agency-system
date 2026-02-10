import { useMemo } from "react";
import { useTranslation } from "react-i18next"; // Correct import
import type { Program, Package, ProgramVariation } from "../../context/models";

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

interface HotelRowProps {
  city: { name: string; nights: number };
  cityIndex: number;
  selectedHotelName: string | undefined;
  selectedRoomType: string | undefined;
  hotelOptions: string[];
  selectedPackage: Package;
  updateHotelSelection: (cityIndex: number, hotelName: string) => void;
  updateRoomTypeSelection: (cityIndex: number, roomType: string) => void;
}

// Sub-component to handle individual row logic and Hooks
const HotelRow = ({
  city,
  cityIndex,
  selectedHotelName,
  selectedRoomType,
  hotelOptions,
  selectedPackage,
  updateHotelSelection,
  updateRoomTypeSelection,
}: HotelRowProps) => {
  const { t } = useTranslation();

  // useMemo is now valid because it is at the top level of this component
  const roomTypesForHotel = useMemo(() => {
    if (!selectedHotelName || !selectedPackage) {
      return [];
    }
    const roomTypeMap = new Map<string, number>();

    selectedPackage.prices.forEach((price) => {
      const hotelCombinationParts = price.hotelCombination.split("_");
      // Check if this price entry corresponds to the selected hotel for this specific city index
      if (hotelCombinationParts[cityIndex] === selectedHotelName) {
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
  }, [selectedHotelName, selectedPackage, cityIndex]);

  return (
    <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
      <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-3">
        {city.name} ({t("nights_other", { count: city.nights })})
      </h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t("selectHotel")}
          </label>
          <select
            value={selectedHotelName || ""}
            onChange={(e) => updateHotelSelection(cityIndex, e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          >
            <option value="">{t("selectAHotel")}</option>
            {hotelOptions.map((hotel: string) => (
              <option key={hotel} value={hotel}>
                {hotel}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t("roomType")}
          </label>
          <select
            value={selectedRoomType || ""}
            onChange={(e) => updateRoomTypeSelection(cityIndex, e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            disabled={!selectedHotelName}
          >
            <option value="">
              {t(selectedHotelName ? "selectRoomType" : "selectAHotel")}
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
};

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
        {(selectedVariation?.cities || []).map((city, cityIndex) => (
          <HotelRow
            key={`${city.name}-${cityIndex}`}
            city={city}
            cityIndex={cityIndex}
            selectedHotelName={selectedHotel.hotelNames[cityIndex]}
            selectedRoomType={selectedHotel.roomTypes[cityIndex]}
            hotelOptions={selectedPackage.hotels[city.name] || []}
            selectedPackage={selectedPackage}
            updateHotelSelection={updateHotelSelection}
            updateRoomTypeSelection={updateRoomTypeSelection}
          />
        ))}
      </div>
    </div>
  );
}
