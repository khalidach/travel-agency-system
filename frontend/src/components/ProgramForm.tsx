// frontend/src/components/ProgramForm.tsx
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useForm, FormProvider } from "react-hook-form";
import type {
  Program,
  ProgramVariation,
  CityData,
  Package,
} from "../context/models";

import PackageManager from "./program/PackageManager";
import LoadingSpinner from "./ui/LoadingSpinner";
import VariationManager from "./program/VariationManager";

interface ProgramFormProps {
  program?: Program | null;
  onSave: (program: Program) => void;
  onCancel: () => void;
  isSaving: boolean;
}

export default function ProgramForm({
  program,
  onSave,
  onCancel,
  isSaving,
}: ProgramFormProps) {
  const { t } = useTranslation();

  const methods = useForm<Program>({
    defaultValues: program
      ? program
      : ({
          name: "",
          type: "Umrah",
          isCommissionBased: false,
          maxBookings: null,
          variations: [
            {
              name: t("defaultVariation") as string,
              duration: 0,
              cities: [{ name: "", nights: 0 }],
            },
          ],
          packages: [] as Package[],
        } as unknown as Program),
  });

  const {
    handleSubmit,
    watch,
    reset,
    setValue,
    getValues,
    formState: { errors },
  } = methods;

  const isCommissionBased = watch("isCommissionBased");
  const maxBookings = watch("maxBookings");

  useEffect(() => {
    const subscription = watch((_, { name }) => {
      if (name && name.startsWith("variations.0.cities")) {
        const variations = getValues("variations") || [];
        const firstVariationCities = getValues("variations.0.cities") || [];
        const cityIndexMatch = name.match(/variations\.0\.cities\.(\d+)\.name/);

        if (cityIndexMatch) {
          const changedCityIndex = parseInt(cityIndexMatch[1], 10);
          const newCityName = firstVariationCities[changedCityIndex]?.name;

          variations.forEach((_: ProgramVariation, varIndex: number) => {
            if (varIndex > 0) {
              const currentCityName = getValues(
                `variations.${varIndex}.cities.${changedCityIndex}.name`,
              );
              if (currentCityName !== newCityName) {
                setValue(
                  `variations.${varIndex}.cities.${changedCityIndex}.name`,
                  newCityName,
                );
              }
            }
          });
        }
      }

      if (name && name.includes(".cities.")) {
        const variations = getValues("variations") || [];
        variations.forEach((variation: ProgramVariation, index: number) => {
          const cities = variation.cities || [];
          const totalDuration = cities.reduce(
            (sum: number, city: CityData) => sum + (Number(city.nights) || 0),
            0,
          );

          if (getValues(`variations.${index}.duration`) !== totalDuration) {
            setValue(`variations.${index}.duration`, totalDuration, {
              shouldDirty: true,
            });
          }
        });
      }
    });
    return () => subscription.unsubscribe();
  }, [watch, setValue, getValues]);

  useEffect(() => {
    if (program) {
      reset(program);
    }
  }, [program, reset]);

  const onSubmit = (data: Program) => {
    const cleanedData = JSON.parse(JSON.stringify(data));
    onSave(cleanedData);
  };

  return (
    <FormProvider {...methods}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              {t("programName")}
            </label>
            <input
              type="text"
              {...methods.register("name", {
                required: t("programNameRequired") as string,
              })}
              className={`w-full px-3 py-2 border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:border-transparent ${
                errors.name ? "border-destructive" : "border-input"
              }`}
            />
            {errors.name && (
              <p className="text-destructive text-xs mt-1">
                {errors.name.message}
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              {t("programType")}
            </label>
            <select
              {...methods.register("type")}
              className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground focus:ring-2 focus:ring-ring focus:border-transparent"
            >
              <option value="Hajj">Hajj</option>
              <option value="Umrah">Umrah</option>
              <option value="Tourism">Tourism</option>
              <option value="Ramadan">Ramadan</option>
            </select>
          </div>

          {/* Max Bookings Toggle */}
          <div className="md:col-span-1">
            <label className="block text-sm font-medium text-foreground mb-2">
              {t("maxBookingsLabel")}
            </label>
            <div className="flex items-center space-x-3">
              <input
                type="number"
                {...methods.register("maxBookings", {
                  valueAsNumber: true,
                  min: 0,
                })}
                value={maxBookings === null ? "" : maxBookings}
                onChange={(e) => {
                  const value =
                    e.target.value === "" ? null : Number(e.target.value);
                  setValue("maxBookings", value);
                }}
                placeholder={t("unlimitedPlaceholder") as string}
                className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground placeholder:text-muted-foreground disabled:opacity-50 disabled:cursor-not-allowed focus:ring-2 focus:ring-ring focus:border-transparent"
                disabled={maxBookings === null}
              />
              <label className="flex items-center cursor-pointer">
                <span className="text-sm font-medium text-foreground mr-2">
                  {t("unlimitedLabel")}
                </span>
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={maxBookings === null}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setValue("maxBookings", null);
                      } else {
                        setValue("maxBookings", 0);
                      }
                    }}
                    className="sr-only toggle-checkbox"
                  />
                  {/* UPDATED: Lighter gray in dark mode (gray-500) for better visibility */}
                  <div
                    className={`block w-14 h-8 rounded-full transition-colors ${
                      maxBookings === null
                        ? "bg-primary"
                        : "bg-gray-300 dark:bg-gray-500"
                    }`}
                  ></div>
                  <div
                    className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform ${
                      maxBookings === null ? "translate-x-6" : ""
                    }`}
                  ></div>
                </div>
              </label>
            </div>
            {maxBookings !== null &&
              maxBookings !== undefined &&
              maxBookings < 0 && (
                <p className="text-destructive text-xs mt-1">
                  {t("positiveNumberRequired")}
                </p>
              )}
            {maxBookings === null && (
              <p className="text-xs text-muted-foreground mt-1">
                {t("unlimitedSetText")}
              </p>
            )}
          </div>
        </div>

        {/* Commission Based Toggle */}
        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border border-border">
          <label
            htmlFor="isCommissionBased"
            className="font-medium text-foreground"
          >
            {t("commissionBasedProgram")}
            <p className="text-xs text-muted-foreground font-normal">
              {t("commissionBasedProgramDesc")}
            </p>
          </label>
          <div className="relative inline-block w-10 mr-2 align-middle select-none transition duration-200 ease-in">
            <input
              type="checkbox"
              id="isCommissionBased"
              {...methods.register("isCommissionBased")}
              className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer"
            />
            {/* UPDATED: Lighter gray in dark mode (gray-500) */}
            <label
              htmlFor="isCommissionBased"
              className="toggle-label block overflow-hidden h-6 rounded-full bg-gray-300 dark:bg-gray-500 cursor-pointer"
            ></label>
          </div>
        </div>

        {/* Helper style for this specific toggle if not in global css */}
        <style>{`
            .toggle-checkbox:checked { right: 0; border-color: hsl(var(--primary)); }
            .toggle-checkbox:checked + .toggle-label { background-color: hsl(var(--primary)); }
        `}</style>

        <VariationManager />

        <PackageManager isCommissionBased={isCommissionBased ?? false} />

        <div className="flex justify-end space-x-3 pt-6 border-t border-border">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSaving}
            className="px-6 py-2 text-secondary-foreground bg-secondary rounded-lg hover:bg-secondary/80 disabled:opacity-50"
          >
            {t("cancel")}
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed min-w-[100px]"
          >
            {isSaving ? (
              <LoadingSpinner className="text-primary-foreground" />
            ) : (
              t("save")
            )}
          </button>
        </div>
      </form>
    </FormProvider>
  );
}
