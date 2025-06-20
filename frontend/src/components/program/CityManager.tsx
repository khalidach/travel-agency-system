import React from "react";
import { useTranslation } from "react-i18next";
import { useFormContext, useFieldArray } from "react-hook-form";
import { Plus, Trash2, MapPin } from "lucide-react";

export default function CityManager() {
  const { t } = useTranslation();
  const { control, register } = useFormContext();

  const { fields, append, remove } = useFieldArray({
    control,
    name: "cities",
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <label className="block text-sm font-medium text-gray-700">
          {t("cities")}
        </label>
        <button
          type="button"
          onClick={() => append({ name: "", nights: 1 })}
          className="inline-flex items-center px-3 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4 mr-1" /> Add City
        </button>
      </div>
      <div className="space-y-2">
        {fields.map((item, index) => (
          <div key={item.id} className="flex items-center space-x-2">
            <MapPin className="w-4 h-4 text-gray-400" />
            <input
              {...register(`cities.${index}.name`, { required: true })}
              placeholder="Enter city name"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
            />
            <input
              type="number"
              {...register(`cities.${index}.nights`, {
                valueAsNumber: true,
                min: 1,
              })}
              placeholder="Nights"
              className="w-24 px-3 py-2 border border-gray-300 rounded-lg"
              min="1"
              required
            />
            {fields.length > 1 && (
              <button
                type="button"
                onClick={() => remove(index)}
                className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
