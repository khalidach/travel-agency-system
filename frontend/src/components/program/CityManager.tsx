import React from "react";
import { useTranslation } from "react-i18next";
import { Plus, Trash2, MapPin } from "lucide-react";

interface City {
  name: string;
  nights: number;
}

interface CityManagerProps {
  cities: City[];
  onAddCity: () => void;
  onUpdateCity: (
    index: number,
    field: keyof City,
    value: string | number
  ) => void;
  onRemoveCity: (index: number) => void;
}

export default function CityManager({
  cities,
  onAddCity,
  onUpdateCity,
  onRemoveCity,
}: CityManagerProps) {
  const { t } = useTranslation();

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <label className="block text-sm font-medium text-gray-700">
          {t("cities")}
        </label>
        <button
          type="button"
          onClick={onAddCity}
          className="inline-flex items-center px-3 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4 mr-1" /> Add City
        </button>
      </div>
      <div className="space-y-2">
        {cities.map((city, index) => (
          <div key={index} className="flex items-center space-x-2">
            <MapPin className="w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={city.name}
              onChange={(e) => onUpdateCity(index, "name", e.target.value)}
              placeholder="Enter city name"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
              required
            />
            <input
              type="number"
              value={city.nights}
              onChange={(e) =>
                onUpdateCity(index, "nights", parseInt(e.target.value, 10))
              }
              placeholder="Nights"
              className="w-24 px-3 py-2 border border-gray-300 rounded-lg"
              min="1"
              required
            />
            {cities.length > 1 && (
              <button
                type="button"
                onClick={() => onRemoveCity(index)}
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
