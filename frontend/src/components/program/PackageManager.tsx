// frontend/src/components/program/PackageManager.tsx
import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useFormContext, useFieldArray, FieldError } from "react-hook-form";
import { Plus, Trash2, Hotel, Users, DollarSign } from "lucide-react";
import type {
  Package,
  ProgramVariation,
  RoomPrice,
} from "../../context/models";
import { useDebounce } from "../../hooks/useDebounce";
import Accordion from "../ui/Accordion"; // Import the Accordion component

// Helper function to get number of guests based on room type
function getGuestsForType(type: string): number {
  switch (type.toLowerCase()) {
    case "ثنائية":
      return 2;
    case "ثلاثية":
      return 3;
    case "رباعية":
      return 4;
    case "خماسية":
      return 5;
    default:
      return 1;
  }
}

// Component to handle debounced updates for hotel names without losing focus
const DebouncedHotelInput = ({
  packageIndex,
  city,
  hotelIndex,
}: {
  packageIndex: number;
  city: any;
  hotelIndex: number;
}) => {
  const { t } = useTranslation();
  const { getValues, setValue } = useFormContext();
  const fieldName = `packages.${packageIndex}.hotels.${city.name}.${hotelIndex}`;

  const [localValue, setLocalValue] = useState(
    () => getValues(fieldName) || ""
  );
  const debouncedValue = useDebounce(localValue, 0);
  const lastUpdatedValueRef = useRef(getValues(fieldName));

  useEffect(() => {
    const oldValue = lastUpdatedValueRef.current;
    const newValue = debouncedValue;

    if (newValue !== undefined && newValue !== oldValue) {
      setValue(fieldName, newValue, { shouldDirty: true });

      const allPackages = getValues("packages");
      const prices = allPackages[packageIndex]?.prices || [];
      const variations: ProgramVariation[] = getValues("variations") || [];
      const allCities = variations
        .flatMap((v) => v.cities)
        .filter((c: any) => c.name.trim());

      prices.forEach((price: any, priceIndex: number) => {
        if (
          price.hotelCombination &&
          (price.hotelCombination.includes(oldValue) || oldValue === "")
        ) {
          const combinationParts = price.hotelCombination.split("_");

          const cityIndexToUpdate = allCities.findIndex(
            (c: any) => c.name === city.name
          );

          if (
            cityIndexToUpdate !== -1 &&
            combinationParts[cityIndexToUpdate] === oldValue
          ) {
            combinationParts[cityIndexToUpdate] = newValue;
            const updatedCombination = combinationParts.join("_");

            const combinationFieldName = `packages.${packageIndex}.prices.${priceIndex}.hotelCombination`;
            setValue(combinationFieldName, updatedCombination, {
              shouldDirty: true,
            });
          }
        }
      });

      lastUpdatedValueRef.current = newValue;
    }
  }, [debouncedValue, fieldName, packageIndex, getValues, setValue, city.name]);

  return (
    <input
      value={localValue}
      onChange={(e) => setLocalValue(e.target.value)}
      placeholder={t("hotelNamePlaceholder") as string}
      className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg"
    />
  );
};

// Sub-component for managing hotels within a package
const PackageHotels = ({ packageIndex }: { packageIndex: number }) => {
  const { t } = useTranslation();
  const { watch } = useFormContext();
  const variations: ProgramVariation[] = watch("variations");

  const allCities = (variations || [])
    .flatMap((v) => v.cities)
    .filter(
      (city, index, self) =>
        city &&
        city.name &&
        self.findIndex((c) => c.name === city.name) === index
    );

  return (
    <div className="mb-6">
      <h5 className="text-sm font-medium text-gray-700 mb-3">
        {t("hotelsByCity")}
      </h5>
      <div className="space-y-4">
        {allCities
          .filter((c: any) => c.name.trim())
          .map((city: any) => (
            <HotelManager
              key={city.name}
              packageIndex={packageIndex}
              city={city}
            />
          ))}
      </div>
    </div>
  );
};

const HotelManager = ({
  packageIndex,
  city,
}: {
  packageIndex: number;
  city: any;
}) => {
  const { t } = useTranslation();
  const { control } = useFormContext();
  const { fields, append, remove } = useFieldArray({
    control,
    name: `packages.${packageIndex}.hotels.${city.name}`,
  });

  return (
    <div className="bg-white p-4 rounded-lg border border-gray-200">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-gray-700 flex items-center">
          <Hotel
            className={`w-4 h-4 ${
              document.documentElement.dir === "rtl" ? "ml-2" : "mr-2"
            }`}
          />
          {city.name}
        </span>
        <button
          type="button"
          onClick={() => append("")}
          className="text-xs text-blue-600 hover:text-blue-700 font-medium"
        >
          {t("addHotel")}
        </button>
      </div>
      <div className="space-y-2">
        {fields.map((field, hotelIndex) => {
          return (
            <div key={field.id} className="flex items-center space-x-2">
              <DebouncedHotelInput
                packageIndex={packageIndex}
                city={city}
                hotelIndex={hotelIndex}
              />
              <button
                type="button"
                onClick={() => remove(hotelIndex)}
                className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
              >
                <Trash2 className="w-[14px] h-[14px]" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Main PackageManager Component
export default function PackageManager({
  isCommissionBased,
}: {
  isCommissionBased: boolean;
}) {
  const { t } = useTranslation();
  const { control, register, watch } = useFormContext();

  const {
    fields: packageFields,
    append: appendPackage,
    remove: removePackage,
  } = useFieldArray({
    control,
    name: "packages",
  });

  const variations: ProgramVariation[] = watch("variations");

  const generateAllHotelOptions = (packageIndex: number) => {
    const pkg = watch(`packages.${packageIndex}`);
    const options: string[] = [];

    if (!variations || variations.length === 0) return options;

    variations.forEach((variation) => {
      const validCities = (variation.cities || []).filter((city: any) =>
        city.name.trim()
      );

      const generateCombinations = (
        cityIndex: number,
        currentCombination: string[]
      ) => {
        if (cityIndex === validCities.length) {
          if (currentCombination.length > 0) {
            const combinationString = currentCombination.join("_");
            if (!options.includes(combinationString)) {
              options.push(combinationString);
            }
          }
          return;
        }

        const cityHotels =
          (pkg.hotels && pkg.hotels[validCities[cityIndex].name]) || [];
        if (
          cityHotels.length === 0 ||
          cityHotels.every((h: string) => !h.trim())
        ) {
          generateCombinations(cityIndex + 1, currentCombination);
          return;
        }

        cityHotels.forEach((hotel: string) => {
          if (hotel.trim()) {
            generateCombinations(cityIndex + 1, [...currentCombination, hotel]);
          }
        });
      };

      if (validCities.length > 0) {
        generateCombinations(0, []);
      }
    });

    return options;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <label className="block text-sm font-medium text-gray-700">
          {t("packages")}
        </label>
        <button
          type="button"
          onClick={() =>
            appendPackage({
              name: `${t("packageLabel")} ${packageFields.length + 1}`,
              hotels: {},
              prices: [],
            })
          }
          className="inline-flex items-center px-3 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4 mr-1" /> {t("addPackage")}
        </button>
      </div>
      <div className="space-y-4">
        {packageFields.length > 0 ? (
          packageFields.map((pkg, packageIndex) => (
            <Accordion
              key={pkg.id}
              title={
                <h4 className="text-lg font-semibold text-gray-900">
                  {watch(`packages.${packageIndex}.name`) ||
                    `${t("packageLabel")} ${packageIndex + 1}`}
                </h4>
              }
              actions={
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removePackage(packageIndex);
                  }}
                  className="p-2 text-red-500 hover:bg-red-100 rounded-lg"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              }
            >
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t("packageName")}
                </label>
                <input
                  {...register(`packages.${packageIndex}.name`)}
                  placeholder={t("packageNamePlaceholder") as string}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  required
                />
              </div>

              <PackageHotels packageIndex={packageIndex} />

              <PriceStructureManager
                packageIndex={packageIndex}
                generateAllHotelOptions={generateAllHotelOptions}
                isCommissionBased={isCommissionBased}
              />
            </Accordion>
          ))
        ) : (
          <div className="text-center py-6 bg-gray-50 rounded-lg border-dashed border-2 border-gray-300">
            <p className="text-sm text-gray-500">{t("noPackagesAdded")}</p>
            <p className="text-xs text-gray-400 mt-1">
              {t("noPackagesLeadForm")}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// Sub-component for pricing structures
const PriceStructureManager = ({
  packageIndex,
  generateAllHotelOptions,
  isCommissionBased,
}: {
  packageIndex: number;
  generateAllHotelOptions: (idx: number) => string[];
  isCommissionBased: boolean;
}) => {
  const { t } = useTranslation();
  const { control, watch } = useFormContext();
  const {
    fields: priceFields,
    append,
    remove,
  } = useFieldArray({
    control,
    name: `packages.${packageIndex}.prices`,
  });

  const currentPrices = watch(`packages.${packageIndex}.prices`, []);
  const hotelOptions = generateAllHotelOptions(packageIndex);
  const existingCombinations = new Set(
    currentPrices.map((field: any) => field.hotelCombination)
  );
  const availableRoomTypes = ["ثنائية", "ثلاثية", "رباعية", "خماسية"];

  return (
    <div>
      <h5 className="text-sm font-medium text-gray-700 mb-3">
        {t("hotelCombinationsTitle")}
      </h5>
      <div className="mb-4">
        <div className="flex flex-wrap gap-2">
          {hotelOptions.map((hotelOption) => {
            const isAlreadyAdded = existingCombinations.has(hotelOption);
            return (
              <button
                key={hotelOption}
                type="button"
                onClick={() =>
                  append({
                    hotelCombination: hotelOption,
                    roomTypes: availableRoomTypes.map((type) => ({
                      type,
                      guests: getGuestsForType(type),
                      purchasePrice: 0,
                    })),
                  })
                }
                disabled={isAlreadyAdded}
                className={`px-3 py-1 text-xs rounded-lg border  text-gray-700  transition-colors ${
                  isAlreadyAdded
                    ? "bg-gray-200 text-gray-400 cursor-not-allowed border-gray-300"
                    : "bg-gray-100 border-gray-200 hover:bg-blue-50 hover:text-blue-700"
                }`}
              >
                + {hotelOption.replace(/_/g, " → ")}
              </button>
            );
          })}
        </div>
      </div>
      <div className="space-y-4">
        {priceFields.map((price, priceIndex) => {
          const currentCombination =
            currentPrices[priceIndex]?.hotelCombination ||
            (price as any).hotelCombination;
          return (
            <div
              key={price.id}
              className="bg-white p-4 rounded-lg border border-gray-200"
            >
              <div className="flex items-center justify-between mb-3">
                <h6 className="text-sm font-medium text-gray-900 flex items-center">
                  <Users
                    className={`w-4 h-4 ${
                      document.documentElement.dir === "rtl" ? "ml-2" : "mr-2"
                    }`}
                  />
                  {currentCombination?.replace(/_/g, " → ") || ""}
                </h6>
                <button
                  type="button"
                  onClick={() => remove(priceIndex)}
                  className="p-1 text-red-500 hover:bg-red-50 rounded"
                >
                  <Trash2 className="w-[16px] h-[16px]" />
                </button>
              </div>
              <RoomTypeManager
                packageIndex={packageIndex}
                priceIndex={priceIndex}
                isCommissionBased={isCommissionBased}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};

const RoomTypeManager = ({
  packageIndex,
  priceIndex,
  isCommissionBased,
}: {
  packageIndex: number;
  priceIndex: number;
  isCommissionBased: boolean;
}) => {
  const { t } = useTranslation();
  const { control, register } = useFormContext();
  const { fields, append, remove } = useFieldArray({
    control,
    name: `packages.${packageIndex}.prices.${priceIndex}.roomTypes`,
  });

  return (
    <div className="space-y-3">
      {fields.map((room, roomIndex) => {
        return (
          <div
            key={room.id}
            className={`grid grid-cols-1 md:grid-cols-${
              isCommissionBased ? "4" : "3"
            } gap-3 p-3 bg-gray-50 rounded-lg`}
          >
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                {t("roomType")}
              </label>
              <input
                {...register(
                  `packages.${packageIndex}.prices.${priceIndex}.roomTypes.${roomIndex}.type`
                )}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                {t("guests")}
              </label>
              <input
                type="number"
                {...register(
                  `packages.${packageIndex}.prices.${priceIndex}.roomTypes.${roomIndex}.guests`,
                  { valueAsNumber: true }
                )}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                min="1"
                required
              />
            </div>
            {isCommissionBased && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  {t("purchasePrice")}
                </label>
                <input
                  type="number"
                  {...register(
                    `packages.${packageIndex}.prices.${priceIndex}.roomTypes.${roomIndex}.purchasePrice`,
                    { valueAsNumber: true }
                  )}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                  min="0"
                />
              </div>
            )}
            <div className="flex items-end">
              <button
                type="button"
                onClick={() => remove(roomIndex)}
                className="p-2 text-red-500 hover:bg-red-100 rounded transition-colors ml-auto"
              >
                <Trash2 className="w-[15px] h-[15px]" />
              </button>
            </div>
          </div>
        );
      })}
      <button
        type="button"
        onClick={() => append({ type: "Custom", guests: 1, purchasePrice: 0 })}
        className="text-xs text-blue-600 hover:text-blue-700 font-medium"
      >
        {t("addCustomRoomType")}
      </button>
    </div>
  );
};
