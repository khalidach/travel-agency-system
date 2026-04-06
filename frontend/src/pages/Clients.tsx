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
import ClientForm, {
  ClientFormData,
} from "../components/clients/ClientForm";
import { toast } from "react-hot-toast";
import { Client } from "../context/models";

import PaginationControls from "../components/ui/PaginationControls";

export default function Clients() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(
    null,
  );
  const [clientToDelete, setClientToDelete] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  const { data: clientsData, isLoading } = useQuery<{
    clients: Client[];
    total: number;
    page: number;
    totalPages: number;
  }>({
    queryKey: ["clients", "stats", currentPage],
    queryFn: () => api.getClients(true, currentPage, itemsPerPage),
  });

  const clients = clientsData?.clients || [];

  const createMutation = useMutation({
    mutationFn: api.createClient,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      toast.success(t("ClientCreated", { defaultValue: "Client created successfully" }));
      setIsFormOpen(false);
    },
    onError: (err: Error & { response?: { data?: { message?: string } } }) =>
      toast.error(err.response?.data?.message || t("error")),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: ClientFormData }) =>
      api.updateClient(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      toast.success(t("ClientUpdated", { defaultValue: "Client updated successfully" }));
      setIsFormOpen(false);
    },
    onError: (err: Error & { response?: { data?: { message?: string } } }) =>
      toast.error(err.response?.data?.message || t("error")),
  });

  const deleteMutation = useMutation({
    mutationFn: api.deleteClient,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      toast.success(t("ClientDeleted", { defaultValue: "Client deleted successfully" }));
      setClientToDelete(null);
    },
    onError: (err: Error & { response?: { data?: { message?: string } } }) =>
      toast.error(err.response?.data?.message || t("error")),
  });

  const filteredClients = clients?.filter((c) =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const handleCreate = (data: ClientFormData) => {
    createMutation.mutate(data);
  };

  const handleUpdate = (data: ClientFormData) => {
    if (selectedClient) {
      updateMutation.mutate({ id: selectedClient.id, data });
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
            {t("clientsManagement", { defaultValue: "Clients Management" })}
          </h1>
        </div>
        <button
          onClick={() => {
            setSelectedClient(null);
            setIsFormOpen(true);
          }}
          className="btn-primary flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg"
        >
          <Plus className="w-4 h-4" />
          {t("addClient", { defaultValue: "Add Client" })}
        </button>
      </div>

      <div className="flex gap-4 bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder={t("searchClients", { defaultValue: "Search clients..." }) as string}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredClients?.map((client) => (
          <div
            key={client.id}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow cursor-pointer group"
            onClick={() => navigate(`/clients/${client.id}`)}
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2" title={client.name}>
                  {client.name.length > 20 ? client.name.substring(0, 20) + "..." : client.name}
                  <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity text-primary" />
                </h3>
                <div className="flex flex-col gap-1 mt-1 text-sm text-gray-500">
                  {client.email && (
                    <span className="flex items-center gap-1" title={client.email}>
                      <Mail className="w-3 h-3 flex-shrink-0" /> {client.email.length > 25 ? client.email.substring(0, 25) + '...' : client.email}
                    </span>
                  )}
                  {client.phone && (
                    <span className="flex items-center gap-1">
                      <Phone className="w-3 h-3 flex-shrink-0" /> {client.phone}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => {
                    setSelectedClient(client);
                    setIsFormOpen(true);
                  }}
                  className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setClientToDelete(client.id)}
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
                  {client.totalAmount?.toLocaleString() ?? "0"}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">{t("paid")}</p>
                <p className="font-semibold text-emerald-600">
                  {client.totalPaid?.toLocaleString() ?? "0"}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">{t("remainingBalance")}</p>
                <p className="font-semibold text-red-600">
                  {client.totalRemaining?.toLocaleString() ?? "0"}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {clientsData && clientsData.totalPages > 1 && (
        <PaginationControls
          currentPage={currentPage}
          totalPages={clientsData.totalPages}
          totalCount={clientsData.total}
          limit={itemsPerPage}
          onPageChange={(page) => setCurrentPage(page)}
        />
      )}

      <Modal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={selectedClient ? t("editClient", { defaultValue: "Edit Client" }) : t("addClient", { defaultValue: "Add Client" })}
      >
        <ClientForm
          initialData={selectedClient}
          onSubmit={(data) => {
            if (selectedClient) {
              handleUpdate(data);
            } else {
              handleCreate(data);
            }
          }}
          onCancel={() => setIsFormOpen(false)}
        />
      </Modal>

      {clientToDelete && (
        <ConfirmationModal
          isOpen={!!clientToDelete}
          onClose={() => setClientToDelete(null)}
          onConfirm={() => deleteMutation.mutate(clientToDelete)}
          title={t("deleteClient", { defaultValue: "Delete Client" })}
          message={t("deleteClientConfirm", { defaultValue: "Are you sure you want to delete this client? This action cannot be undone." })}
        />
      )}
    </div>
  );
}
