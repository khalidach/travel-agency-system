// frontend/src/components/clients/ClientForm.tsx
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Client } from "../../context/models";

export interface ClientFormData {
  name: string;
  email: string;
  phone: string;
  address: string;
  ice: string;
}

interface ClientFormProps {
  initialData?: Client | null;
  onSubmit: (data: ClientFormData) => void;
  onCancel: () => void;
}

export default function ClientForm({
  initialData,
  onSubmit,
  onCancel,
}: ClientFormProps) {
  const { t } = useTranslation();
  const [formData, setFormData] = useState<ClientFormData>({
    name: initialData?.name || "",
    email: initialData?.email || "",
    phone: initialData?.phone || "",
    address: initialData?.address || "",
    ice: initialData?.ice || "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {t("ClientName", { defaultValue: "Client Name" })} *
        </label>
        <input
          type="text"
          required
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="w-full p-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
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
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {t("address")} ({t("optional")})
        </label>
        <textarea
          value={formData.address}
          onChange={(e) =>
            setFormData({ ...formData, address: e.target.value })
          }
          className="w-full p-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 min-h-[80px]"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {t("ice")} ({t("optional")})
        </label>
        <input
          type="text"
          value={formData.ice}
          onChange={(e) =>
            setFormData({ ...formData, ice: e.target.value })
          }
          className="w-full p-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700"
        />
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
