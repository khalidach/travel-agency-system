// frontend/src/pages/Suppliers.tsx
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Search,
  Trash2,
  Edit2,
  Users,
  Phone,
  Mail,
  ArrowRight,
} from "lucide-react";
import * as api from "../services/api";
import Modal from "../components/Modal";
import ConfirmationModal from "../components/modals/ConfirmationModal";
import SupplierForm, {
  SupplierFormData,
} from "../components/suppliers/SupplierForm";
import { toast } from "react-hot-toast";
import { Supplier } from "../context/models";

import PaginationControls from "../components/ui/PaginationControls";

export default function Suppliers() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(
    null,
  );
  const [supplierToDelete, setSupplierToDelete] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  const { data: suppliersData, isLoading } = useQuery<{
    suppliers: Supplier[];
    total: number;
    page: number;
    totalPages: number;
  }>({
    queryKey: ["suppliers", "stats", currentPage],
    queryFn: () => api.getSuppliers(true, currentPage, itemsPerPage),
  });

  const suppliers = suppliersData?.suppliers || [];

  const createMutation = useMutation({
    mutationFn: api.createSupplier,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      toast.success(t("supplierCreated"));
      setIsFormOpen(false);
    },
    onError: (err: Error & { response?: { data?: { message?: string } } }) =>
      toast.error(err.response?.data?.message || t("error")),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: SupplierFormData }) =>
      api.updateSupplier(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      toast.success(t("supplierUpdated"));
      setIsFormOpen(false);
    },
    onError: (err: Error & { response?: { data?: { message?: string } } }) =>
      toast.error(err.response?.data?.message || t("error")),
  });

  const deleteMutation = useMutation({
    mutationFn: api.deleteSupplier,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      toast.success(t("supplierDeleted"));
      setSupplierToDelete(null);
    },
    onError: (err: Error & { response?: { data?: { message?: string } } }) =>
      toast.error(err.response?.data?.message || t("error")),
  });

  const filteredSuppliers = suppliers?.filter((s) =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const handleCreate = (data: SupplierFormData) => {
    createMutation.mutate(data);
  };

  const handleUpdate = (data: SupplierFormData) => {
    if (selectedSupplier) {
      updateMutation.mutate({ id: selectedSupplier.id, data });
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Users className="w-8 h-8 text-primary" />
            {t("suppliersManagement")}
          </h1>
        </div>
        <button
          onClick={() => {
            setSelectedSupplier(null);
            setIsFormOpen(true);
          }}
          className="btn-primary flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg"
        >
          <Plus className="w-4 h-4" />
          {t("addSupplier")}
        </button>
      </div>

      <div className="flex gap-4 bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder={t("searchSuppliers") as string}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredSuppliers?.map((supplier) => (
          <div
            key={supplier.id}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow cursor-pointer group"
            onClick={() => navigate(`/suppliers/${supplier.id}`)}
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  {supplier.name}
                  <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity text-primary" />
                </h3>
                <div className="flex flex-col gap-1 mt-1 text-sm text-gray-500">
                  {supplier.email && (
                    <span className="flex items-center gap-1">
                      <Mail className="w-3 h-3" /> {supplier.email}
                    </span>
                  )}
                  {supplier.phone && (
                    <span className="flex items-center gap-1">
                      <Phone className="w-3 h-3" /> {supplier.phone}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => {
                    setSelectedSupplier(supplier);
                    setIsFormOpen(true);
                  }}
                  className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setSupplierToDelete(supplier.id)}
                  className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-4 border-t border-gray-100 dark:border-gray-700">
              <div>
                <p className="text-xs text-gray-500">{t("total")}</p>
                <p className="font-semibold text-gray-900 dark:text-white">
                  {supplier.totalAmount?.toLocaleString() ?? "0"}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">{t("paid")}</p>
                <p className="font-semibold text-emerald-600">
                  {supplier.totalPaid?.toLocaleString() ?? "0"}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">{t("remainingBalance")}</p>
                <p className="font-semibold text-red-600">
                  {supplier.totalRemaining?.toLocaleString() ?? "0"}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {suppliersData && suppliersData.totalPages > 1 && (
        <PaginationControls
          currentPage={currentPage}
          totalPages={suppliersData.totalPages}
          totalCount={suppliersData.total}
          limit={itemsPerPage}
          onPageChange={(page) => setCurrentPage(page)}
        />
      )}

      <Modal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={selectedSupplier ? t("editSupplier") : t("addSupplier")}
      >
        <SupplierForm
          initialData={selectedSupplier}
          onSubmit={(data) => {
            if (selectedSupplier) {
              handleUpdate(data);
            } else {
              handleCreate(data);
            }
          }}
          onCancel={() => setIsFormOpen(false)}
        />
      </Modal>

      {supplierToDelete && (
        <ConfirmationModal
          isOpen={!!supplierToDelete}
          onClose={() => setSupplierToDelete(null)}
          onConfirm={() => deleteMutation.mutate(supplierToDelete)}
          title={t("deleteSupplier")}
          message={t("deleteSupplierConfirm")}
        />
      )}
    </div>
  );
}
