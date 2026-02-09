// frontend/src/components/ProgramPricingForm.tsx
import { useState, useMemo, useEffect } from "react";
import { useTranslation } from "react-i18next";
import type {
  Program,
  ProgramPricing,
  HotelPrice,
  ProgramVariation,
} from "../context/models";

interface ProgramPricingFormProps {
  program: Program;
  existingPricing?: ProgramPricing | null;
  onSave: (data: ProgramPricing | Omit<ProgramPricing, "id">) => void;
  onCancel: () => void;
  isSaving: boolean;
}

const emptyPricing: Omit<ProgramPricing, "id"> = {
  selectProgram: "",
  programId: 0,
  ticketAirline: 0,
  ticketPricesByVariation: {},
  visaFees: 0,
  guideFees: 0,
  transportFees: 0,
  allHotels: [],
  personTypes: [
    { type: "adult", ticketPercentage: 100 },
    { type: "child", ticketPercentage: 75 },
    { type: "infant", ticketPercentage: 25 },
  ],
};

export default function ProgramPricingForm({
  program,
  existingPricing,
  onSave,
  onCancel,
  isSaving,
}: ProgramPricingFormProps) {
  const { t } = useTranslation();
  const [currentPricing, setCurrentPricing] = useState<
    ProgramPricing | Omit<ProgramPricing, "id">
  >(emptyPricing);

  useEffect(() => {
    // Generate the fresh hotel list from the latest program data
    const uniqueHotels = new Map<string, { city: string; nights: number }>();
    (program.variations || []).forEach((variation: ProgramVariation) => {
      (program.packages || []).forEach((pkg) => {
        (variation.cities || []).forEach((city) => {
          (pkg.hotels[city.name] || []).forEach((hotelName) => {
            const key = `${city.name}-${hotelName}`;
            if (!uniqueHotels.has(key)) {
              uniqueHotels.set(key, { city: city.name, nights: city.nights });
            }
          });
        });
      });
    });

    const freshHotelsList: HotelPrice[] = Array.from(
      uniqueHotels.entries(),
    ).map(([key, data]) => {
      const [city, name] = key.split("-");
      return { name, city, nights: data.nights, PricePerNights: {} };
    });

    if (existingPricing) {
      // MERGE LOGIC
      const existingPrices = new Map<string, { [roomType: string]: number }>();
      (existingPricing.allHotels || []).forEach((hotel) => {
        const key = `${hotel.city}-${hotel.name}`;
        existingPrices.set(key, hotel.PricePerNights);
      });

      const mergedHotelsList = freshHotelsList.map((hotel) => {
        const key = `${hotel.city}-${hotel.name}`;
        if (existingPrices.has(key)) {
          return { ...hotel, PricePerNights: existingPrices.get(key) || {} };
        }
        return hotel;
      });

      setCurrentPricing({
        ...existingPricing,
        allHotels: mergedHotelsList,
        ticketPricesByVariation: existingPricing.ticketPricesByVariation || {},
      });
    } else {
      setCurrentPricing({
        ...emptyPricing,
        programId: program.id,
        selectProgram: program.name,
        allHotels: freshHotelsList,
        ticketPricesByVariation: {},
      });
    }
  }, [program, existingPricing]);

  const uniqueRoomTypesForProgram = useMemo(() => {
    if (!program) return [];
    const allRoomTypeNames = new Set<string>();
    program.packages.forEach((pkg) => {
      pkg.prices.forEach((price) => {
        price.roomTypes.forEach((rt) => allRoomTypeNames.add(rt.type));
      });
    });
    return Array.from(allRoomTypeNames);
  }, [program]);

  const handleHotelPriceChange = (
    hotelIndex: number,
    roomType: string,
    value: string,
  ) => {
    setCurrentPricing((prev) => {
      const newHotels = [...(prev.allHotels || [])];
      if (!newHotels[hotelIndex].PricePerNights) {
        newHotels[hotelIndex].PricePerNights = {};
      }
      newHotels[hotelIndex].PricePerNights[roomType] =
        value === "" ? 0 : Number(value);
      return { ...prev, allHotels: newHotels };
    });
  };

  const handlePersonTypeChange = (index: number, value: string) => {
    setCurrentPricing((prev) => {
      const newPersonTypes = [...(prev.personTypes || [])];
      newPersonTypes[index].ticketPercentage = Number(value);
      return { ...prev, personTypes: newPersonTypes };
    });
  };

  const handleTicketPriceChange = (value: string, variationName?: string) => {
    const price = value === "" ? 0 : Number(value);
    setCurrentPricing((prev) => {
      const newPricing = { ...prev };
      if (variationName) {
        const newVariationPrices = {
          ...(newPricing.ticketPricesByVariation || {}),
        };
        newVariationPrices[variationName] = price;
        newPricing.ticketPricesByVariation = newVariationPrices;
      } else {
        newPricing.ticketAirline = price;
        const newVariationPrices = {
          ...(newPricing.ticketPricesByVariation || {}),
        };
        (program.variations || []).forEach((v) => {
          newVariationPrices[v.name] = price;
        });
        newPricing.ticketPricesByVariation = newVariationPrices;
      }
      return newPricing;
    });
  };

  const handleSave = () => {
    onSave(currentPricing);
  };

  const hasMultipleVariations =
    program.variations && program.variations.length > 1;

  return (
    <div className="space-y-8">
      <>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t("flightTicketPrice")}{" "}
              {hasMultipleVariations && `(${t("default")})`}
            </label>
            <input
              type="number"
              value={currentPricing.ticketAirline || ""}
              onChange={(e) => handleTicketPriceChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t("transportFees")}
            </label>
            <input
              type="number"
              value={currentPricing.transportFees || ""}
              onChange={(e) =>
                setCurrentPricing((prev) => ({
                  ...prev,
                  transportFees: Number(e.target.value),
                }))
              }
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t("visaFees")}
            </label>
            <input
              type="number"
              value={currentPricing.visaFees || ""}
              onChange={(e) =>
                setCurrentPricing((prev) => ({
                  ...prev,
                  visaFees: Number(e.target.value),
                }))
              }
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t("guideFees")}
            </label>
            <input
              type="number"
              value={currentPricing.guideFees || ""}
              onChange={(e) =>
                setCurrentPricing((prev) => ({
                  ...prev,
                  guideFees: Number(e.target.value),
                }))
              }
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>
        </div>

        {hasMultipleVariations && (
          <div className="mt-8">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
              {t("ticketPricesByVariation")}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {program.variations.map((variation) => (
                <div key={variation.name}>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {variation.name}
                  </label>
                  <input
                    type="number"
                    value={
                      currentPricing.ticketPricesByVariation?.[
                        variation.name
                      ] || ""
                    }
                    placeholder={currentPricing.ticketAirline?.toString() || ""}
                    onChange={(e) =>
                      handleTicketPriceChange(e.target.value, variation.name)
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
            {t("personTypePricing")}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(currentPricing.personTypes || []).map((personType, index) => (
              <div key={personType.type}>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 capitalize">
                  {t("ticketPercentage", { personType: t(personType.type) })}
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={personType.ticketPercentage}
                    onChange={(e) =>
                      handlePersonTypeChange(index, e.target.value)
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg pr-10 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    readOnly={personType.type === "adult"}
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 dark:text-gray-400 sm:text-sm">
                      %
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
            {t("hotels")}
          </h2>
          {(currentPricing.allHotels || []).map((hotel, index) => (
            <div
              key={`${hotel.city}-${hotel.name}`}
              className="mb-6 p-4 border rounded-lg dark:border-gray-700"
            >
              <div className="flex justify-between items-center mb-3">
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-gray-100">
                    {hotel.name}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {hotel.city} - {t("nightsLabel", { count: hotel.nights })}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {uniqueRoomTypesForProgram.map((roomType) => (
                  <div key={roomType}>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 capitalize">
                      {t("roomTypePrice", { roomType: t(roomType) })}
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={hotel.PricePerNights?.[roomType] || ""}
                      onChange={(e) =>
                        handleHotelPriceChange(index, roomType, e.target.value)
                      }
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      placeholder={t("pricePerNightPlaceholder") as string}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 flex justify-end space-x-4">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
          >
            {t("cancel")}
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 dark:disabled:bg-gray-500"
          >
            {isSaving
              ? t("saving")
              : "id" in currentPricing
                ? t("updatePricing")
                : t("savePricing")}
          </button>
        </div>
      </>
    </div>
  );
}
