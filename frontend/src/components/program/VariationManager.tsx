// frontend/src/components/program/VariationManager.tsx
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useFormContext, useFieldArray, FieldError } from "react-hook-form";
import { Plus, Trash2, MapPin, Clock, Copy } from "lucide-react";
import Accordion from "../ui/Accordion";
import { Program, CityData } from "../../context/models";

const CityManager = ({ variationIndex }: { variationIndex: number }) => {
  const { t } = useTranslation();
  const {
    control,
    register,
    formState: { errors },
  } = useFormContext<Program>();

  const { fields, append, remove } = useFieldArray({
    control,
    name: `variations.${variationIndex}.cities`,
  });

  const areCitiesLocked = variationIndex > 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {t("cities")}
        </label>
        <button
          type="button"
          onClick={() => append({ name: "", nights: 0 })}
          className="inline-flex items-center px-3 py-1 text-xs bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-400 dark:disabled:bg-gray-500"
          disabled={areCitiesLocked}
        >
          <Plus
            className={`w-3 h-3 ${
              document.documentElement.dir === "rtl" ? "ml-1" : "mr-1"
            }`}
          />{" "}
          {t("addCity")}
        </button>
      </div>
      {fields.map((item, cityIndex) => {
        const nameError = errors.variations?.[variationIndex]?.cities?.[
          cityIndex
        ]?.name as FieldError | undefined;

        return (
          <div key={item.id}>
            <div className="flex items-center space-x-2">
              <MapPin className="w-4 h-4 text-gray-400 dark:text-gray-500" />
              <input
                {...register(
                  `variations.${variationIndex}.cities.${cityIndex}.name`,
                  {
                    required: t("cityNameRequired") as string,
                  },
                )}
                placeholder={t("enterCityName") as string}
                className={`flex-1 px-3 py-2 border rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${
                  nameError
                    ? "border-red-500"
                    : "border-gray-300 dark:border-gray-600"
                } disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:text-gray-500 dark:disabled:text-gray-400`}
                disabled={areCitiesLocked}
              />
              <input
                type="number"
                {...register(
                  `variations.${variationIndex}.cities.${cityIndex}.nights`,
                  {
                    valueAsNumber: true,
                    min: 0,
                  },
                )}
                placeholder={t("nights") as string}
                className="w-24 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                min="0"
              />
              {fields.length > 1 && (
                <button
                  type="button"
                  onClick={() => remove(cityIndex)}
                  className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg disabled:text-gray-400 dark:disabled:text-gray-500 disabled:hover:bg-transparent"
                  disabled={areCitiesLocked}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
            {nameError && (
              <p className="text-red-500 text-xs mt-1 ml-6">
                {nameError.message as string}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default function VariationManager() {
  const { t } = useTranslation();
  const { control, register, watch, getValues, setValue } =
    useFormContext<Program>();

  const { fields, append, remove } = useFieldArray({
    control,
    name: "variations",
  });

  const firstVariationCities = watch("variations.0.cities");

  useEffect(() => {
    const allVariations = getValues("variations");
    if (!allVariations || allVariations.length <= 1) {
      return;
    }

    const firstCities = firstVariationCities || [];

    for (let i = 1; i < allVariations.length; i++) {
      const currentCities = getValues(`variations.${i}.cities`) || [];
      const updatedCities = firstCities.map((firstCity, index) => ({
        name: firstCity.name,
        nights:
          currentCities[index] &&
          typeof currentCities[index].nights === "number"
            ? currentCities[index].nights
            : 0,
      }));

      if (JSON.stringify(currentCities) !== JSON.stringify(updatedCities)) {
        setValue(`variations.${i}.cities`, updatedCities);
      }
    }
  }, [firstVariationCities, fields.length, getValues, setValue]);

  const handleAddVariation = () => {
    const currentVariations = getValues("variations");
    const firstVariation =
      currentVariations && currentVariations.length > 0
        ? currentVariations[0]
        : null;

    if (firstVariation) {
      const newVariation = {
        name: `Variation ${fields.length + 1}`,
        duration: 0,
        cities: JSON.parse(JSON.stringify(firstVariation.cities)),
      };
      // Fixed: Specified type instead of any
      newVariation.cities.forEach((city: CityData) => (city.nights = 0));
      append(newVariation);
    } else {
      append({
        name: `Variation ${fields.length + 1}`,
        duration: 0,
        cities: [{ name: "", nights: 0 }],
      });
    }
  };

  const handleDuplicateVariation = (index: number) => {
    const variations = getValues("variations");
    const variationToDuplicate = variations[index];
    if (variationToDuplicate) {
      const newVariation = JSON.parse(JSON.stringify(variationToDuplicate));
      newVariation.name = `${newVariation.name} (Copy)`;
      append(newVariation);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {t("programVariations")}
        </label>
        <button
          type="button"
          onClick={handleAddVariation}
          className="inline-flex items-center px-3 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4 mr-1" /> {t("addVariation")}
        </button>
      </div>
      <div className="space-y-4">
        {fields.map((item, index) => {
          const variation = watch(`variations.${index}`);
          const duration = (variation.cities || []).reduce(
            // Fixed: Specified type instead of any
            (sum: number, city: CityData) => sum + (Number(city.nights) || 0),
            0,
          );

          return (
            <Accordion
              key={item.id}
              title={
                <div className="flex items-center space-x-4">
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    {watch(`variations.${index}.name`) ||
                      `Variation ${index + 1}`}
                  </h4>
                  <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                    <Clock className="w-4 h-4 mr-1.5" />
                    <span>
                      {duration} {t("days")}
                    </span>
                  </div>
                </div>
              }
              actions={
                <div className="flex items-center space-x-1">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDuplicateVariation(index);
                    }}
                    className="p-2 text-blue-500 hover:bg-blue-100 dark:hover:bg-blue-900/20 rounded-lg"
                    title={t("duplicateVariation") as string}
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      remove(index);
                    }}
                    className="p-2 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/20 rounded-lg"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              }
            >
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t("variationName")}
                  </label>
                  <input
                    {...register(`variations.${index}.name`)}
                    placeholder={t("variationNamePlaceholder") as string}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    required
                  />
                </div>
                <CityManager variationIndex={index} />
              </div>
            </Accordion>
          );
        })}
      </div>
    </div>
  );
}
