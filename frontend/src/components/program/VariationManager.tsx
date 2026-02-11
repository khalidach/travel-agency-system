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
    <div className="space-y-3 bg-muted/20 p-4 rounded-lg border border-border/50">
      <div className="flex items-center justify-between mb-2">
        <label className="block text-sm font-medium text-muted-foreground">
          {t("cities")}
        </label>
        <button
          type="button"
          onClick={() => append({ name: "", nights: 0 })}
          className="inline-flex items-center px-3 py-1.5 text-xs font-medium bg-primary/10 text-primary rounded-md hover:bg-primary/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          disabled={areCitiesLocked}
        >
          <Plus
            className={`w-3.5 h-3.5 ${
              document.documentElement.dir === "rtl" ? "ml-1" : "mr-1"
            }`}
          />
          {t("addCity")}
        </button>
      </div>
      {fields.map((item, cityIndex) => {
        const nameError = errors.variations?.[variationIndex]?.cities?.[
          cityIndex
        ]?.name as FieldError | undefined;

        return (
          <div key={item.id}>
            <div className="flex items-center gap-2">
              <div className="flex-1 relative">
                <MapPin className="w-4 h-4 text-muted-foreground absolute left-3 top-2.5 z-10" />
                <input
                  {...register(
                    `variations.${variationIndex}.cities.${cityIndex}.name`,
                    {
                      required: t("cityNameRequired") as string,
                    },
                  )}
                  placeholder={t("enterCityName") as string}
                  className={`w-full pl-9 pr-3 py-2 border rounded-lg text-sm bg-background text-foreground placeholder:text-muted-foreground focus:ring-1 focus:ring-primary focus:border-primary transition-colors disabled:bg-muted disabled:text-muted-foreground ${
                    nameError ? "border-destructive" : "border-input"
                  }`}
                  disabled={areCitiesLocked}
                />
              </div>
              <div className="w-24">
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
                  className="w-full px-3 py-2 border border-input rounded-lg text-sm bg-background text-foreground placeholder:text-muted-foreground focus:ring-1 focus:ring-primary focus:border-primary transition-colors text-center"
                  min="0"
                />
              </div>
              {fields.length > 1 && (
                <button
                  type="button"
                  onClick={() => remove(cityIndex)}
                  className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors disabled:opacity-50"
                  disabled={areCitiesLocked}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
            {nameError && (
              <p className="text-destructive text-xs mt-1 ml-1">
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
    <div className="bg-card rounded-lg border border-border p-6 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <label className="text-lg font-semibold text-foreground">
          {t("programVariations")}
        </label>
        <button
          type="button"
          onClick={handleAddVariation}
          className="inline-flex items-center px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-all shadow-sm"
        >
          <Plus className="w-4 h-4 mr-2" /> {t("addVariation")}
        </button>
      </div>
      <div className="space-y-4">
        {fields.map((item, index) => {
          const variation = watch(`variations.${index}`);
          const duration = (variation.cities || []).reduce(
            (sum: number, city: CityData) => sum + (Number(city.nights) || 0),
            0,
          );

          return (
            <Accordion
              key={item.id}
              title={
                <div className="flex items-center space-x-4">
                  <h4 className="text-base font-medium text-foreground">
                    {watch(`variations.${index}.name`) ||
                      `Variation ${index + 1}`}
                  </h4>
                  <div className="flex items-center px-2.5 py-0.5 rounded-full bg-muted/50 text-xs font-medium text-muted-foreground border border-border">
                    <Clock className="w-3 h-3 mr-1.5" />
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
                    className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
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
                    className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              }
            >
              <div className="space-y-4 pt-2">
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-2">
                    {t("variationName")}
                  </label>
                  <input
                    {...register(`variations.${index}.name`)}
                    placeholder={t("variationNamePlaceholder") as string}
                    className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:ring-1 focus:ring-primary focus:border-primary transition-colors"
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
