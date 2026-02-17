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
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Main Details Card */}
        <div className="bg-card rounded-lg border border-border p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-foreground mb-4">
            {t("programDetails")}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">
                {t("programName")}
              </label>
              <input
                type="text"
                {...methods.register("name", {
                  required: t("programNameRequired") as string,
                })}
                className={`w-full px-3 py-2 border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors ${
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
              <label className="block text-sm font-medium text-muted-foreground mb-2">
                {t("programType")}
              </label>
              <select
                {...methods.register("type")}
                className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
              >
                <option value="Hajj">Hajj</option>
                <option value="Umrah">Umrah</option>
                <option value="Tourism">Tourism</option>
                <option value="Ramadan">Ramadan</option>
              </select>
            </div>

            {/* Max Bookings */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-muted-foreground mb-2">
                {t("maxBookingsLabel")}
              </label>
              <div className="flex items-start md:items-center flex-col md:flex-row gap-4">
                <div className="flex-1 w-full md:w-auto">
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
                    className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground placeholder:text-muted-foreground disabled:opacity-50 disabled:cursor-not-allowed focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                    disabled={maxBookings === null}
                  />
                </div>

                <label className="flex items-center cursor-pointer select-none bg-muted/50 px-4 py-2 rounded-lg border border-border">
                  <span className="text-sm font-medium text-foreground mr-3">
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
                    <div
                      className={`block w-10 h-6 rounded-full transition-colors duration-200 ${
                        maxBookings === null ? "bg-primary" : "bg-input"
                      }`}
                    ></div>
                    <div
                      className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform duration-200 ${
                        maxBookings === null
                          ? "translate-x-4 rtl:-translate-x-4"
                          : ""
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
            </div>
          </div>
        </div>

        {/* Commission Toggle Card */}
        <div className="bg-card rounded-lg border border-border p-4 shadow-sm flex items-center justify-between">
          <label
            htmlFor="isCommissionBased"
            className="font-medium text-foreground cursor-pointer flex-1"
          >
            {t("commissionBasedProgram")}
            <p className="text-xs text-muted-foreground font-normal mt-0.5">
              {t("commissionBasedProgramDesc")}
            </p>
          </label>

          <label className="flex items-center cursor-pointer">
            <div className="relative">
              <input
                type="checkbox"
                id="isCommissionBased"
                {...methods.register("isCommissionBased")}
                className="sr-only"
              />

              {/* Track */}
              <div
                className={`block w-10 h-6 rounded-full transition-colors duration-200 ${
                  isCommissionBased ? "bg-primary" : "bg-input"
                }`}
              ></div>

              {/* Thumb */}
              <div
                className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform duration-200 ${
                  isCommissionBased ? "translate-x-4 rtl:-translate-x-4" : ""
                }`}
              ></div>
            </div>
          </label>
        </div>

        <VariationManager />

        <PackageManager isCommissionBased={isCommissionBased ?? false} />

        {/* Footer Actions */}
        <div className="flex justify-end space-x-3 pt-6 border-t border-border mt-8">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSaving}
            className="px-6 py-2 text-sm font-medium text-foreground bg-muted hover:bg-muted/80 rounded-lg transition-colors disabled:opacity-50"
          >
            {t("cancel")}
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="px-6 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed min-w-[100px] transition-colors shadow-sm"
          >
            {isSaving ? (
              <LoadingSpinner className="text-primary-foreground w-4 h-4" />
            ) : (
              t("save")
            )}
          </button>
        </div>
      </form>
    </FormProvider>
  );
}
