// frontend/src/components/ProgramForm.tsx
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useForm, FormProvider } from "react-hook-form";
// Added CityData to imports
import type { Program, ProgramVariation, CityData } from "../context/models";

// Import the refactored child components
import PackageManager from "./program/PackageManager";
import LoadingSpinner from "./ui/LoadingSpinner";
import VariationManager from "./program/VariationManager";

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
          isCommissionBased: false,
          maxBookings: null, // NEW: Default to null (unlimited)
          variations: [
            {
              name: "Default Variation",
              duration: 0,
              cities: [{ name: "", nights: 0 }],
            },
          ],
          packages: [],
        },
  });

  // We only need these functions here
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

  // Watch for changes in cities to auto-calculate duration for each variation.
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

      // Only run the calculation if a city's name or nights changed to prevent infinite loops.
      if (name && name.includes(".cities.")) {
        const variations = getValues("variations") || [];
        variations.forEach((variation: ProgramVariation, index: number) => {
          const cities = variation.cities || [];
          const totalDuration = cities.reduce(
            // Replaced 'any' with 'CityData'
            (sum: number, city: CityData) => sum + (Number(city.nights) || 0),
            0,
          );

          // Only update the value if it has actually changed.
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

  // Reset form when the program prop changes
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
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-8 dark:bg-gray-800"
      >
        <div className="grid  grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t("programName")}
            </label>
            <input
              type="text"
              {...methods.register("name", {
                required: t("programNameRequired") as string,
              })}
              className={`w-full px-3 py-2 border rounded-lg ${
                errors.name
                  ? "border-red-500"
                  : "border-gray-300 dark:border-gray-600"
              } bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100`}
            />
            {errors.name && (
              <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t("programType")}
            </label>
            <select
              {...methods.register("type")}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              <option value="Hajj">Hajj</option>
              <option value="Umrah">Umrah</option>
              <option value="Tourism">Tourism</option>
              <option value="Ramadan">Ramadan</option>
            </select>
          </div>
          {/* NEW: Max Bookings Toggle and Input */}
          <div className="md:col-span-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              عدد المقاعد القصوى (الحجوزات)
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
                placeholder={t("Unlimited") as string}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                disabled={maxBookings === null} // Disabled if set to null (unlimited)
              />
              <label className="flex items-center cursor-pointer">
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100 mr-2">
                  غير محدود
                </span>
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={maxBookings === null}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setValue("maxBookings", null); // Set to null for unlimited
                      } else {
                        setValue("maxBookings", 0); // Set to 0 to enable input (user can change to desired number)
                      }
                    }}
                    className="sr-only toggle-checkbox"
                  />
                  <div
                    className={`block w-14 h-8 rounded-full ${
                      maxBookings === null
                        ? "bg-green-500"
                        : "bg-gray-300 dark:bg-gray-600"
                    }`}
                  ></div>
                  <div
                    className={`dot absolute left-1 top-1 bg-white dark:bg-gray-300 w-6 h-6 rounded-full transition-transform ${
                      maxBookings === null ? "translate-x-6" : ""
                    }`}
                  ></div>
                </div>
              </label>
            </div>
            {maxBookings !== null &&
              maxBookings !== undefined &&
              maxBookings < 0 && (
                <p className="text-red-500 text-xs mt-1">
                  يجب أن يكون العدد موجباً.
                </p>
              )}
            {maxBookings === null && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                (محدد كحجوزات غير محدودة)
              </p>
            )}
          </div>
          {/* End of NEW: Max Bookings Toggle and Input */}
        </div>

        {/* Commission Based Toggle */}
        <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
          <label
            htmlFor="isCommissionBased"
            className="font-medium text-gray-700 dark:text-gray-200"
          >
            {t("commissionBasedProgram")}
            <p className="text-xs text-gray-500 dark:text-gray-400 font-normal">
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
            <label
              htmlFor="isCommissionBased"
              className="toggle-label block overflow-hidden h-6 rounded-full bg-gray-300 dark:bg-gray-600 cursor-pointer"
            ></label>
          </div>
        </div>
        <style>{`
            .toggle-checkbox:checked { right: 0; border-color: #2563eb; }
            .toggle-checkbox:checked + .toggle-label { background-color: #2563eb; }
        `}</style>

        <VariationManager />

        <PackageManager isCommissionBased={isCommissionBased ?? false} />

        <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSaving}
            className="px-6 py-2 text-gray-700 bg-gray-100 dark:bg-gray-600 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-500 disabled:opacity-50"
          >
            {t("cancel")}
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center disabled:bg-blue-400 dark:disabled:bg-blue-800 disabled:cursor-not-allowed min-w-[100px]"
          >
            {isSaving ? <LoadingSpinner /> : t("save")}
          </button>
        </div>
      </form>
    </FormProvider>
  );
}
