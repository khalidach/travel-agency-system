// frontend/src/components/booking/RelatedPeopleManager.tsx
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react";
import type { Booking, RelatedPerson } from "../../context/models";

interface RelatedPeopleManagerProps {
  search: string;
  showDropdown: boolean;
  selectedProgram: any;
  availablePeople: Booking[];
  relatedPersons: RelatedPerson[];
  onSearchChange: (value: string) => void;
  onFocus: () => void;
  onBlur: () => void;
  onAddPersons: (persons: Booking[]) => void;
  onRemovePerson: (personId: number) => void;
}

const RelatedPeopleManager = ({
  search,
  showDropdown,
  selectedProgram,
  availablePeople,
  relatedPersons,
  onSearchChange,
  onFocus,
  onBlur,
  onAddPersons,
  onRemovePerson,
}: RelatedPeopleManagerProps) => {
  const { t } = useTranslation();
  const [selectedPeople, setSelectedPeople] = useState<Booking[]>([]);

  const handlePersonSelect = (person: Booking) => {
    setSelectedPeople((prev) =>
      prev.some((p) => p.id === person.id)
        ? prev.filter((p) => p.id !== person.id)
        : [...prev, person]
    );
  };

  const handleAddSelected = () => {
    onAddPersons(selectedPeople);
    setSelectedPeople([]);
  };

  const handleClearSelection = () => {
    setSelectedPeople([]);
  };

  const getFullName = (person: Booking) => {
    return `${person.clientNameFr.firstName} ${person.clientNameFr.lastName}`.trim();
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        {t("relatedPeople")}
      </label>
      <div className="relative">
        <input
          type="text"
          value={search}
          onChange={(e) => {
            onSearchChange(e.target.value);
          }}
          onFocus={onFocus}
          onBlur={onBlur}
          placeholder={
            selectedProgram
              ? (t("searchClientToAdd") as string)
              : (t("selectProgramFirst") as string)
          }
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg disabled:bg-gray-100 dark:disabled:bg-gray-700 disabled:cursor-not-allowed bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          disabled={!selectedProgram}
        />
        {showDropdown && availablePeople.length > 0 && (
          <div className="absolute z-10 w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg mt-1 max-h-60 shadow-lg">
            <ul className="overflow-y-auto max-h-48">
              {availablePeople.map((person) => (
                <li
                  key={person.id}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handlePersonSelect(person);
                  }}
                  className="px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer flex items-center text-gray-900 dark:text-gray-200"
                >
                  <input
                    type="checkbox"
                    checked={selectedPeople.some((p) => p.id === person.id)}
                    readOnly
                    className="mr-2 h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 bg-gray-100 dark:bg-gray-700"
                  />
                  {getFullName(person)} ({person.passportNumber})
                </li>
              ))}
            </ul>
            {selectedPeople.length > 0 && (
              <div className="p-2 border-t dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 flex gap-2">
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={handleAddSelected}
                  className="flex-grow bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Add {selectedPeople.length} person(s)
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={handleClearSelection}
                  className="bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 py-2 px-4 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
                >
                  Clear
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        {(relatedPersons || []).map((person) => (
          <div
            key={person.ID}
            className="flex items-center bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300 text-sm font-medium px-3 py-1 rounded-full"
          >
            <span>{person.clientName}</span>
            <button
              type="button"
              onClick={() => onRemovePerson(person.ID)}
              className="ml-2 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200"
            >
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
export default RelatedPeopleManager;
