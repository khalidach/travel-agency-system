import { useTranslation } from "react-i18next";
import { useFormContext, useFieldArray, FieldError } from "react-hook-form";
import { Plus, Trash2, MapPin } from "lucide-react";

export default function CityManager() {
  const { t } = useTranslation();
  const {
    control,
    register,
    formState: { errors },
  } = useFormContext();

  const { fields, append, remove } = useFieldArray({
    control,
    name: "cities",
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {t("cities")}
        </label>
        <button
          type="button"
          onClick={() => append({ name: "", nights: 0 })}
          className="inline-flex items-center px-3 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus
            className={`w-4 h-4 ${
              document.documentElement.dir === "rtl" ? "ml-1" : "mr-1"
            }`}
          />{" "}
          {t("addCity")}
        </button>
      </div>
      <div className="space-y-3">
        {fields.map((item, index) => {
          // Safely access the error for the specific city name field
          const nameError =
            Array.isArray(errors.cities) &&
            (errors.cities[index]?.name as FieldError | undefined);

          return (
            <div key={item.id}>
              <div className="flex items-center space-x-2">
                <MapPin className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                <input
                  {...register(`cities.${index}.name`, {
                    required: t("cityNameRequired") as string,
                  })}
                  placeholder={t("enterCityName") as string}
                  className={`flex-1 px-3 py-2 border rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${
                    nameError
                      ? "border-red-500"
                      : "border-gray-300 dark:border-gray-600"
                  }`}
                />
                <input
                  type="number"
                  {...register(`cities.${index}.nights`, {
                    valueAsNumber: true,
                    min: 0,
                  })}
                  placeholder={t("nights") as string}
                  className="w-24 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  min="0"
                />
                {fields.length > 1 && (
                  <button
                    type="button"
                    onClick={() => remove(index)}
                    className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
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
    </div>
  );
}
