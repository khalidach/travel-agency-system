import React, { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Edit2, Trash2, Users, Briefcase, Hash } from "lucide-react";
import Modal from "../components/Modal";
import * as api from "../services/api";
import { toast } from "react-hot-toast";
import type { Employee, Booking, PaginatedResponse } from "../context/models";
import { useAuthContext } from "../context/AuthContext";

// Form for adding/editing an employee
const EmployeeForm = ({
  employee,
  onSave,
  onCancel,
}: {
  employee?: Employee | null;
  onSave: (data: Partial<Employee>) => void;
  onCancel: () => void;
}) => {
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
        <label className="block text-sm font-medium text-gray-700">
          Username
        </label>
        <input
          type="text"
          value={formData.username}
          onChange={(e) =>
            setFormData({ ...formData, username: e.target.value })
          }
          className="w-full px-3 py-2 border border-gray-300 rounded-lg mt-1"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Password {employee ? "(leave blank to keep unchanged)" : ""}
        </label>
        <input
          type="password"
          value={formData.password}
          onChange={(e) =>
            setFormData({ ...formData, password: e.target.value })
          }
          className="w-full px-3 py-2 border border-gray-300 rounded-lg mt-1"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Role</label>
        <select
          value={formData.role}
          onChange={(e) =>
            setFormData({
              ...formData,
              role: e.target.value as "manager" | "employee",
            })
          }
          className="w-full px-3 py-2 border border-gray-300 rounded-lg mt-1"
        >
          <option value="employee">Employee</option>
          <option value="manager">Manager</option>
        </select>
      </div>
      <div className="flex justify-end space-x-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 bg-gray-100 rounded-lg"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg"
        >
          Save
        </button>
      </div>
    </form>
  );
};

export default function EmployeesPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { state } = useAuthContext();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

  const { data, isLoading: isLoadingEmployees } = useQuery<{
    employees: Employee[];
    limit: number;
  }>({
    queryKey: ["employees"],
    queryFn: api.getEmployees,
  });

  const employees = data?.employees ?? [];
  const employeeLimit = data?.limit ?? 2;
  const canAddEmployee = employees.length < employeeLimit;

  const { data: bookingResponse } = useQuery<PaginatedResponse<Booking>>({
    queryKey: ["bookings", "all"],
    queryFn: () => api.getBookings(1, 10000),
  });
  const bookings = bookingResponse?.data ?? [];

  const employeeBookingsCount = useMemo(() => {
    const counts = new Map<number, number>();
    if (Array.isArray(bookings)) {
      bookings.forEach((booking) => {
        if (booking.employeeId) {
          counts.set(
            booking.employeeId,
            (counts.get(booking.employeeId) || 0) + 1
          );
        }
      });
    }
    return counts;
  }, [bookings]);

  const { mutate: createEmployee } = useMutation({
    mutationFn: (data: Partial<Employee>) => api.createEmployee(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      toast.success("Employee created successfully!");
      setIsModalOpen(false);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create employee.");
    },
  });

  const { mutate: updateEmployee } = useMutation({
    mutationFn: (data: Partial<Employee>) =>
      api.updateEmployee(editingEmployee!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      toast.success("Employee updated successfully!");
      setIsModalOpen(false);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const { mutate: deleteEmployee } = useMutation({
    mutationFn: (id: number) => api.deleteEmployee(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      toast.success("Employee deleted successfully!");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const handleSave = (data: Partial<Employee>) => {
    if (editingEmployee) {
      updateEmployee(data);
    } else {
      createEmployee(data);
    }
  };

  const openAddModal = () => {
    setEditingEmployee(null);
    setIsModalOpen(true);
  };

  const openEditModal = (employee: Employee) => {
    setEditingEmployee(employee);
    setIsModalOpen(true);
  };

  const handleDelete = (id: number) => {
    if (window.confirm("Are you sure you want to delete this employee?")) {
      deleteEmployee(id);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Employees</h1>
          <p className="text-gray-600 mt-2">
            Manage your agency's staff and roles. You can create up to{" "}
            {employeeLimit} employees.
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
          <Plus className="w-5 h-5 mr-2" />
          Add Employee
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Username
              </th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Role
              </th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Bookings Made
              </th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {isLoadingEmployees ? (
              <tr>
                <td colSpan={4} className="text-center p-4">
                  Loading...
                </td>
              </tr>
            ) : (
              employees.map((emp) => (
                <tr key={emp.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Users className="w-5 h-5 text-gray-400 mr-3" />
                      <span className="text-sm font-medium text-gray-900">
                        {emp.username}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        emp.role === "manager"
                          ? "bg-indigo-100 text-indigo-800"
                          : "bg-green-100 text-green-800"
                      }`}
                    >
                      <Briefcase className="w-3 h-3 mr-1.5" />
                      {emp.role.charAt(0).toUpperCase() + emp.role.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Hash className="w-4 h-4 text-gray-400 mr-2" />
                      <span className="text-sm text-gray-700">
                        {employeeBookingsCount.get(emp.id) || 0}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => openEditModal(emp)}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(emp.id)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
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
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingEmployee ? "Edit Employee" : "Add Employee"}
      >
        <EmployeeForm
          employee={editingEmployee}
          onSave={handleSave}
          onCancel={() => setIsModalOpen(false)}
        />
      </Modal>
    </div>
  );
}
