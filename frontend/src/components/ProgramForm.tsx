import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import type { Program, Package, RoomPrice } from "../context/models";

// Import the new child components
import CityManager from "./program/CityManager";
import PackageManager from "./program/PackageManager";

// Props for the form remain the same
interface ProgramFormProps {
  program?: Program | null;
  onSave: (program: Program) => void;
  onCancel: () => void;
}

// Interfaces for the form's state structure
interface CityData {
  name: string;
  nights: number;
}

interface FormData {
  id?: number;
  name: string;
  type: "Hajj" | "Umrah" | "Tourism";
  duration: number;
  cities: CityData[];
  packages: Package[];
}

export default function ProgramForm({
  program,
  onSave,
  onCancel,
}: ProgramFormProps) {
  const { t } = useTranslation();

  // The main state for the form is managed here
  const [formData, setFormData] = useState<FormData>({
    name: "",
    type: "Umrah",
    duration: 0,
    cities: [{ name: "", nights: 1 }],
    packages: [{ name: "Standard", hotels: {}, prices: [] }],
  });

  const [availableRoomTypes] = useState([
    "Double",
    "Triple",
    "Quad",
    "Quintuple",
  ]);

  // Effect to populate the form when editing an existing program
  useEffect(() => {
    if (program) {
      setFormData({
        id: program.id,
        name: program.name,
        type: program.type,
        duration: program.duration,
        cities: program.cities,
        packages: program.packages,
      });
    }
  }, [program]);

  // --- All handler functions are defined in the parent ---

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData as Program);
  };

  const updateDuration = (cities: CityData[]) => {
    const totalDuration = cities.reduce(
      (sum, city) => sum + Number(city.nights || 0),
      0
    );
    setFormData((prev) => ({ ...prev, duration: totalDuration, cities }));
  };

  const addCity = () => {
    const newCities = [...formData.cities, { name: "", nights: 1 }];
    updateDuration(newCities);
  };

  const updateCity = (
    index: number,
    field: keyof CityData,
    value: string | number
  ) => {
    const newCities = formData.cities.map((city, i) =>
      i === index ? { ...city, [field]: value } : city
    );
    updateDuration(newCities);
  };

  const removeCity = (index: number) => {
    const newCities = formData.cities.filter((_, i) => i !== index);
    updateDuration(newCities);
  };

  const addPackage = () => {
    setFormData((prev) => ({
      ...prev,
      packages: [
        ...prev.packages,
        { name: `Package ${prev.packages.length + 1}`, hotels: {}, prices: [] },
      ],
    }));
  };

  const removePackage = (packageIndex: number) => {
    setFormData((prev) => ({
      ...prev,
      packages: prev.packages.filter((_, i) => i !== packageIndex),
    }));
  };

  const updatePackageName = (packageIndex: number, name: string) => {
    setFormData((prev) => ({
      ...prev,
      packages: prev.packages.map((pkg, i) =>
        i === packageIndex ? { ...pkg, name } : pkg
      ),
    }));
  };

  const addHotelToCity = (packageIndex: number, cityName: string) => {
    setFormData((prev) => ({
      ...prev,
      packages: prev.packages.map((pkg, i) => {
        if (i === packageIndex) {
          const newHotels = { ...pkg.hotels };
          if (!newHotels[cityName]) {
            newHotels[cityName] = [];
          }
          newHotels[cityName].push("");
          return { ...pkg, hotels: newHotels };
        }
        return pkg;
      }),
    }));
  };

  const updateHotel = (
    packageIndex: number,
    city: string,
    hotelIndex: number,
    hotelName: string
  ) => {
    setFormData((prev) => ({
      ...prev,
      packages: prev.packages.map((pkg, i) => {
        if (i === packageIndex) {
          const newHotels = { ...pkg.hotels };
          newHotels[city][hotelIndex] = hotelName;
          return { ...pkg, hotels: newHotels };
        }
        return pkg;
      }),
    }));
  };

  const removeHotel = (
    packageIndex: number,
    city: string,
    hotelIndex: number
  ) => {
    setFormData((prev) => ({
      ...prev,
      packages: prev.packages.map((pkg, i) => {
        if (i === packageIndex) {
          const newHotels = { ...pkg.hotels };
          newHotels[city] = newHotels[city].filter(
            (_, idx) => idx !== hotelIndex
          );
          return { ...pkg, hotels: newHotels };
        }
        return pkg;
      }),
    }));
  };

  const addPricingForOption = (packageIndex: number, hotelOption: string) => {
    setFormData((prev) => ({
      ...prev,
      packages: prev.packages.map((pkg, i) => {
        if (i === packageIndex) {
          const existingPrice = pkg.prices.find(
            (p) => p.hotelCombination === hotelOption
          );
          if (!existingPrice) {
            const defaultRoomTypes = availableRoomTypes.map((type) => ({
              type,
              guests: 1, // Simplified, can be expanded
            }));
            return {
              ...pkg,
              prices: [
                ...pkg.prices,
                { hotelCombination: hotelOption, roomTypes: defaultRoomTypes },
              ],
            };
          }
        }
        return pkg;
      }),
    }));
  };

  const removePriceStructure = (packageIndex: number, priceIndex: number) => {
    setFormData((prev) => ({
      ...prev,
      packages: prev.packages.map((pkg, i) => {
        if (i === packageIndex) {
          return {
            ...pkg,
            prices: pkg.prices.filter((_, pIdx) => pIdx !== priceIndex),
          };
        }
        return pkg;
      }),
    }));
  };

  const updateRoomDefinition = (
    packageIndex: number,
    priceIndex: number,
    roomIndex: number,
    field: keyof RoomPrice,
    value: string | number
  ) => {
    setFormData((prev) => ({
      ...prev,
      packages: prev.packages.map((pkg, i) => {
        if (i === packageIndex) {
          return {
            ...pkg,
            prices: pkg.prices.map((price, pIdx) => {
              if (pIdx === priceIndex) {
                const newRoomTypes = price.roomTypes.map((room, rIdx) =>
                  rIdx === roomIndex ? { ...room, [field]: value } : room
                );
                return { ...price, roomTypes: newRoomTypes };
              }
              return price;
            }),
          };
        }
        return pkg;
      }),
    }));
  };

  const addRoomType = (packageIndex: number, priceIndex: number) => {
    setFormData((prev) => ({
      ...prev,
      packages: prev.packages.map((pkg, i) => {
        if (i === packageIndex) {
          return {
            ...pkg,
            prices: pkg.prices.map((price, pIdx) => {
              if (pIdx === priceIndex) {
                return {
                  ...price,
                  roomTypes: [
                    ...price.roomTypes,
                    { type: "Custom", guests: 1 },
                  ],
                };
              }
              return price;
            }),
          };
        }
        return pkg;
      }),
    }));
  };

  const removeRoomType = (
    packageIndex: number,
    priceIndex: number,
    roomIndex: number
  ) => {
    setFormData((prev) => ({
      ...prev,
      packages: prev.packages.map((pkg, i) => {
        if (i === packageIndex) {
          return {
            ...pkg,
            prices: pkg.prices.map((price, pIdx) => {
              if (pIdx === priceIndex) {
                return {
                  ...price,
                  roomTypes: price.roomTypes.filter(
                    (_, rIdx) => rIdx !== roomIndex
                  ),
                };
              }
              return price;
            }),
          };
        }
        return pkg;
      }),
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t("programName")}
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, name: e.target.value }))
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t("programType")}
          </label>
          <select
            value={formData.type}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                type: e.target.value as "Hajj" | "Umrah" | "Tourism",
              }))
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          >
            <option value="Hajj">Hajj</option>
            <option value="Umrah">Umrah</option>
            <option value="Tourism">Tourism</option>
          </select>
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {t("duration")} (days)
        </label>
        <input
          type="number"
          value={formData.duration}
          readOnly
          className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100"
        />
      </div>

      <CityManager
        cities={formData.cities}
        onAddCity={addCity}
        onUpdateCity={updateCity}
        onRemoveCity={removeCity}
      />

      <PackageManager
        packages={formData.packages}
        cities={formData.cities}
        availableRoomTypes={availableRoomTypes}
        onAddPackage={addPackage}
        onRemovePackage={removePackage}
        onUpdatePackageName={updatePackageName}
        onAddHotelToCity={addHotelToCity}
        onUpdateHotel={updateHotel}
        onRemoveHotel={removeHotel}
        onAddPricingForOption={addPricingForOption}
        onRemovePriceStructure={removePriceStructure}
        onUpdateRoomDefinition={updateRoomDefinition}
        onAddRoomType={addRoomType}
        onRemoveRoomType={removeRoomType}
      />

      <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
        <button
          type="button"
          onClick={onCancel}
          className="px-6 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
        >
          {t("cancel")}
        </button>
        <button
          type="submit"
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          {t("save")}
        </button>
      </div>
    </form>
  );
}
