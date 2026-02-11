// frontend/src/components/program/PackageManager.tsx
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useFormContext, useFieldArray } from "react-hook-form";
import { Plus, Trash2, Hotel, Users, DollarSign } from "lucide-react";
import type {
  ProgramVariation,
  CityData,
  PriceStructure,
} from "../../context/models";
import { useAuthContext } from "../../context/AuthContext";
import { useDebounce } from "../../hooks/useDebounce";
import Accordion from "../ui/Accordion";

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

const DebouncedHotelInput = ({
  packageIndex,
  city,
  hotelIndex,
}: {
  packageIndex: number;
  city: CityData;
  hotelIndex: number;
}) => {
  const { t } = useTranslation();
  const { getValues, setValue } = useFormContext();
  const fieldName = `packages.${packageIndex}.hotels.${city.name}.${hotelIndex}`;

  const [localValue, setLocalValue] = useState(
    () => getValues(fieldName) || "",
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
        .filter((c: CityData) => c.name.trim());

      prices.forEach((price: PriceStructure, priceIndex: number) => {
        if (
          price.hotelCombination &&
          (price.hotelCombination.includes(oldValue) || oldValue === "")
        ) {
          const combinationParts = price.hotelCombination.split("_");
          const cityIndexToUpdate = allCities.findIndex(
            (c: CityData) => c.name === city.name,
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
      className="flex-1 px-3 py-2 text-sm border border-input rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:ring-1 focus:ring-primary focus:border-primary"
    />
  );
};

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
        self.findIndex((c) => c.name === city.name) === index,
    );

  return (
    <div className="mb-6">
      <h5 className="text-sm font-medium text-muted-foreground mb-3">
        {t("hotelsByCity")}
      </h5>
      <div className="space-y-4">
        {allCities
          .filter((c: CityData) => c.name.trim())
          .map((city: CityData) => (
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
  city: CityData;
}) => {
  const { t } = useTranslation();
  const { control } = useFormContext();
  const { fields, append, remove } = useFieldArray({
    control,
    name: `packages.${packageIndex}.hotels.${city.name}`,
  });

  return (
    <div className="bg-card p-4 rounded-lg border border-border shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-foreground flex items-center">
          <Hotel
            className={`w-4 h-4 ${document.documentElement.dir === "rtl" ? "ml-2" : "mr-2"}`}
          />
          {city.name}
        </span>
        <button
          type="button"
          onClick={() => append("")}
          // UPDATED: Use blue-400 in dark mode for visibility
          className="text-xs text-primary hover:text-primary/80 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
        >
          {t("addHotel")}
        </button>
      </div>
      <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
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
                // UPDATED: Red-400 for icon in dark mode
                className="p-2 text-destructive dark:text-red-400 hover:bg-destructive/10 dark:hover:bg-red-900/40 rounded-lg"
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
      const validCities = (variation.cities || []).filter((city: CityData) =>
        city.name.trim(),
      );
      const generateCombinations = (
        cityIndex: number,
        currentCombination: string[],
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
        <label className="block text-sm font-medium text-foreground">
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
          // UPDATED: Added dark:text-white and dark:bg-blue-600
          className="inline-flex items-center px-3 py-1 text-sm bg-primary text-primary-foreground dark:bg-blue-600 dark:text-white rounded-lg hover:bg-primary/90"
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
                <h4 className="text-lg font-semibold text-foreground">
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
                  // UPDATED: Red-400 for icon
                  className="p-2 text-destructive dark:text-red-400 hover:bg-destructive/10 dark:hover:bg-red-900/40 rounded-lg"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              }
            >
              <div className="mb-6">
                <label className="block text-sm font-medium text-foreground mb-2">
                  {t("packageName")}
                </label>
                <input
                  {...register(`packages.${packageIndex}.name`)}
                  placeholder={t("packageNamePlaceholder") as string}
                  className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:ring-1 focus:ring-primary"
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
          <div className="text-center py-6 bg-muted/30 rounded-lg border-dashed border-2 border-border">
            <p className="text-sm text-muted-foreground">
              {t("noPackagesAdded")}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {t("noPackagesLeadForm")}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

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
    currentPrices.map((field: PriceStructure) => field.hotelCombination),
  );
  const availableRoomTypes = ["ثنائية", "ثلاثية", "رباعية", "خماسية"];

  return (
    <div>
      <h5 className="text-sm font-medium text-muted-foreground mb-3">
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
                className={`px-3 py-1 text-xs rounded-lg border transition-colors ${
                  isAlreadyAdded
                    ? "bg-muted text-muted-foreground cursor-not-allowed border-input"
                    : "bg-background border-input hover:bg-primary/10 hover:text-primary hover:border-primary dark:hover:text-blue-400 dark:hover:border-blue-400"
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
            (price as unknown as PriceStructure).hotelCombination;
          return (
            <div
              key={price.id}
              className="bg-card p-4 rounded-lg border border-border shadow-sm"
            >
              <div className="flex items-center justify-between mb-3">
                <h6 className="text-sm font-medium text-foreground flex items-center">
                  <Users
                    className={`w-4 h-4 ${document.documentElement.dir === "rtl" ? "ml-2" : "mr-2"}`}
                  />
                  {currentCombination?.replace(/_/g, " → ") || ""}
                </h6>
                <button
                  type="button"
                  onClick={() => remove(priceIndex)}
                  // UPDATED: Red-400 for icon
                  className="p-1 text-destructive dark:text-red-400 hover:bg-destructive/10 dark:hover:bg-red-900/40 rounded"
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
  const { state } = useAuthContext();
  const { fields, append, remove } = useFieldArray({
    control,
    name: `packages.${packageIndex}.prices.${priceIndex}.roomTypes`,
  });

  const canManagePrices =
    state.user?.role === "admin" || state.user?.role === "manager";

  return (
    <div className="space-y-3">
      {fields.map((room, roomIndex) => {
        return (
          <div
            key={room.id}
            className={`grid grid-cols-1 md:grid-cols-${
              (isCommissionBased ? 1 : 0) + (canManagePrices ? 1 : 0) + 3
            } gap-3 p-3 bg-muted/50 rounded-lg`}
          >
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                {t("roomType")}
              </label>
              <input
                {...register(
                  `packages.${packageIndex}.prices.${priceIndex}.roomTypes.${roomIndex}.type`,
                )}
                className="w-full px-2 py-1 text-sm border border-input rounded bg-background text-foreground"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                {t("guests")}
              </label>
              <input
                type="number"
                {...register(
                  `packages.${packageIndex}.prices.${priceIndex}.roomTypes.${roomIndex}.guests`,
                  { valueAsNumber: true },
                )}
                className="w-full px-2 py-1 text-sm border border-input rounded bg-background text-foreground"
                min="1"
                required
              />
            </div>

            {canManagePrices && (
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                  {t("sellingPrice")}
                  <span className="text-[10px] text-muted-foreground/80">
                    ({t("minLimit")})
                  </span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    {...register(
                      `packages.${packageIndex}.prices.${priceIndex}.roomTypes.${roomIndex}.sellingPrice`,
                      { valueAsNumber: true },
                    )}
                    placeholder="0.00"
                    className="w-full pl-6 px-2 py-1 text-sm border border-orange-200 dark:border-orange-900/50 rounded bg-orange-50 dark:bg-orange-900/10 text-foreground focus:ring-orange-500 focus:border-orange-500"
                    min="0"
                  />
                  <DollarSign className="w-3 h-3 absolute left-1.5 top-2 text-muted-foreground" />
                </div>
              </div>
            )}

            {isCommissionBased && (
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  {t("purchasePrice")}
                </label>
                <input
                  type="number"
                  {...register(
                    `packages.${packageIndex}.prices.${priceIndex}.roomTypes.${roomIndex}.purchasePrice`,
                    { valueAsNumber: true },
                  )}
                  className="w-full px-2 py-1 text-sm border border-input rounded bg-background text-foreground"
                  min="0"
                />
              </div>
            )}

            <div className="flex items-end">
              <button
                type="button"
                onClick={() => remove(roomIndex)}
                // UPDATED: Red-400 for icon
                className="p-2 text-destructive dark:text-red-400 hover:bg-destructive/10 dark:hover:bg-red-900/40 rounded transition-colors ml-auto"
              >
                <Trash2 className="w-[15px] h-[15px]" />
              </button>
            </div>
          </div>
        );
      })}
      <button
        type="button"
        onClick={() =>
          append({
            type: "Custom",
            guests: 1,
            purchasePrice: 0,
            sellingPrice: 0,
          })
        }
        // UPDATED: Blue-400 for link text
        className="text-xs text-primary hover:text-primary/80 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
      >
        {t("addCustomRoomType")}
      </button>
    </div>
  );
};
