// frontend/src/pages/Employees.tsx
import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Edit2,
  Trash2,
  Users,
  Briefcase,
  Hash,
  HelpCircle,
  Lock,
} from "lucide-react";
import Modal from "../components/Modal";
import ConfirmationModal from "../components/modals/ConfirmationModal";
import * as api from "../services/api";
import { toast } from "react-hot-toast";
import type { Employee } from "../context/models";
import { useTranslation } from "react-i18next";
import VideoHelpModal from "../components/VideoHelpModal";
import { useAuthContext } from "../context/AuthContext";

const EmployeeForm = ({
  employee,
  onSave,
  onCancel,
}: {
  employee?: Employee | null;
  onSave: (data: Partial<Employee>) => void;
  onCancel: () => void;
}) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    username: employee?.username || "",
    password: "",
    role: employee?.role || "employee",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.username || (!employee && !formData.password)) {
      toast.error(t("usernameAndPasswordRequired"));
      return;
    }
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-foreground">
          {t("username")}
        </label>
        <input
          type="text"
          value={formData.username}
          onChange={(e) =>
            setFormData({ ...formData, username: e.target.value })
          }
          className="w-full px-3 py-2 border border-input rounded-lg mt-1 bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent transition-colors"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-foreground">
          {t("password")} {employee ? t("passwordLeaveBlank") : ""}
        </label>
        <input
          type="password"
          value={formData.password}
          onChange={(e) =>
            setFormData({ ...formData, password: e.target.value })
          }
          className="w-full px-3 py-2 border border-input rounded-lg mt-1 bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent transition-colors"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-foreground">
          {t("role")}
        </label>
        <select
          value={formData.role}
          onChange={(e) =>
            setFormData({
              ...formData,
              role: e.target.value as "manager" | "employee",
            })
          }
          className="w-full px-3 py-2 border border-input rounded-lg mt-1 bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent transition-colors"
        >
          <option value="employee">{t("employee")}</option>
          <option value="manager">{t("manager")}</option>
        </select>
      </div>
      <div className="flex justify-end space-x-3 pt-4 rtl:space-x-reverse">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors"
        >
          {t("cancel")}
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
        >
          {t("save")}
        </button>
      </div>
    </form>
  );
};

export default function EmployeesPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState<number | null>(null);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const { state } = useAuthContext();
  const user = state.user;

  const hasEmployeeAnalysisAccess = useMemo(() => {
    if (!user) return false;
    if (typeof user.limits?.employeeAnalysis === "boolean") {
      return user.limits.employeeAnalysis;
    }
    if (typeof user.tierLimits?.employeeAnalysis === "boolean") {
      return user.tierLimits.employeeAnalysis;
    }
    return false;
  }, [user]);

  const { data, isLoading: isLoadingEmployees } = useQuery<{
    employees: (Employee & { bookingCount: number })[];
    limit: number;
  }>({
    queryKey: ["employeesWithCount"],
    queryFn: api.getEmployees,
  });

  const employees = data?.employees ?? [];
  const employeeLimit = data?.limit ?? 2;
  const canAddEmployee = employees.length < employeeLimit;

  const { mutate: createEmployee } = useMutation({
    mutationFn: (data: Partial<Employee>) => {
      const payload = data as unknown as Omit<Employee, "id"> & {
        password?: string;
      };
      return api.createEmployee(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employeesWithCount"] });
      toast.success(t("employeeCreatedSuccess"));
      setIsFormModalOpen(false);
    },
    onError: (error: Error) => {
      toast.error(error.message || t("employeeCreateError"));
    },
  });

  const { mutate: updateEmployee } = useMutation({
    mutationFn: (data: Partial<Employee>) =>
      api.updateEmployee(editingEmployee!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employeesWithCount"] });
      toast.success(t("employeeUpdatedSuccess"));
      setIsFormModalOpen(false);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const { mutate: deleteEmployee } = useMutation({
    mutationFn: (id: number) => api.deleteEmployee(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employeesWithCount"] });
      toast.success(
        t("employeeDeletedSuccess") || "Employee deleted successfully!",
      );
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const { mutate: toggleStatus } = useMutation({
    mutationFn: (data: { id: number; active: boolean }) =>
      api.toggleEmployeeStatus(data.id, data.active),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employeesWithCount"] });
      toast.success(t("employeeStatusUpdatedSuccess"));
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const handleToggleStatus = (e: React.ChangeEvent, employee: Employee) => {
    e.stopPropagation();
    toggleStatus({ id: employee.id, active: !employee.active });
  };

  const handleSave = (data: Partial<Employee>) => {
    if (editingEmployee) {
      updateEmployee(data);
    } else {
      createEmployee(data);
    }
  };

  const openAddModal = () => {
    setEditingEmployee(null);
    setIsFormModalOpen(true);
  };

  const openEditModal = (e: React.MouseEvent, employee: Employee) => {
    e.stopPropagation();
    setEditingEmployee(employee);
    setIsFormModalOpen(true);
  };

  const handleDelete = (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    setEmployeeToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = () => {
    if (employeeToDelete) {
      deleteEmployee(employeeToDelete);
    }
    setIsDeleteModalOpen(false);
    setEmployeeToDelete(null);
  };

  const handleRowClick = (emp: Employee) => {
    if (hasEmployeeAnalysisAccess) {
      navigate(`/employees/${emp.username}`);
    } else {
      toast.error(t("employeeAnalysisNotAvailable"));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            {t("employees")}
          </h1>
          <p className="text-muted-foreground mt-2">
            {t("manageStaff")}{" "}
            {t("employeeLimitReached", { limit: employeeLimit })}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setIsHelpModalOpen(true)}
            className="p-2 text-muted-foreground bg-secondary rounded-full hover:bg-secondary/80 transition-colors"
            aria-label={t("help") as string}
          >
            <HelpCircle className="w-6 h-6" />
          </button>
          <button
            onClick={openAddModal}
            disabled={!canAddEmployee}
            className="inline-flex items-center px-4 py-2 bg-primary text-white rounded-xl hover:bg-primary/90 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title={
              !canAddEmployee
                ? (t("employeeLimitReachedTooltip", {
                    limit: employeeLimit,
                  }) as string)
                : (t("addEmployeeTooltip") as string)
            }
          >
            <Plus
              className={`w-5 h-5 ${
                document.documentElement.dir === "rtl" ? "ml-2" : "mr-2"
              }`}
            />
            {t("addEmployee")}
          </button>
        </div>
      </div>

      <div className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted/50 border-b border-border">
            <tr>
              <th
                className={`px-6 py-4 text-xs font-medium text-muted-foreground uppercase tracking-wider ${
                  document.documentElement.dir === "rtl"
                    ? "text-right"
                    : "text-left"
                }`}
              >
                {t("username")}
              </th>
              <th
                className={`px-6 py-4 text-xs font-medium text-muted-foreground uppercase tracking-wider ${
                  document.documentElement.dir === "rtl"
                    ? "text-right"
                    : "text-left"
                }`}
              >
                {t("role")}
              </th>
              <th
                className={`px-6 py-4 text-xs font-medium text-muted-foreground uppercase tracking-wider ${
                  document.documentElement.dir === "rtl"
                    ? "text-right"
                    : "text-left"
                }`}
              >
                {t("bookingsMade")}
              </th>
              <th
                className={`px-6 py-4 text-xs font-medium text-muted-foreground uppercase tracking-wider ${
                  document.documentElement.dir === "rtl"
                    ? "text-right"
                    : "text-left"
                }`}
              >
                {t("status")}
              </th>
              <th
                className={`px-6 py-4 text-xs font-medium text-muted-foreground uppercase tracking-wider ${
                  document.documentElement.dir === "rtl"
                    ? "text-right"
                    : "text-left"
                }`}
              >
                {t("actions")}
              </th>
            </tr>
          </thead>
          <tbody className="bg-card divide-y divide-border">
            {isLoadingEmployees ? (
              <tr>
                <td
                  colSpan={5}
                  className="text-center p-4 text-muted-foreground"
                >
                  {t("loading") || "Loading..."}
                </td>
              </tr>
            ) : (
              employees.map((emp) => (
                <tr
                  key={emp.id}
                  className={`hover:bg-muted/30 transition-colors ${
                    hasEmployeeAnalysisAccess ? "cursor-pointer" : ""
                  }`}
                  onClick={() => handleRowClick(emp)}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Users className="w-5 h-5 text-muted-foreground mx-3" />
                      <span className="text-sm font-medium text-foreground">
                        {emp.username}
                      </span>
                      {!hasEmployeeAnalysisAccess && (
                        <Lock className="w-3 h-3 text-muted-foreground ml-2" />
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        emp.role === "manager"
                          ? "bg-indigo-100 text-indigo-800 dark:bg-indigo-500/20 dark:text-indigo-200"
                          : "bg-green-100 text-green-800 dark:bg-green-500/20 dark:text-green-200"
                      }`}
                    >
                      <Briefcase className="w-3 h-3 mr-1.5" />
                      {t(emp.role)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Hash
                        className={`w-4 h-4 text-muted-foreground ${
                          document.documentElement.dir === "rtl"
                            ? "ml-2"
                            : "mr-2"
                        }`}
                      />
                      <span className="text-sm text-foreground">
                        {emp.bookingCount || 0}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <label
                      htmlFor={`toggle-${emp.id}`}
                      className="flex items-center cursor-pointer"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="relative">
                        <input
                          type="checkbox"
                          id={`toggle-${emp.id}`}
                          className="sr-only"
                          checked={!!emp.active}
                          onChange={(e) => handleToggleStatus(e, emp)}
                        />
                        <div
                          className={`block w-14 h-8 rounded-full transition-colors ${
                            emp.active ? "bg-success" : "bg-input"
                          }`}
                        ></div>
                        <div
                          className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform ${
                            emp.active ? "translate-x-6" : ""
                          }`}
                        ></div>
                      </div>
                      <div className="ml-3 text-foreground font-medium">
                        {emp.active
                          ? t("active") || "Active"
                          : t("inactive") || "Inactive"}
                      </div>
                    </label>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-2 rtl:space-x-reverse">
                      <button
                        onClick={(e) => openEditModal(e, emp)}
                        className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => handleDelete(e, emp.id)}
                        className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        title={editingEmployee ? t("editEmployee") : t("addEmployee")}
      >
        <EmployeeForm
          employee={editingEmployee}
          onSave={handleSave}
          onCancel={() => setIsFormModalOpen(false)}
        />
      </Modal>

      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setEmployeeToDelete(null)}
        onConfirm={confirmDelete}
        title={t("deleteEmployeeTitle")}
        message={t("deleteEmployeeMessage")}
      />
      <VideoHelpModal
        isOpen={isHelpModalOpen}
        onClose={() => setIsHelpModalOpen(false)}
        videoId="eVawfjob52Q"
        title={t("employeesManagementHelp")}
      />
    </div>
  );
}
