import React from "react";
import { useTranslation } from "react-i18next";
import { Plus, Trash2, Hotel, Users } from "lucide-react";
import type { Package, CityData, RoomPrice } from "../../context/models";

// Helper functions can be kept here or moved to a utils file
function getGuestsForType(type: string): number {
  switch (type.toLowerCase()) {
    case "double":
      return 2;
    case "triple":
      return 3;
    case "quad":
      return 4;
    case "quintuple":
      return 5;
    default:
      return 1;
  }
}

function isDefaultRoomType(type: string): boolean {
  return ["Double", "Triple", "Quad", "Quintuple"].includes(type);
}

// Props definition for the component
interface PackageManagerProps {
  packages: Package[];
  cities: CityData[];
  availableRoomTypes: string[];
  onAddPackage: () => void;
  onRemovePackage: (packageIndex: number) => void;
  onUpdatePackageName: (packageIndex: number, name: string) => void;
  onAddHotelToCity: (packageIndex: number, cityName: string) => void;
  onUpdateHotel: (
    packageIndex: number,
    city: string,
    hotelIndex: number,
    hotelName: string
  ) => void;
  onRemoveHotel: (
    packageIndex: number,
    city: string,
    hotelIndex: number
  ) => void;
  onAddPricingForOption: (packageIndex: number, hotelOption: string) => void;
  onRemovePriceStructure: (packageIndex: number, priceIndex: number) => void;
  onUpdateRoomDefinition: (
    packageIndex: number,
    priceIndex: number,
    roomIndex: number,
    field: keyof RoomPrice,
    value: string | number
  ) => void;
  onAddRoomType: (packageIndex: number, priceIndex: number) => void;
  onRemoveRoomType: (
    packageIndex: number,
    priceIndex: number,
    roomIndex: number
  ) => void;
}

export default function PackageManager({
  packages,
  cities,
  availableRoomTypes,
  onAddPackage,
  onRemovePackage,
  onUpdatePackageName,
  onAddHotelToCity,
  onUpdateHotel,
  onRemoveHotel,
  onAddPricingForOption,
  onRemovePriceStructure,
  onUpdateRoomDefinition,
  onAddRoomType,
  onRemoveRoomType,
}: PackageManagerProps) {
  const { t } = useTranslation();

  const generateAllHotelOptions = (packageIndex: number) => {
    const pkg = packages[packageIndex];
    const validCities = cities.filter((city) => city.name.trim());
    const options: string[] = [];

    const generateCombinations = (
      cityIndex: number,
      currentCombination: string[]
    ) => {
      if (cityIndex === validCities.length) {
        if (currentCombination.length > 0) {
          options.push(currentCombination.join("_"));
        }
        return;
      }

      const cityHotels = pkg.hotels[validCities[cityIndex].name] || [];
      if (cityHotels.length === 0 || cityHotels.every((h) => !h.trim())) {
        generateCombinations(cityIndex + 1, currentCombination);
        return;
      }

      cityHotels.forEach((hotel) => {
        if (hotel.trim()) {
          generateCombinations(cityIndex + 1, [...currentCombination, hotel]);
        }
      });
    };

    if (validCities.length > 0) {
      generateCombinations(0, []);
    }
    return options;
  };

  const formatHotelDisplay = (hotelOption: string) =>
    hotelOption.replace(/_/g, " → ");

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <label className="block text-sm font-medium text-gray-700">
          Packages
        </label>
        <button
          type="button"
          onClick={onAddPackage}
          className="inline-flex items-center px-3 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4 mr-1" /> Add Package
        </button>
      </div>
      <div className="space-y-6">
        {packages.map((pkg, packageIndex) => (
          <div
            key={packageIndex}
            className="border border-gray-200 rounded-xl p-6 bg-gray-50"
          >
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-semibold text-gray-900">
                Package {packageIndex + 1}
              </h4>
              {packages.length > 1 && (
                <button
                  type="button"
                  onClick={() => onRemovePackage(packageIndex)}
                  className="p-2 text-red-500 hover:bg-red-100 rounded-lg"
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
                  onUpdatePackageName(packageIndex, e.target.value)
                }
                placeholder="e.g., Standard, Premium"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                required
              />
            </div>

            <div className="mb-6">
              <h5 className="text-sm font-medium text-gray-700 mb-3">
                Hotels by City
              </h5>
              <div className="space-y-4">
                {cities
                  .filter((c) => c.name.trim())
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
                            onAddHotelToCity(packageIndex, city.name)
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
                                  onUpdateHotel(
                                    packageIndex,
                                    city.name,
                                    hotelIndex,
                                    e.target.value
                                  )
                                }
                                placeholder="Hotel name"
                                className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg"
                              />
                              <button
                                type="button"
                                onClick={() =>
                                  onRemoveHotel(
                                    packageIndex,
                                    city.name,
                                    hotelIndex
                                  )
                                }
                                className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
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

            <div>
              <h5 className="text-sm font-medium text-gray-700 mb-3">
                Hotel Combinations & Room Definitions
              </h5>
              <div className="mb-4">
                <div className="flex flex-wrap gap-2">
                  {generateAllHotelOptions(packageIndex).map((hotelOption) => (
                    <button
                      key={hotelOption}
                      type="button"
                      onClick={() =>
                        onAddPricingForOption(packageIndex, hotelOption)
                      }
                      className="px-3 py-1 text-xs rounded-lg border bg-gray-100 text-gray-700 border-gray-200 hover:bg-blue-50 hover:text-blue-700"
                    >
                      + {formatHotelDisplay(hotelOption)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                {pkg.prices.map((priceStructure, priceIndex) => (
                  <div
                    key={priceIndex}
                    className="bg-white p-4 rounded-lg border border-gray-200"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h6 className="text-sm font-medium text-gray-900 flex items-center">
                        <Users className="w-4 h-4 mr-2" />
                        {formatHotelDisplay(priceStructure.hotelCombination)}
                      </h6>
                      <button
                        type="button"
                        onClick={() =>
                          onRemovePriceStructure(packageIndex, priceIndex)
                        }
                        className="p-1 text-red-500 hover:bg-red-50 rounded"
                      >
                        <Trash2 className="w-[16px] h-[16px]" />
                      </button>
                    </div>
                    <div className="space-y-3">
                      {priceStructure.roomTypes.map((roomDef, roomIndex) => (
                        <div
                          key={roomIndex}
                          className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3 bg-gray-50 rounded-lg"
                        >
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              Room Type
                            </label>
                            {isDefaultRoomType(roomDef.type) ? (
                              <select
                                value={roomDef.type}
                                onChange={(e) =>
                                  onUpdateRoomDefinition(
                                    packageIndex,
                                    priceIndex,
                                    roomIndex,
                                    "type",
                                    e.target.value
                                  )
                                }
                                className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                              >
                                {availableRoomTypes.map((type) => (
                                  <option key={type} value={type}>
                                    {type}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <input
                                type="text"
                                value={roomDef.type}
                                onChange={(e) =>
                                  onUpdateRoomDefinition(
                                    packageIndex,
                                    priceIndex,
                                    roomIndex,
                                    "type",
                                    e.target.value
                                  )
                                }
                                className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                              />
                            )}
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              Number of Guests
                            </label>
                            <input
                              type="number"
                              value={roomDef.guests}
                              onChange={(e) =>
                                onUpdateRoomDefinition(
                                  packageIndex,
                                  priceIndex,
                                  roomIndex,
                                  "guests",
                                  parseInt(e.target.value, 10)
                                )
                              }
                              className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                              min="1"
                              required
                              disabled={isDefaultRoomType(roomDef.type)}
                            />
                          </div>
                          <div className="flex items-end">
                            <button
                              type="button"
                              onClick={() =>
                                onRemoveRoomType(
                                  packageIndex,
                                  priceIndex,
                                  roomIndex
                                )
                              }
                              className="p-2 text-red-500 hover:bg-red-100 rounded transition-colors ml-auto"
                            >
                              <Trash2 className="w-[15px] h-[15px]" />
                            </button>
                          </div>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => onAddRoomType(packageIndex, priceIndex)}
                        className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                      >
                        + Add Custom Room Type
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
  );
}
