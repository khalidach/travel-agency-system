// frontend/src/components/owner/LimitsModal.tsx
import React, { useState, useEffect } from "react";
import Modal from "../Modal";
import { User, TierLimits } from "../../context/models";

interface LimitsModalProps {
  user: User | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (userId: number, limits: Partial<TierLimits>) => void;
}

const LimitsModal: React.FC<LimitsModalProps> = ({
  user,
  isOpen,
  onClose,
  onSave,
}) => {
  const [limits, setLimits] = useState<Partial<TierLimits>>({});

  useEffect(() => {
    if (user) {
      // Use custom limits if they exist, otherwise fall back to tier limits
      setLimits(user.limits || user.tierLimits || {});
    }
  }, [user]);

  if (!isOpen || !user) return null;

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    let processedValue: string | number | boolean = value;

    if (type === "number") {
      // Store empty string for empty input, otherwise store a number
      processedValue = value === "" ? "" : Number(value);
    } else if (name === "invoicing" || name === "dailyServices") {
      // Convert string from select to boolean, or keep as empty string for default
      if (value === "true") {
        processedValue = true;
      } else if (value === "false") {
        processedValue = false;
      }
    }

    setLimits((prev) => ({ ...prev, [name]: processedValue }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Filter out empty string values, which represent an unset custom limit.
    const finalLimits = Object.fromEntries(
      Object.entries(limits).filter(([, value]) => String(value) !== "")
    );
    onSave(user.id, finalLimits);
  };

  const limitFields: (keyof Omit<TierLimits, "invoicing" | "dailyServices">)[] =
    [
      "bookingsPerMonth",
      "programsPerMonth",
      "programPricingsPerMonth",
      "employees",
      "facturesPerMonth",
      "dailyServicesPerMonth",
    ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Manage Limits for ${user.username}`}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-sm text-gray-500">
          Set custom limits for this user. Leave a field blank to use the
          default limit from their tier (Tier {user.tierId}). Use -1 for
          unlimited.
        </p>

        {limitFields.map((field) => (
          <div key={field}>
            <label className="block text-sm font-medium text-gray-700 capitalize">
              {field.replace(/([A-Z])/g, " $1").trim()}
            </label>
            <input
              type="number"
              name={field}
              value={(limits[field] as number | "") ?? ""}
              onChange={handleChange}
              placeholder={`Default: ${user.tierLimits?.[field] ?? "N/A"}`}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg mt-1"
            />
          </div>
        ))}

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Invoicing Access
          </label>
          <select
            name="invoicing"
            value={String(limits.invoicing ?? "")}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg mt-1"
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
          <label className="block text-sm font-medium text-gray-700">
            Daily Services Access
          </label>
          <select
            name="dailyServices"
            value={String(limits.dailyServices ?? "")}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg mt-1"
          >
            <option value="">
              Use Tier Default (
              {user.tierLimits?.dailyServices ? "Enabled" : "Disabled"})
            </option>
            <option value="true">Enabled</option>
            <option value="false">Disabled</option>
          </select>
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 rounded-lg"
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
