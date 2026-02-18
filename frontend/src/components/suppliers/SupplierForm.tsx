// frontend/src/components/suppliers/SupplierForm.tsx
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Supplier } from "../../context/models";

export interface SupplierFormData {
  name: string;
  email: string;
  phone: string;
  landline: string;
}

interface SupplierFormProps {
  initialData?: Supplier | null;
  onSubmit: (data: SupplierFormData) => void;
  onCancel: () => void;
}

export default function SupplierForm({
  initialData,
  onSubmit,
  onCancel,
}: SupplierFormProps) {
  const { t } = useTranslation();
  const [formData, setFormData] = useState<SupplierFormData>({
    name: initialData?.name || "",
    email: initialData?.email || "",
    phone: initialData?.phone || "",
    landline: initialData?.landline || "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {t("name")} *
        </label>
        <input
          type="text"
          required
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="w-full p-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {t("email")} ({t("optional")})
        </label>
        <input
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          className="w-full p-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t("phone")} ({t("optional")})
          </label>
          <input
            type="tel"
            value={formData.phone}
            onChange={(e) =>
              setFormData({ ...formData, phone: e.target.value })
            }
            className="w-full p-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t("landline")} ({t("optional")})
          </label>
          <input
            type="tel"
            value={formData.landline}
            onChange={(e) =>
              setFormData({ ...formData, landline: e.target.value })
            }
            className="w-full p-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700"
          />
        </div>
      </div>

      <div className="flex justify-end gap-3 mt-6">
        <button
          type="button"
          onClick={onCancel}
          className="btn-secondary px-4 py-2 rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80"
        >
          {t("cancel")}
        </button>
        <button
          type="submit"
          className="btn-primary bg-primary text-white hover:bg-primary/90 px-4 py-2 rounded-lg"
        >
          {t("save")}
        </button>
      </div>
    </form>
  );
}
