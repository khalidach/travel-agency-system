import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Trash2, MapPin, Hotel, DollarSign } from "lucide-react";
import type { Program, Package, PriceStructure, RoomPrice } from "../context/AppContext";

interface ProgramFormProps {
  program?: Program | null;
  onSave: (program: Program) => void;
  onCancel: () => void;
}

interface CityData {
  name: string;
  nights: number;
}

interface FormData {
  name: string;
  type: "Hajj" | "Umrah" | "Tourism";
  duration: number;
  cities: CityData[];
  packages: Package[];
}

// Helper function to standardize room type casing
function standardizeRoomType(type: string): string {
    if (!type) return "Double"; // Default if type is somehow missing
    const lowerType = type.toLowerCase();
    switch (lowerType) {
      case "double":
        return "Double";
      case "triple":
        return "Triple";
      case "quad":
        return "Quad";
      case "quintuple":
        return "Quintuple";
      default:
        // If it's an unknown type, default to Double but log a warning
        console.warn(`Unknown room type "${type}" encountered. Defaulting to Double.`);
        return "Double";
    }
}


export default function ProgramForm({
  program,
  onSave,
  onCancel,
}: ProgramFormProps) {
  const { t } = useTranslation();

  const [formData, setFormData] = useState<FormData>({
    name: "",
    type: "Umrah",
    duration: 0,
    cities: [{ name: "", nights: 1 }],
    packages: [
      {
        name: "Standard",
        hotels: {},
        prices: [],
      },
    ],
  });

  const [availableRoomTypes] = useState([
    "Double",
    "Triple",
    "Quad",
    "Quintuple",
  ]);

  useEffect(() => {
    if (program) {
      // When loading a program, standardize the room types within its packages
      const standardizedPackages = program.packages.map(pkg => ({
        ...pkg,
        prices: pkg.prices.map(price => ({
          ...price,
          roomTypes: price.roomTypes.map(rt => ({
            ...rt,
            type: standardizeRoomType(rt.type),
          }))
        }))
      }));

      setFormData({
        name: program.name,
        type: program.type,
        duration: program.duration,
        cities: program.cities,
        packages: standardizedPackages,
      });
    }
  }, [program]);

    const updateDuration = (cities: CityData[]) => {
        const totalDuration = cities.reduce((sum, city) => sum + Number(city.nights || 0), 0);
        setFormData(prev => ({...prev, duration: totalDuration, cities}));
    }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const programData = program ? { ...formData, id: program.id } : formData;
    onSave(programData as Program);
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
        {
          name: `Package ${prev.packages.length + 1}`,
          hotels: {},
          prices: [],
        },
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

  const generateAllHotelOptions = (packageIndex: number) => {
    const pkg = formData.packages[packageIndex];
    const cities = formData.cities.filter((city) => city.name.trim());
    const options: string[] = [];

    const generateCombinations = (cityIndex: number, currentCombination: string[]) => {
      if (cityIndex === cities.length) {
        if (currentCombination.length > 0) {
          options.push(currentCombination.join('_'));
        }
        return;
      }

      const cityHotels = pkg.hotels[cities[cityIndex].name] || [];
      if (cityHotels.length === 0) {
        generateCombinations(cityIndex + 1, currentCombination);
        return;
      }
      
      cityHotels.forEach(hotel => {
        if (hotel.trim()) {
          generateCombinations(cityIndex + 1, [...currentCombination, hotel]);
        }
      });
    };
    
    if (cities.length > 0) {
        generateCombinations(0, []);
    } else {
        // Handle single city case differently if needed, though the recursive approach covers it.
    }

    return options;
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
                  sellingPrice: 0,
            }));

            return {
              ...pkg,
              prices: [
                ...pkg.prices,
                {
                  hotelCombination: hotelOption,
                  roomTypes: defaultRoomTypes,
                },
              ],
            };
          }
        }
        return pkg;
      }),
    }));
  };

  const updateRoomPrice = (
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
                return {
                  ...price,
                  roomTypes: price.roomTypes.map((room, rIdx) => {
                    if (rIdx === roomIndex) {
                      return { ...room, [field]: value };
                    }
                    return room;
                  }),
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
                    { type: "Double", sellingPrice: 0 },
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

  const formatHotelDisplay = (hotelOption: string) => {
    return hotelOption.replace(/_/g, " → ");
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Basic Information */}
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
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
          min="1"
          required
        />
      </div>

      {/* Cities */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="block text-sm font-medium text-gray-700">
            {t("cities")}
          </label>
          <button
            type="button"
            onClick={addCity}
            className="inline-flex items-center px-3 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4 mr-1" />
            Add City
          </button>
        </div>
        <div className="space-y-2">
          {formData.cities.map((city, index) => (
            <div key={index} className="flex items-center space-x-2">
              <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <input
                type="text"
                value={city.name}
                onChange={(e) => updateCity(index, "name", e.target.value)}
                placeholder="Enter city name"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
              <input
                type="number"
                value={city.nights}
                onChange={(e) =>
                  updateCity(index, "nights", parseInt(e.target.value, 10))
                }
                placeholder="Nights"
                className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                min="1"
                required
              />
              {formData.cities.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeCity(index)}
                  className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Packages */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <label className="block text-sm font-medium text-gray-700">
            Packages
          </label>
          <button
            type="button"
            onClick={addPackage}
            className="inline-flex items-center px-3 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4 mr-1" />
            Add Package
          </button>
        </div>

        <div className="space-y-6">
          {formData.packages.map((pkg, packageIndex) => (
            <div
              key={packageIndex}
              className="border border-gray-200 rounded-xl p-6 bg-gray-50"
            >
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-semibold text-gray-900">
                Package {packageIndex + 1}
                </h4>
                {formData.packages.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removePackage(packageIndex)}
                    className="p-2 text-red-500 hover:bg-red-100 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Package Name
                </label>
                <input
                  type="text"
                  value={pkg.name}
                  onChange={(e) =>
                    updatePackageName(packageIndex, e.target.value)
                  }
                  placeholder="e.g., Standard, Premium, VIP"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              {/* Hotels by City */}
              <div className="mb-6">
                <h5 className="text-sm font-medium text-gray-700 mb-3">
                  Hotels by City
                </h5>
                <div className="space-y-4">
                  {formData.cities
                    .filter((city) => city.name.trim())
                    .map((city) => (
                      <div
                        key={city.name}
                        className="bg-white p-4 rounded-lg border border-gray-200"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-sm font-medium text-gray-700 flex items-center">
                            <Hotel className="w-4 h-4 mr-2" />
                            {city.name}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              addHotelToCity(packageIndex, city.name)
                            }
                            className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                          >
                            + Add Hotel
                          </button>
                        </div>
                        <div className="space-y-2">
                          {(pkg.hotels[city.name] || []).map(
                            (hotel, hotelIndex) => (
                              <div
                                key={hotelIndex}
                                className="flex items-center space-x-2"
                              >
                                <input
                                  type="text"
                                  value={hotel}
                                  onChange={(e) =>
                                    updateHotel(
                                      packageIndex,
                                      city.name,
                                      hotelIndex,
                                      e.target.value
                                    )
                                  }
                                  placeholder="Hotel name"
                                  className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                                <button
                                  type="button"
                                  onClick={() =>
                                    removeHotel(
                                      packageIndex,
                                      city.name,
                                      hotelIndex
                                    )
                                  }
                                  className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                >
                                  <Trash2 className="w-[14px] h-[14px]" />
                                </button>
                              </div>
                            )
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
               {/* Hotel Pricing Options */}
               <div>
                <div className="flex items-center justify-between mb-3">
                  <h5 className="text-sm font-medium text-gray-700">
                    Hotel Pricing
                  </h5>
                </div>

                {/* Available Hotel Options */}
                <div className="mb-4">
                  <div className="flex flex-wrap gap-2">
                    {generateAllHotelOptions(packageIndex).map(
                      (hotelOption) => {
                        const hasPrice = pkg.prices.some(
                          (p) => p.hotelCombination === hotelOption
                        );
                        return (
                          <button
                            key={hotelOption}
                            type="button"
                            onClick={() =>
                              !hasPrice &&
                              addPricingForOption(packageIndex, hotelOption)
                            }
                            className={`px-3 py-1 text-xs rounded-lg border transition-colors ${
                              hasPrice
                                ? "bg-emerald-100 text-emerald-700 border-emerald-200 cursor-default"
                                : "bg-gray-100 text-gray-700 border-gray-200 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200"
                            }`}
                            disabled={hasPrice}
                          >
                            {formatHotelDisplay(hotelOption)} {hasPrice && "✓"}
                          </button>
                        );
                      }
                    )}
                  </div>
                  {generateAllHotelOptions(packageIndex).length === 0 && (
                    <p className="text-sm text-gray-500 italic">
                      Add hotels to cities first to configure pricing
                    </p>
                  )}
                </div>

                {/* Pricing Details */}
                <div className="space-y-4">
                  {pkg.prices.map((priceStructure, priceIndex) => (
                    <div
                      key={priceIndex}
                      className="bg-white p-4 rounded-lg border border-gray-200"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <h6 className="text-sm font-medium text-gray-900 flex items-center">
                          <DollarSign className="w-4 h-4 mr-2" />
                          {formatHotelDisplay(priceStructure.hotelCombination)}
                        </h6>
                        <button
                          type="button"
                          onClick={() =>
                            removePriceStructure(packageIndex, priceIndex)
                          }
                          className="p-1 text-red-500 hover:bg-red-50 rounded transition-colors"
                        >
                          <Trash2 className="w-[16px] h-[16px]" />
                        </button>
                      </div>

                      <div className="space-y-3">
                        {priceStructure.roomTypes.map((roomType, roomIndex) => (
                          <div
                            key={roomIndex}
                            className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3 bg-gray-50 rounded-lg"
                          >
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">
                                Room Type
                              </label>
                              <select
                                value={standardizeRoomType(roomType.type)}
                                onChange={(e) =>
                                  updateRoomPrice(
                                    packageIndex,
                                    priceIndex,
                                    roomIndex,
                                    "type",
                                    e.target.value
                                  )
                                }
                                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                              >
                                {availableRoomTypes.map((type) => (
                                  <option key={type} value={type}>
                                    {type}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">
                                Price (MAD)
                              </label>
                              <input
                                type="number"
                                value={roomType.sellingPrice}
                                onChange={(e) => {
                                  const value = parseFloat(e.target.value) || 0;
                                  updateRoomPrice(
                                    packageIndex,
                                    priceIndex,
                                    roomIndex,
                                    "sellingPrice",
                                    value
                                  );
                                }}
                                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                                min="0"
                                step="0.01"
                                required
                              />
                            </div>
                            <div className="flex items-end">
                              {priceStructure.roomTypes.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    removeRoomType(
                                      packageIndex,
                                      priceIndex,
                                      roomIndex
                                    )
                                  }
                                  className="p-2 text-red-500 hover:bg-red-100 rounded transition-colors ml-auto"
                                >
                                  <Trash2 className="w-[15px] h-[15px]" />
                                </button>
                              )}
                            </div>
                          </div>
                        ))}

                        <button
                          type="button"
                          onClick={() => addRoomType(packageIndex, priceIndex)}
                          className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                        >
                          + Add Room Type
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Form Actions */}
      <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
        <button
          type="button"
          onClick={onCancel}
          className="px-6 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
        >
          {t("cancel")}
        </button>
        <button
          type="submit"
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          {t("save")}
        </button>
      </div>
    </form>
  );
}
