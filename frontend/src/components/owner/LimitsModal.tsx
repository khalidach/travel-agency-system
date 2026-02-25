// frontend/src/components/owner/LimitsModal.tsx
import React, { useState, useEffect } from "react";
import Modal from "../Modal";
import { User, TierLimits } from "../../context/models";
import NumberInput from "../ui/NumberInput";

interface LimitsModalProps {
  user: User | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (userId: number, limits: Partial<TierLimits>) => void;
}

// Define a more accurate type for the form's state, allowing for empty strings for number fields
type LimitsFormState = {
  [K in keyof TierLimits]?: TierLimits[K] | "";
};

const LimitsModal: React.FC<LimitsModalProps> = ({
  user,
  isOpen,
  onClose,
  onSave,
}) => {
  const [limits, setLimits] = useState<LimitsFormState>({});

  useEffect(() => {
    if (user) {
      // Initialize the form state with ONLY the user's custom limits.
      // If user.limits is null or undefined, start with an empty object.
      setLimits(user.limits || {});
    }
  }, [user]);

  if (!isOpen || !user) return null;

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    const isBooleanField = [
      "invoicing",
      "dailyServices",
      "flightListExport",
      "programCosts",
      "profitReport",
      "employeeAnalysis",
    ].includes(name);

    let processedValue: string | number | boolean | undefined;

    if (isBooleanField) {
      if (value === "true") {
        processedValue = true;
      } else if (value === "false") {
        processedValue = false;
      } else {
        // An empty string from the select means "unset this override"
        processedValue = undefined;
      }
    } else {
      // For number inputs, store an empty string or a number
      processedValue = value === "" ? "" : Number(value);
    }

    setLimits((prev) => ({ ...prev, [name]: processedValue }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const finalLimits: Partial<TierLimits> = {};
    const booleanKeys = [
      "invoicing",
      "dailyServices",
      "flightListExport",
      "programCosts",
      "profitReport",
      "employeeAnalysis",
    ] as const;

    // Iterate over the keys of the state object in a type-safe way
    (Object.keys(limits) as Array<keyof TierLimits>).forEach((key) => {
      const value = limits[key];

      // Filter out any keys that have been unset (value is undefined or an empty string)
      if (value !== undefined && value !== "") {
        // Check if the key corresponds to a boolean field
        if ((booleanKeys as readonly string[]).includes(key)) {
          const boolKey = key as (typeof booleanKeys)[number];
          finalLimits[boolKey] = value as boolean;
        } else {
          // If not boolean, it must be a number field
          const numKey = key as Exclude<
            keyof TierLimits,
            (typeof booleanKeys)[number]
          >;
          finalLimits[numKey] = value as number;
        }
      }
    });

    onSave(user.id, finalLimits);
  };

  const limitFields: (keyof Omit<
    TierLimits,
    | "invoicing"
    | "dailyServices"
    | "flightListExport"
    | "programCosts"
    | "profitReport"
    | "employeeAnalysis"
  >)[] = [
      "bookingsPerMonth",
      "programsPerMonth",
      "programPricingsPerMonth",
      "employees",
      "facturesPerMonth",
      "dailyServicesPerMonth",
      "bookingExcelExportsPerMonth",
      "listExcelExportsPerMonth",
    ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Manage Limits for ${user.username}`}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Set custom limits for this user. Leave a field blank to use the
          default limit from their tier (Tier {user.tierId}). Use -1 for
          unlimited.
        </p>

        {limitFields.map((field) => (
          <div key={field}>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 capitalize">
              {field.replace(/([A-Z])/g, " $1").trim()}
            </label>
            <NumberInput
              name={field}
              // Use `?? ''` to prevent React's uncontrolled/controlled component warning
              value={limits[field] ?? ""}
              onChange={handleChange}
              placeholder={`Default: ${user.tierLimits?.[field] ?? "N/A"}`}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg mt-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>
        ))}

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Program Costs Access
          </label>
          <select
            name="programCosts"
            value={
              limits.programCosts === undefined
                ? ""
                : String(limits.programCosts)
            }
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg mt-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          >
            <option value="">
              Use Tier Default (
              {user.tierLimits?.programCosts ? "Enabled" : "Disabled"})
            </option>
            <option value="true">Enabled</option>
            <option value="false">Disabled</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Invoicing Access
          </label>
          <select
            name="invoicing"
            // Use `?? ''` to handle undefined (default) case
            value={
              limits.invoicing === undefined ? "" : String(limits.invoicing)
            }
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg mt-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          >
            <option value="">
              Use Tier Default (
              {user.tierLimits?.invoicing ? "Enabled" : "Disabled"})
            </option>
            <option value="true">Enabled</option>
            <option value="false">Disabled</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Daily Services Access
          </label>
          <select
            name="dailyServices"
            value={
              limits.dailyServices === undefined
                ? ""
                : String(limits.dailyServices)
            }
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg mt-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          >
            <option value="">
              Use Tier Default (
              {user.tierLimits?.dailyServices ? "Enabled" : "Disabled"})
            </option>
            <option value="true">Enabled</option>
            <option value="false">Disabled</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Flight List Export
          </label>
          <select
            name="flightListExport"
            value={
              limits.flightListExport === undefined
                ? ""
                : String(limits.flightListExport)
            }
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg mt-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          >
            <option value="">
              Use Tier Default (
              {user.tierLimits?.flightListExport ? "Enabled" : "Disabled"})
            </option>
            <option value="true">Enabled</option>
            <option value="false">Disabled</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Profit Report Access
          </label>
          <select
            name="profitReport"
            value={
              limits.profitReport === undefined
                ? ""
                : String(limits.profitReport)
            }
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg mt-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          >
            <option value="">
              Use Tier Default (
              {user.tierLimits?.profitReport ? "Enabled" : "Disabled"})
            </option>
            <option value="true">Enabled</option>
            <option value="false">Disabled</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Employee Analysis Access
          </label>
          <select
            name="employeeAnalysis"
            value={
              limits.employeeAnalysis === undefined
                ? ""
                : String(limits.employeeAnalysis)
            }
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg mt-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          >
            <option value="">
              Use Tier Default (
              {user.tierLimits?.employeeAnalysis ? "Enabled" : "Disabled"})
            </option>
            <option value="true">Enabled</option>
            <option value="false">Disabled</option>
          </select>
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg"
          >
            Save Limits
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default LimitsModal;
