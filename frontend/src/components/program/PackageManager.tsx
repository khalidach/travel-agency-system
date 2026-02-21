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
      className="flex-1 px-3 py-2 text-sm border border-input rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:ring-1 focus:ring-primary focus:border-primary transition-colors"
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
    <div className="mb-8 p-4 bg-muted/20 rounded-lg border border-border/50">
      <h5 className="text-sm font-semibold text-foreground mb-4 flex items-center">
        <Hotel className="w-4 h-4 mr-2" />
        {t("hotelsByCity")}
      </h5>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
    <div className="bg-background p-4 rounded-lg border border-border">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-muted-foreground flex items-center">
          {city.name}
        </span>
        <button
          type="button"
          onClick={() => append("")}
          className="text-xs font-medium text-primary hover:text-primary/80 transition-colors bg-primary/10 px-2 py-1 rounded"
        >
          {t("addHotel")}
        </button>
      </div>
      <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
        {fields.map((field, hotelIndex) => {
          return (
            <div key={field.id} className="flex items-center gap-2">
              <DebouncedHotelInput
                packageIndex={packageIndex}
                city={city}
                hotelIndex={hotelIndex}
              />
              <button
                type="button"
                onClick={() => remove(hotelIndex)}
                className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
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
    <div className="bg-card rounded-lg border border-border p-6 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <label className="text-lg font-semibold text-foreground">
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
          className="inline-flex items-center px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-all shadow-sm"
        >
          <Plus className="w-4 h-4 mr-2" /> {t("addPackage")}
        </button>
      </div>
      <div className="space-y-4">
        {packageFields.length > 0 ? (
          packageFields.map((pkg, packageIndex) => (
            <Accordion
              key={pkg.id}
              title={
                <h4 className="text-base font-medium text-foreground">
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
                  className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              }
            >
              <div className="space-y-6 pt-2">
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-2">
                    {t("packageName")}
                  </label>
                  <input
                    {...register(`packages.${packageIndex}.name`)}
                    placeholder={t("packageNamePlaceholder") as string}
                    className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:ring-1 focus:ring-primary focus:border-primary transition-colors"
                    required
                  />
                </div>

                <PackageHotels packageIndex={packageIndex} />

                <PriceStructureManager
                  packageIndex={packageIndex}
                  generateAllHotelOptions={generateAllHotelOptions}
                  isCommissionBased={isCommissionBased}
                />
              </div>
            </Accordion>
          ))
        ) : (
          <div className="text-center py-12 bg-muted/20 rounded-lg border-dashed border-2 border-border/60">
            <p className="text-base font-medium text-foreground">
              {t("noPackagesAdded")}
            </p>
            <p className="text-sm text-muted-foreground mt-2">
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
  const { control, watch, getValues } = useFormContext();
  const {
    fields: priceFields,
    append,
    remove,
  } = useFieldArray({
    control,
    name: `packages.${packageIndex}.prices`,
  });

  const currentPrices = watch(`packages.${packageIndex}.prices`, []);

  const availableRoomTypes = ["ثنائية", "ثلاثية", "رباعية", "خماسية"];

  // Auto-generate hotel combinations when hotel names change
  const hotelsData = watch(`packages.${packageIndex}.hotels`);
  const hotelsJson = JSON.stringify(hotelsData || {});

  useEffect(() => {
    const options = generateAllHotelOptions(packageIndex);
    const prices: PriceStructure[] =
      getValues(`packages.${packageIndex}.prices`) || [];
    const existingCombos = prices.map(
      (p: PriceStructure) => p.hotelCombination,
    );

    // Add new combinations that don't exist yet
    const newCombos = options.filter(
      (opt) => !existingCombos.includes(opt),
    );
    newCombos.forEach((combo) => {
      append(
        {
          hotelCombination: combo,
          roomTypes: availableRoomTypes.map((type) => ({
            type,
            guests: getGuestsForType(type),
            purchasePrice: 0,
          })),
        },
        { shouldFocus: false },
      );
    });

    // Remove combinations whose hotels no longer exist or are empty
    const indicesToRemove: number[] = [];
    prices.forEach((price: PriceStructure, idx: number) => {
      if (
        !price.hotelCombination ||
        !options.includes(price.hotelCombination)
      ) {
        indicesToRemove.push(idx);
      }
    });
    // Remove in reverse order to preserve indices
    indicesToRemove.reverse().forEach((idx) => {
      remove(idx);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hotelsJson, packageIndex]);

  return (
    <div>
      <h5 className="text-sm font-semibold text-foreground mb-4">
        {t("hotelCombinationsTitle")}
      </h5>
      <div className="space-y-4">
        {priceFields.map((price, priceIndex) => {
          const currentCombination =
            currentPrices[priceIndex]?.hotelCombination ||
            (price as unknown as PriceStructure).hotelCombination;
          return (
            <div
              key={price.id}
              className="bg-background p-4 rounded-lg border border-border shadow-sm group"
            >
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-border/50">
                <h6 className="text-sm font-semibold text-foreground flex items-center">
                  <Users className={`w-4 h-4 text-primary mr-2 `} />
                  {currentCombination?.replace(/_/g, " → ") || ""}
                </h6>
                <button
                  type="button"
                  onClick={() => remove(priceIndex)}
                  className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors opacity-100 md:opacity-0 group-hover:opacity-100"
                >
                  <Trash2 className="w-4 h-4" />
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
            className={`grid grid-cols-1 md:grid-cols-${(isCommissionBased ? 1 : 0) + (canManagePrices ? 1 : 0) + 3
              } gap-4 p-4 bg-muted/20 rounded-lg border border-border/50 items-end`}
          >
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                {t("roomType")}
              </label>
              <input
                {...register(
                  `packages.${packageIndex}.prices.${priceIndex}.roomTypes.${roomIndex}.type`,
                )}
                className="w-full px-3 py-2 text-sm border border-input rounded-md bg-background text-foreground focus:ring-1 focus:ring-primary focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                {t("guests")}
              </label>
              <input
                type="number"
                {...register(
                  `packages.${packageIndex}.prices.${priceIndex}.roomTypes.${roomIndex}.guests`,
                  { valueAsNumber: true },
                )}
                className="w-full px-3 py-2 text-sm border border-input rounded-md bg-background text-foreground focus:ring-1 focus:ring-primary focus:border-primary"
                min="1"
                required
              />
            </div>

            {canManagePrices && (
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1">
                  {t("sellingPrice")}
                  <span className="text-[10px] opacity-70">
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
                    // UPDATED: Used semantic variables for "money" fields
                    className="w-full pl-7 px-3 py-2 text-sm border border-input rounded-md bg-background text-foreground focus:ring-1 focus:ring-green-500 focus:border-green-500 font-medium"
                    min="0"
                  />
                  <DollarSign className="w-3.5 h-3.5 absolute left-2 top-2.5 text-muted-foreground" />
                </div>
              </div>
            )}

            {isCommissionBased && (
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                  {t("purchasePrice")}
                </label>
                <input
                  type="number"
                  {...register(
                    `packages.${packageIndex}.prices.${priceIndex}.roomTypes.${roomIndex}.purchasePrice`,
                    { valueAsNumber: true },
                  )}
                  className="w-full px-3 py-2 text-sm border border-input rounded-md bg-background text-foreground focus:ring-1 focus:ring-primary focus:border-primary"
                  min="0"
                />
              </div>
            )}

            <div className="flex justify-end pb-0.5">
              <button
                type="button"
                onClick={() => remove(roomIndex)}
                className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                title={t("delete") as string}
              >
                <Trash2 className="w-4 h-4" />
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
        className="text-xs font-medium text-primary hover:text-primary/80 transition-colors flex items-center mt-2 px-1"
      >
        <Plus className="w-3 h-3 mr-1" />
        {t("addCustomRoomType")}
      </button>
    </div>
  );
};
