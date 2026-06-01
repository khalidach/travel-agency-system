import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Edit2, Trash2, MapPin, Phone, Mail, Calendar, GitBranch } from "lucide-react";
import Modal from "../components/Modal";
import ConfirmationModal from "../components/modals/ConfirmationModal";
import * as api from "../services/api";
import { toast } from "react-hot-toast";
import type { Branch } from "../context/models";
import { useTranslation } from "react-i18next";

const BranchForm = ({
  branch,
  onSave,
  onCancel,
}: {
  branch?: Branch | null;
  onSave: (data: { name: string; address?: string; phone?: string; email?: string }) => void;
  onCancel: () => void;
}) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    name: branch?.name || "",
    address: branch?.address || "",
    phone: branch?.phone || "",
    email: branch?.email || "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) {
      toast.error(t("branchNameRequired", "Branch name is required"));
      return;
    }
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-foreground">
          {t("branchName", "Branch Name")} *
        </label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="w-full px-3 py-2 border border-input rounded-lg mt-1 bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent transition-colors"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-foreground">
          {t("address", "Address")}
        </label>
        <textarea
          value={formData.address}
          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
          className="w-full px-3 py-2 border border-input rounded-lg mt-1 bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent transition-colors"
          rows={3}
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-foreground">
          {t("phone", "Phone")}
        </label>
        <input
          type="text"
          value={formData.phone}
          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          className="w-full px-3 py-2 border border-input rounded-lg mt-1 bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent transition-colors"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-foreground">
          {t("email", "Email")}
        </label>
        <input
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          className="w-full px-3 py-2 border border-input rounded-lg mt-1 bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent transition-colors"
        />
      </div>
      <div className="flex justify-end space-x-3 pt-4 rtl:space-x-reverse">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors"
        >
          {t("cancel", "Cancel")}
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
        >
          {t("save", "Save")}
        </button>
      </div>
    </form>
  );
};

export default function BranchesPage() {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [branchToDelete, setBranchToDelete] = useState<number | null>(null);

  const { data: branches = [], isLoading } = useQuery<Branch[]>({
    queryKey: ["branches"],
    queryFn: api.getBranches,
  });

  const createMutation = useMutation({
    mutationFn: api.createBranch,
    onSuccess: () => {
      toast.success(t("branchCreatedSuccessfully", "Branch created successfully"));
      queryClient.invalidateQueries({ queryKey: ["branches"] });
      setIsFormModalOpen(false);
    },
    onError: (error: Error) => {
      toast.error(error.message || t("failedToCreateBranch", "Failed to create branch"));
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Branch> }) =>
      api.updateBranch(id, data),
    onSuccess: () => {
      toast.success(t("branchUpdatedSuccessfully", "Branch updated successfully"));
      queryClient.invalidateQueries({ queryKey: ["branches"] });
      setIsFormModalOpen(false);
      setEditingBranch(null);
    },
    onError: (error: Error) => {
      toast.error(error.message || t("failedToUpdateBranch", "Failed to update branch"));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: api.deleteBranch,
    onSuccess: () => {
      toast.success(t("branchDeletedSuccessfully", "Branch deleted successfully"));
      queryClient.invalidateQueries({ queryKey: ["branches"] });
      setIsDeleteModalOpen(false);
      setBranchToDelete(null);
    },
    onError: (error: Error) => {
      toast.error(error.message || t("failedToDeleteBranch", "Failed to delete branch"));
    },
  });

  const handleEditClick = (branch: Branch) => {
    setEditingBranch(branch);
    setIsFormModalOpen(true);
  };

  const handleDeleteClick = (id: number) => {
    setBranchToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const handleSave = (formData: any) => {
    if (editingBranch) {
      updateMutation.mutate({ id: editingBranch.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-foreground tracking-tight flex items-center gap-x-3">
            <GitBranch className="w-8 h-8 text-primary" />
            {t("branchesManagement", "Branches Management")}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {t("branchesDescription", "Create and manage your agency's physical branches and offices.")}
          </p>
        </div>
        <button
          onClick={() => {
            setEditingBranch(null);
            setIsFormModalOpen(true);
          }}
          className="flex items-center justify-center gap-x-2 px-4 py-2.5 bg-primary text-white rounded-xl shadow-lg hover:bg-primary/95 transition-all text-sm font-semibold self-start animate-fade-in"
        >
          <Plus className="w-4 h-4" />
          {t("addBranch", "Add Branch")}
        </button>
      </div>

      {/* Grid of Branches */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((n) => (
            <div key={n} className="bg-card rounded-2xl p-6 border border-border/50 shadow-sm animate-pulse space-y-4">
              <div className="h-6 bg-muted rounded w-3/4"></div>
              <div className="h-4 bg-muted rounded w-1/2"></div>
              <div className="h-4 bg-muted rounded w-5/6"></div>
              <div className="h-4 bg-muted rounded w-2/3"></div>
            </div>
          ))}
        </div>
      ) : branches.length === 0 ? (
        <div className="bg-card rounded-3xl p-12 border border-border text-center max-w-xl mx-auto space-y-4 shadow-sm">
          <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto text-primary">
            <GitBranch className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-foreground">{t("noBranchesFound", "No branches found")}</h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            {t("noBranchesDescription", "It looks like you haven't created any branches yet. Create your first physical branch location to start organizing employee access and scoping transactions.")}
          </p>
          <button
            onClick={() => setIsFormModalOpen(true)}
            className="px-5 py-2.5 bg-primary text-white rounded-xl shadow-md hover:bg-primary/95 transition-all text-sm font-semibold inline-flex items-center gap-x-2"
          >
            <Plus className="w-4 h-4" />
            {t("addBranch", "Add Branch")}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {branches.map((b) => (
            <div
              key={b.id}
              className="bg-card hover:bg-accent/5 rounded-2xl p-6 border border-border shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-x-4 mb-4">
                  <h3 className="text-lg font-bold text-foreground tracking-tight break-words">{b.name}</h3>
                  <div className="flex items-center gap-x-1 flex-shrink-0">
                    <button
                      onClick={() => handleEditClick(b)}
                      className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                      title={t("edit", "Edit")}
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteClick(b.id)}
                      className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                      title={t("delete", "Delete")}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-3 text-sm text-muted-foreground">
                  {b.address && (
                    <div className="flex items-start gap-x-2.5">
                      <MapPin className="w-4 h-4 text-muted-foreground/60 flex-shrink-0 mt-0.5" />
                      <span className="leading-tight break-words">{b.address}</span>
                    </div>
                  )}
                  {b.phone && (
                    <div className="flex items-center gap-x-2.5">
                      <Phone className="w-4 h-4 text-muted-foreground/60 flex-shrink-0" />
                      <span className="break-all">{b.phone}</span>
                    </div>
                  )}
                  {b.email && (
                    <div className="flex items-center gap-x-2.5">
                      <Mail className="w-4 h-4 text-muted-foreground/60 flex-shrink-0" />
                      <span className="break-all">{b.email}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-border/60 flex items-center justify-between text-xs text-muted-foreground/85">
                <div className="flex items-center gap-x-1.5">
                  <Calendar className="w-3.5 h-3.5 text-muted-foreground/60" />
                  <span>
                    {t("created", "Created")}: {new Date(b.createdAt).toLocaleDateString(i18n.language)}
                  </span>
                </div>
                <span className="font-mono text-muted-foreground/60 text-[10px]">ID: #{b.id}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Form Modal */}
      <Modal
        isOpen={isFormModalOpen}
        onClose={() => {
          setIsFormModalOpen(false);
          setEditingBranch(null);
        }}
        title={editingBranch ? t("editBranch", "Edit Branch") : t("addBranch", "Add Branch")}
      >
        <BranchForm
          branch={editingBranch}
          onSave={handleSave}
          onCancel={() => {
            setIsFormModalOpen(false);
            setEditingBranch(null);
          }}
        />
      </Modal>

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setBranchToDelete(null);
        }}
        onConfirm={() => {
          if (branchToDelete) deleteMutation.mutate(branchToDelete);
        }}
        title={t("deleteBranch", "Delete Branch")}
        message={t(
          "deleteBranchConfirmMessage",
          "Are you sure you want to delete this branch? Employees assigned to it will be updated to 'No Branch' but will not be deleted."
        )}
        confirmLabel={t("delete", "Delete")}
        cancelLabel={t("cancel", "Cancel")}
        isDanger={true}
      />
    </div>
  );
}
