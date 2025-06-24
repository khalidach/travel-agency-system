import React, { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useForm, FormProvider } from "react-hook-form";
import type { Program, CityData } from "../context/models";

// Import the refactored child components
import CityManager from "./program/CityManager";
import PackageManager from "./program/PackageManager";

// Form props remain the same
interface ProgramFormProps {
  program?: Program | null;
  onSave: (program: Program) => void;
  onCancel: () => void;
}

export default function ProgramForm({
  program,
  onSave,
  onCancel,
}: ProgramFormProps) {
  const { t } = useTranslation();

  // The methods object now contains all the react-hook-form functions
  const methods = useForm<Program>({
    defaultValues: program
      ? program
      : {
          name: "",
          type: "Umrah",
          duration: 1,
          cities: [{ name: "", nights: 1 }],
          packages: [{ name: "Standard", hotels: {}, prices: [] }],
        },
  });

  // We only need these functions here
  const { handleSubmit, watch, reset, setValue } = methods;

  // Watch for changes in cities to auto-calculate duration.
  // Using a subscription to watch() is the most reliable way to catch
  // changes in field arrays and trigger side effects.
  useEffect(() => {
    const subscription = watch((value, { name }) => {
      // We check if the changed field is part of the 'cities' array.
      // This is more efficient than recalculating on every single form change.
      if (name && (name === "cities" || name.startsWith("cities."))) {
        const cities = value.cities || [];
        // The type of 'city' is inferred by TypeScript from the form's state.
        // Explicitly typing it as 'CityData' can cause a mismatch because the form
        // state might be a partial representation of the full type.
        const totalDuration = cities
          .filter((city): city is CityData => city != null) // Type guard
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
    onSave(data);
  };

  return (
    // FormProvider passes all methods down to nested components
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
                required: "Program name is required",
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
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
            {t("duration")} (days)
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
            className="px-6 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            {t("cancel")}
          </button>
          <button
            type="submit"
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            {t("save")}
          </button>
        </div>
      </form>
    </FormProvider>
  );
}
