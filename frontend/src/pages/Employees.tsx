// frontend/src/pages/Employees.tsx
import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Plus, Edit2, Trash2, Users, Briefcase, Hash } from "lucide-react";
import Modal from "../components/Modal";
import ConfirmationModal from "../components/modals/ConfirmationModal";
import * as api from "../services/api";
import { toast } from "react-hot-toast";
import type { Employee } from "../context/models";
import { useTranslation } from "react-i18next";

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
      toast.error("Username and password are required.");
      return;
    }
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {t("username")}
        </label>
        <input
          type="text"
          value={formData.username}
          onChange={(e) =>
            setFormData({ ...formData, username: e.target.value })
          }
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg mt-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Password {employee ? "(leave blank to keep unchanged)" : ""}
        </label>
        <input
          type="password"
          value={formData.password}
          onChange={(e) =>
            setFormData({ ...formData, password: e.target.value })
          }
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg mt-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
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
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg mt-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200"
        >
          <option value="employee">{t("employee")}</option>
          <option value="manager">{t("manager")}</option>
        </select>
      </div>
      <div className="flex justify-end space-x-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 bg-gray-100 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg"
        >
          {t("cancel")}
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg"
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
    mutationFn: (data: Partial<Employee>) => api.createEmployee(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employeesWithCount"] });
      toast.success("Employee created successfully!");
      setIsFormModalOpen(false);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create employee.");
    },
  });

  const { mutate: updateEmployee } = useMutation({
    mutationFn: (data: Partial<Employee>) =>
      api.updateEmployee(editingEmployee!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employeesWithCount"] });
      toast.success("Employee updated successfully!");
      setIsFormModalOpen(false);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const { mutate: deleteEmployee } = useMutation({
    mutationFn: (id: number) => api.deleteEmployee(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employeesWithCount"] });
      toast.success("Employee deleted successfully!");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const { mutate: toggleStatus } = useMutation({
    mutationFn: (data: { id: number; active: boolean }) =>
      api.toggleEmployeeStatus(data.id, data.active),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employeesWithCount"] });
      toast.success("Employee status updated successfully!");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const handleToggleStatus = (e: React.ChangeEvent, employee: Employee) => {
    e.stopPropagation(); // Prevent navigation when clicking the toggle
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            {t("employees")}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            {t("manageStaff")}{" "}
            {t("employeeLimitReached", { limit: employeeLimit })}
          </p>
        </div>
        <button
          onClick={openAddModal}
          disabled={!canAddEmployee}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 shadow-sm disabled:bg-gray-400 disabled:cursor-not-allowed"
          title={
            !canAddEmployee
              ? `Employee limit of ${employeeLimit} reached`
              : "Add a new employee"
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

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-700/50">
            <tr>
              <th
                className={`px-6 py-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider ${
                  document.documentElement.dir === "rtl"
                    ? "text-right"
                    : "text-left"
                }`}
              >
                {t("username")}
              </th>
              <th
                className={`px-6 py-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider ${
                  document.documentElement.dir === "rtl"
                    ? "text-right"
                    : "text-left"
                }`}
              >
                {t("role")}
              </th>
              <th
                className={`px-6 py-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider ${
                  document.documentElement.dir === "rtl"
                    ? "text-right"
                    : "text-left"
                }`}
              >
                {t("bookingsMade")}
              </th>
              <th
                className={`px-6 py-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider ${
                  document.documentElement.dir === "rtl"
                    ? "text-right"
                    : "text-left"
                }`}
              >
                {t("status")}
              </th>
              <th
                className={`px-6 py-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider ${
                  document.documentElement.dir === "rtl"
                    ? "text-right"
                    : "text-left"
                }`}
              >
                {t("actions")}
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {isLoadingEmployees ? (
              <tr>
                <td colSpan={5} className="text-center p-4">
                  {t("loading")}...
                </td>
              </tr>
            ) : (
              employees.map((emp) => (
                <tr
                  key={emp.id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer"
                  onClick={() => navigate(`/employees/${emp.username}`)}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Users className="w-5 h-5 text-gray-400 dark:text-gray-500 mx-3" />
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {emp.username}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        emp.role === "manager"
                          ? "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-300"
                          : "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300"
                      }`}
                    >
                      <Briefcase className="w-3 h-3 mr-1.5" />
                      {t(emp.role)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Hash
                        className={`w-4 h-4 text-gray-400 dark:text-gray-500 ${
                          document.documentElement.dir === "rtl"
                            ? "ml-2"
                            : "mr-2"
                        }`}
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        {emp.bookingCount || 0}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <label
                      htmlFor={`toggle-${emp.id}`}
                      className="flex items-center cursor-pointer"
                      onClick={(e) => e.stopPropagation()} // Prevent row click from firing
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
                          className={`block w-14 h-8 rounded-full ${
                            emp.active
                              ? "bg-green-500"
                              : "bg-gray-300 dark:bg-gray-600"
                          }`}
                        ></div>
                        <div
                          className={`dot absolute left-1 top-1 bg-white dark:bg-gray-300 w-6 h-6 rounded-full transition-transform ${
                            emp.active ? "translate-x-6" : ""
                          }`}
                        ></div>
                      </div>
                      <div className="ml-3 text-gray-700 dark:text-gray-300 font-medium">
                        {emp.active ? t("active") : t("inactive")}
                      </div>
                    </label>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={(e) => openEditModal(e, emp)}
                        className="p-2 text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-gray-700 rounded-lg"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => handleDelete(e, emp.id)}
                        className="p-2 text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-gray-700 rounded-lg"
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
    </div>
  );
}
