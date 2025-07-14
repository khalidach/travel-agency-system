// frontend/src/components/ProgramForm.tsx
import React, { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useForm, FormProvider } from "react-hook-form";
import type { Program, CityData, Package } from "../context/models";

// Import the refactored child components
import CityManager from "./program/CityManager";
import PackageManager from "./program/PackageManager";
import LoadingSpinner from "./ui/LoadingSpinner";

// Form props with isSaving
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

  // The methods object now contains all the react-hook-form functions
  const methods = useForm<Program>({
    defaultValues: program
      ? program
      : {
          name: "",
          type: "Umrah",
          duration: 0,
          cities: [{ name: "", nights: 0 }],
          packages: [],
        },
  });

  // We only need these functions here
  const {
    handleSubmit,
    watch,
    reset,
    setValue,
    formState: { errors },
  } = methods;

  // Watch for changes in cities to auto-calculate duration.
  useEffect(() => {
    const subscription = watch((value, { name }) => {
      if (name && (name === "cities" || name.startsWith("cities."))) {
        const cities = value.cities || [];
        const totalDuration = cities
          .filter((city): city is CityData => city != null)
          .reduce((sum: number, city) => sum + (Number(city.nights) || 0), 0);
        setValue("duration", totalDuration);
      }
    });
    return () => subscription.unsubscribe();
  }, [watch, setValue]);

  // Reset form when the program prop changes
  useEffect(() => {
    if (program) {
      reset(program);
    }
  }, [program, reset]);

  const onSubmit = (data: Program) => {
    const cleanedData = JSON.parse(JSON.stringify(data));
    const validCityNames = new Set(
      data.cities.map((c) => c.name).filter(Boolean)
    );

    cleanedData.packages = cleanedData.packages.map((pkg: Package) => {
      const newHotels: { [key: string]: string[] } = {};
      for (const cityName in pkg.hotels) {
        if (validCityNames.has(cityName)) {
          newHotels[cityName] = pkg.hotels[cityName];
        }
      }
      validCityNames.forEach((cityName) => {
        if (!newHotels[cityName]) {
          newHotels[cityName] = [];
        }
      });
      return { ...pkg, hotels: newHotels };
    });

    onSave(cleanedData);
  };

  return (
    <FormProvider {...methods}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t("programName")}
            </label>
            <input
              type="text"
              {...methods.register("name", {
                required: t("programNameRequired") as string,
              })}
              className={`w-full px-3 py-2 border rounded-lg ${
                errors.name ? "border-red-500" : "border-gray-300"
              }`}
            />
            {errors.name && (
              <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t("programType")}
            </label>
            <select
              {...methods.register("type")}
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
            {t("duration")} {t("daysParentheses")}
          </label>
          <input
            type="number"
            {...methods.register("duration")}
            readOnly
            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100"
          />
        </div>

        <CityManager />

        <PackageManager />

        <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSaving}
            className="px-6 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50"
          >
            {t("cancel")}
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center disabled:bg-blue-400 disabled:cursor-not-allowed min-w-[100px]"
          >
            {isSaving ? <LoadingSpinner /> : t("save")}
          </button>
        </div>
      </form>
    </FormProvider>
  );
}
