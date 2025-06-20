import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Edit2,
  Trash2,
  MapPin,
  Calendar,
  Users,
  Package,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import Modal from "../components/Modal";
import ProgramForm from "../components/ProgramForm";
import ProgramsSkeleton from "../components/skeletons/ProgramsSkeleton";
import type { Program, PaginatedResponse } from "../context/models";
import * as api from "../services/api";
import { toast } from "react-hot-toast";
import { usePagination } from "../hooks/usePagination";

export default function Programs() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [currentPage, setCurrentPage] = useState(1);
  const programsPerPage = 6;

  const {
    data: programResponse,
    isLoading,
    isError,
  } = useQuery<PaginatedResponse<Program>>({
    queryKey: ["programs", currentPage],
    queryFn: () => api.getPrograms(currentPage, programsPerPage),
  });

  const programs = programResponse?.data ?? [];
  const pagination = programResponse?.pagination;

  const { mutate: createProgram } = useMutation({
    mutationFn: api.createProgram,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["programs"] });
      toast.success("Program created successfully!");
      setIsModalOpen(false);
    },
    onError: () => {
      toast.error("Failed to create program.");
    },
  });

  const { mutate: updateProgram } = useMutation({
    mutationFn: (program: Program) => api.updateProgram(program.id, program),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["programs"] });
      toast.success("Program updated successfully!");
      setIsModalOpen(false);
      setEditingProgram(null);
    },
    onError: () => {
      toast.error("Failed to update program.");
    },
  });

  const { mutate: deleteProgram } = useMutation({
    mutationFn: api.deleteProgram,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["programs"] });
      toast.success("Program deleted successfully!");
    },
    onError: () => {
      toast.error("Failed to delete program.");
    },
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProgram, setEditingProgram] = useState<Program | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("all");

  const filteredPrograms = programs.filter((program) => {
    const matchesSearch = program.name
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesType = filterType === "all" || program.type === filterType;
    return matchesSearch && matchesType;
  });

  const paginationRange = usePagination({
    currentPage,
    totalCount: pagination?.totalCount ?? 0,
    pageSize: programsPerPage,
  });

  const handleAddProgram = () => {
    setEditingProgram(null);
    setIsModalOpen(true);
  };

  const handleEditProgram = (program: Program) => {
    setEditingProgram(program);
    setIsModalOpen(true);
  };

  const handleDeleteProgram = (programId: number) => {
    if (window.confirm("Are you sure you want to delete this program?")) {
      deleteProgram(programId);
    }
  };

  const handleSaveProgram = (program: Program) => {
    if (editingProgram) {
      updateProgram(program);
    } else {
      createProgram(program);
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "Hajj":
        return "bg-blue-100 text-blue-700";
      case "Umrah":
        return "bg-emerald-100 text-emerald-700";
      case "Tourism":
        return "bg-orange-100 text-orange-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  if (isLoading) {
    return <ProgramsSkeleton />;
  }

  if (isError) {
    return <div>Error loading programs.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t("programs")}</h1>
          <p className="text-gray-600 mt-2">
            Manage your travel programs and packages
          </p>
        </div>
        <button
          onClick={handleAddProgram}
          className="mt-4 sm:mt-0 inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors shadow-sm"
        >
          <Plus className="w-5 h-5 mr-2" />
          {t("addProgram")}
        </button>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder={`${t("search")} programs...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Types</option>
            <option value="Hajj">Hajj</option>
            <option value="Umrah">Umrah</option>
            <option value="Tourism">Tourism</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredPrograms.map((program) => (
          <div
            key={program.id}
            className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200"
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {program.name}
                </h3>
                <span
                  className={`inline-block px-3 py-1 text-sm font-medium rounded-full mt-2 ${getTypeColor(
                    program.type
                  )}`}
                >
                  {program.type}
                </span>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => handleEditProgram(program)}
                  className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDeleteProgram(program.id)}
                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center text-sm text-gray-600">
                <Calendar className="w-4 h-4 mr-2" />
                <span>{program.duration} days</span>
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <MapPin className="w-4 h-4 mr-2" />
                <span>
                  {program.cities.map((city) => city.name).join(", ")}
                </span>
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <Users className="w-4 h-4 mr-2" />
                <span>
                  {(program.packages ?? []).length} package
                  {(program.packages ?? []).length !== 1 ? "s" : ""}
                </span>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="flex flex-wrap gap-2">
                {(program.packages ?? []).map((pkg, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-md"
                  >
                    {pkg.name}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {pagination && pagination.totalPages > 1 && (
        <div className="flex justify-between items-center py-3 px-6 border-t border-gray-200 bg-white rounded-b-2xl">
          <button
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className="inline-flex items-center px-3 py-1 text-sm bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Previous
          </button>
          <div className="flex items-center space-x-1">
            {paginationRange.map((pageNumber, index) => {
              if (typeof pageNumber === "string") {
                return (
                  <span key={index} className="px-3 py-1 text-sm text-gray-400">
                    ...
                  </span>
                );
              }
              return (
                <button
                  key={index}
                  onClick={() => setCurrentPage(pageNumber)}
                  className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                    currentPage === pageNumber
                      ? "bg-blue-600 text-white font-bold shadow-sm"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {pageNumber}
                </button>
              );
            })}
          </div>
          <button
            onClick={() =>
              setCurrentPage((prev) =>
                Math.min(prev + 1, pagination.totalPages)
              )
            }
            disabled={currentPage === pagination.totalPages}
            className="inline-flex items-center px-3 py-1 text-sm bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
            <ChevronRight className="w-4 h-4 ml-1" />
          </button>
        </div>
      )}

      {filteredPrograms.length === 0 && !isLoading && (
        <div className="text-center py-12">
          <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Package className="w-12 h-12 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No programs found
          </h3>
          <p className="text-gray-500 mb-6">
            Create your first program to get started.
          </p>
        </div>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingProgram(null);
        }}
        title={editingProgram ? t("editProgram") : t("addProgram")}
        size="xl"
      >
        <ProgramForm
          program={editingProgram}
          onSave={handleSaveProgram}
          onCancel={() => {
            setIsModalOpen(false);
            setEditingProgram(null);
          }}
        />
      </Modal>
    </div>
  );
}
