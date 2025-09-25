// frontend/src/pages/Tiers.tsx
import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Edit2, Trash2 } from "lucide-react";
import Modal from "../components/Modal";
import ConfirmationModal from "../components/modals/ConfirmationModal";
import * as api from "../services/api";
import { toast } from "react-hot-toast";
import type { Tier, TierLimits } from "../context/models";

const TierForm = ({
  tier,
  tiers, // Receive the list of all tiers
  onSave,
  onCancel,
}: {
  tier?: Tier | null;
  tiers: Tier[]; // Add prop for all tiers
  onSave: (data: Partial<Tier>) => void;
  onCancel: () => void;
}) => {
  const [formData, setFormData] = useState<Partial<Tier>>({
    name: tier?.name || "",
    limits: tier?.limits || {
      bookingsPerMonth: 0,
      programsPerMonth: 0,
      programPricingsPerMonth: 0,
      programCosts: false,
      employees: 0,
      invoicing: false,
      facturesPerMonth: 0,
      dailyServicesPerMonth: 0,
      dailyServices: false,
      bookingExcelExportsPerMonth: 0,
      listExcelExportsPerMonth: 0,
      flightListExport: false,
      profitReport: false,
      employeeAnalysis: false,
    },
  });

  useEffect(() => {
    setFormData({
      name: tier?.name || "",
      limits: tier?.limits || {
        bookingsPerMonth: 0,
        programsPerMonth: 0,
        programPricingsPerMonth: 0,
        programCosts: false,
        employees: 0,
        invoicing: false,
        facturesPerMonth: 0,
        dailyServicesPerMonth: 0,
        dailyServices: false,
        bookingExcelExportsPerMonth: 0,
        listExcelExportsPerMonth: 0,
        flightListExport: false,
        profitReport: false,
        employeeAnalysis: false,
      },
    });
  }, [tier]);

  const handleLimitChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    let processedValue: string | number | boolean = value;

    if (type === "number") {
      processedValue = value === "" ? 0 : Number(value);
    } else if (
      [
        "invoicing",
        "dailyServices",
        "flightListExport",
        "programCosts",
        "profitReport",
        "employeeAnalysis",
      ].includes(name)
    ) {
      processedValue = value === "true";
    }

    setFormData((prev) => ({
      ...prev,
      limits: { ...(prev.limits as TierLimits), [name]: processedValue },
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = formData.name?.trim();
    if (!trimmedName) {
      toast.error("Tier name is required.");
      return;
    }

    const isNameDuplicate = tiers.some(
      (existingTier) =>
        existingTier.name.toLowerCase() === trimmedName.toLowerCase() &&
        existingTier.id !== tier?.id
    );

    if (isNameDuplicate) {
      toast.error(`A tier with the name "${trimmedName}" already exists.`);
      return;
    }

    onSave({ ...formData, name: trimmedName });
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
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Set the limits for this tier. Use -1 for unlimited.
      </p>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Tier Name
        </label>
        <input
          type="text"
          value={formData.name || ""}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg mt-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          required
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {limitFields.map((field) => (
          <div key={field}>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 capitalize">
              {field.replace(/([A-Z])/g, " $1").trim()}
            </label>
            <input
              type="number"
              name={field}
              value={(formData.limits as TierLimits)?.[field] ?? 0}
              onChange={handleLimitChange}
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
            value={String(
              (formData.limits as TierLimits)?.programCosts ?? false
            )}
            onChange={handleLimitChange}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg mt-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          >
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
            value={String((formData.limits as TierLimits)?.invoicing ?? false)}
            onChange={handleLimitChange}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg mt-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          >
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
            value={String(
              (formData.limits as TierLimits)?.dailyServices ?? false
            )}
            onChange={handleLimitChange}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg mt-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          >
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
            value={String(
              (formData.limits as TierLimits)?.flightListExport ?? false
            )}
            onChange={handleLimitChange}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg mt-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          >
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
            value={String(
              (formData.limits as TierLimits)?.profitReport ?? false
            )}
            onChange={handleLimitChange}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg mt-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          >
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
            value={String(
              (formData.limits as TierLimits)?.employeeAnalysis ?? false
            )}
            onChange={handleLimitChange}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg mt-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          >
            <option value="true">Enabled</option>
            <option value="false">Disabled</option>
          </select>
        </div>
      </div>
      <div className="flex justify-end space-x-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 bg-gray-100 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg"
        >
          Save Tier
        </button>
      </div>
    </form>
  );
};

export default function TiersPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTier, setEditingTier] = useState<Tier | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [tierToDelete, setTierToDelete] = useState<number | null>(null);

  const { data: tiers = [], isLoading } = useQuery<Tier[]>({
    queryKey: ["tiers"],
    queryFn: api.getTiers,
  });

  const { mutate: createTier } = useMutation({
    mutationFn: (data: Partial<Tier>) => api.createTier(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tiers"] });
      toast.success("Tier created successfully!");
      setIsModalOpen(false);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create tier.");
    },
  });

  const { mutate: updateTier } = useMutation({
    mutationFn: (data: Tier) => api.updateTier(data.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tiers"] });
      toast.success("Tier updated successfully!");
      setIsModalOpen(false);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const { mutate: deleteTier } = useMutation({
    mutationFn: (id: number) => api.deleteTier(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tiers"] });
      toast.success("Tier deleted successfully!");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const handleSave = (data: Partial<Tier>) => {
    if (editingTier) {
      updateTier({ ...editingTier, ...data });
    } else {
      createTier(data);
    }
  };

  const openAddModal = () => {
    setEditingTier(null);
    setIsModalOpen(true);
  };

  const openEditModal = (tier: Tier) => {
    setEditingTier(tier);
    setIsModalOpen(true);
  };

  const handleDelete = (id: number) => {
    setTierToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = () => {
    if (tierToDelete) {
      deleteTier(tierToDelete);
      setIsDeleteModalOpen(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            Manage Tiers
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Create, update, and delete subscription tiers.
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 shadow-sm"
        >
          <Plus className="w-5 h-5 mr-2" />
          Add Tier
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-700/50">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Tier Name
              </th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Limits
              </th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {isLoading ? (
              <tr>
                <td colSpan={3} className="text-center p-4">
                  Loading...
                </td>
              </tr>
            ) : (
              tiers.map((tier) => (
                <tr
                  key={tier.id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700/50"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {tier.name}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                      <span>Bookings/mo: {tier.limits.bookingsPerMonth}</span>
                      <span>Programs/mo: {tier.limits.programsPerMonth}</span>
                      <span>
                        Pricings/mo: {tier.limits.programPricingsPerMonth}
                      </span>
                      <span>
                        Costs: {tier.limits.programCosts ? "Yes" : "No"}
                      </span>
                      <span>Employees: {tier.limits.employees}</span>
                      <span>
                        Invoicing: {tier.limits.invoicing ? "Yes" : "No"}
                      </span>
                      <span>
                        Daily Services/mo: {tier.limits.dailyServicesPerMonth}
                      </span>
                      <span>
                        Daily Services:{" "}
                        {tier.limits.dailyServices ? "Yes" : "No"}
                      </span>
                      <span>
                        Booking Excel/mo:{" "}
                        {tier.limits.bookingExcelExportsPerMonth}
                      </span>
                      <span>
                        List Excel/mo: {tier.limits.listExcelExportsPerMonth}
                      </span>
                      <span>
                        Flight List Export:{" "}
                        {tier.limits.flightListExport ? "Yes" : "No"}
                      </span>
                      <span>
                        Profit Report: {tier.limits.profitReport ? "Yes" : "No"}
                      </span>
                      <span>
                        Employee Analysis:{" "}
                        {tier.limits.employeeAnalysis ? "Yes" : "No"}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => openEditModal(tier)}
                        className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-gray-700 rounded-lg"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      {tier.id > 3 && ( // Prevent deleting default tiers
                        <button
                          onClick={() => handleDelete(tier.id)}
                          className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-gray-700 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingTier ? "Edit Tier" : "Add New Tier"}
        size="lg"
      >
        <TierForm
          tier={editingTier}
          tiers={tiers}
          onSave={handleSave}
          onCancel={() => setIsModalOpen(false)}
        />
      </Modal>

      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title="Delete Tier"
        message="Are you sure you want to delete this tier? This action cannot be undone."
      />
    </div>
  );
}
