// frontend/src/components/program/CityManager.tsx
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
        <label className="block text-sm font-medium text-foreground">
          {t("cities")}
        </label>
        <button
          type="button"
          onClick={() => append({ name: "", nights: 0 })}
          // UPDATED: Added dark:text-white and dark:bg-blue-600
          className="inline-flex items-center px-3 py-1 text-sm bg-primary text-primary-foreground dark:bg-blue-600 dark:text-white rounded-lg hover:bg-primary/90"
        >
          <Plus className={`w-4 h-4 mr-1 `} /> {t("addCity")}
        </button>
      </div>
      <div className="space-y-3">
        {fields.map((item, index) => {
          const nameError =
            Array.isArray(errors.cities) &&
            (errors.cities[index]?.name as FieldError | undefined);

          return (
            <div key={item.id}>
              <div className="flex items-center space-x-2">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                <input
                  {...register(`cities.${index}.name`, {
                    required: t("cityNameRequired") as string,
                  })}
                  placeholder={t("enterCityName") as string}
                  className={`flex-1 px-3 py-2 border rounded-lg text-sm bg-background text-foreground placeholder:text-muted-foreground ${
                    nameError ? "border-destructive" : "border-input"
                  }`}
                />
                <input
                  type="number"
                  {...register(`cities.${index}.nights`, {
                    valueAsNumber: true,
                    min: 0,
                  })}
                  placeholder={t("nights") as string}
                  className="w-24 px-3 py-2 border border-input rounded-lg text-sm bg-background text-foreground placeholder:text-muted-foreground"
                  min="0"
                />
                {fields.length > 1 && (
                  <button
                    type="button"
                    onClick={() => remove(index)}
                    // UPDATED: Red-400 for icon
                    className="p-2 text-destructive dark:text-red-400 hover:bg-destructive/10 dark:hover:bg-red-900/40 rounded-lg"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
              {nameError && (
                <p className="text-destructive text-xs mt-1 ml-6">
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
