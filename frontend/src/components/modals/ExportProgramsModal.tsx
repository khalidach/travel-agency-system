// frontend/src/components/modals/ExportProgramsModal.tsx
import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "react-hot-toast";
import { Search, FileSpreadsheet, Calendar, BookOpen, Loader2 } from "lucide-react";
import Modal from "../Modal";
import * as api from "../../services/api";

interface Program {
  id: number;
  name: string;
  type: string;
  createdAt: string;
  totalBookings?: number;
}

interface ExportProgramsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ExportProgramsModal({ isOpen, onClose }: ExportProgramsModalProps) {
  const { t } = useTranslation();
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isExporting, setIsExporting] = useState(false);

  // Fetch all programs (unpaginated)
  const { data: programsResponse, isLoading } = useQuery<{ data: Program[] }>({
    queryKey: ["allProgramsForExport"],
    queryFn: api.getAllPrograms,
    enabled: isOpen,
  });

  const rawPrograms = programsResponse?.data ?? [];

  // Sort programs from newest to oldest (by createdAt, fallback to ID)
  const sortedPrograms = useMemo(() => {
    return [...rawPrograms].sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      if (dateA === dateB) {
        return b.id - a.id;
      }
      return dateB - dateA;
    });
  }, [rawPrograms]);

  // Filter programs based on local search input
  const filteredPrograms = useMemo(() => {
    if (!searchQuery) return sortedPrograms;
    return sortedPrograms.filter((p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [sortedPrograms, searchQuery]);

  // Reset selection and search on open
  useEffect(() => {
    if (isOpen) {
      setSelectedIds([]);
      setSearchQuery("");
    }
  }, [isOpen]);

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    const visibleIds = filteredPrograms.map((p) => p.id);
    setSelectedIds((prev) => Array.from(new Set([...prev, ...visibleIds])));
  };

  const handleDeselectAll = () => {
    const visibleIds = filteredPrograms.map((p) => p.id);
    setSelectedIds((prev) => prev.filter((id) => !visibleIds.includes(id)));
  };

  const handleExport = async () => {
    if (selectedIds.length === 0) return;
    setIsExporting(true);
    const loadingToast = toast.loading(t("exporting") || "Exporting...");
    try {
      const blob = await api.exportMultiProgramsToExcel(selectedIds);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const dateStr = new Date().toISOString().split("T")[0];
      a.download = `programs_export_${dateStr}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success(t("exportSuccess") || "Export successful!");
      onClose();
    } catch (error) {
      toast.error((error as Error).message || t("exportFailed") || "Export failed.");
    } finally {
      toast.dismiss(loadingToast);
      setIsExporting(false);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A";
    try {
      return new Date(dateString).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return "N/A";
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t("selectProgramsToExport") || "Select Programs to Export"}
      size="lg"
      level={1}
    >
      <div className="space-y-4">
        {/* Search & Actions Header */}
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-2.5 h-4.5 w-4.5 text-muted-foreground" />
            <input
              type="text"
              placeholder={t("searchPrograms") || "Search programs..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm border border-border rounded-lg bg-card text-foreground focus:ring-2 focus:ring-blue-500 focus:outline-none focus:border-transparent transition-all"
            />
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <button
              onClick={handleSelectAll}
              type="button"
              className="flex-1 sm:flex-none text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 px-3 py-2 border border-blue-200 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
            >
              {t("selectAll") || "Select All"}
            </button>
            <button
              onClick={handleDeselectAll}
              type="button"
              className="flex-1 sm:flex-none text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 px-3 py-2 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              {t("deselectAll") || "Deselect All"}
            </button>
          </div>
        </div>

        {/* Programs List */}
        <div className="border border-border rounded-xl overflow-hidden max-h-[50vh] overflow-y-auto bg-card divide-y divide-border">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500 mb-2" />
              <span>{t("loading") || "Loading programs..."}</span>
            </div>
          ) : filteredPrograms.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-sm font-medium">{t("noProgramsFound") || "No programs found"}</p>
            </div>
          ) : (
            filteredPrograms.map((program) => {
              const isSelected = selectedIds.includes(program.id);
              return (
                <div
                  key={program.id}
                  onClick={() => toggleSelect(program.id)}
                  className={`flex items-start justify-between p-4 cursor-pointer hover:bg-accent transition-colors ${
                    isSelected ? "bg-blue-50/50 dark:bg-blue-900/10" : ""
                  }`}
                >
                  <div className="flex gap-3">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {}} // handled by row click
                      className="mt-1 h-4 w-4 rounded text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600"
                    />
                    <div>
                      <h4 className="font-semibold text-sm text-foreground">{program.name}</h4>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1.5 font-medium px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                          {program.type}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          {formatDate(program.createdAt)}
                        </span>
                        <span className="flex items-center gap-1">
                          <BookOpen className="h-3.5 w-3.5" />
                          {program.totalBookings ?? 0} {t("bookings") || "Bookings"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Selected Counter & Actions Footer */}
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between pt-4 border-t border-border">
          <div className="text-sm text-muted-foreground">
            {selectedIds.length === 0 ? (
              t("noProgramsSelected") || "No programs selected"
            ) : (
              <span>
                <strong>{selectedIds.length}</strong> {t("programs_other") || "programs"} selected
              </span>
            )}
          </div>
          <div className="flex gap-3 w-full sm:w-auto justify-end">
            <button
              onClick={onClose}
              type="button"
              className="w-full sm:w-auto px-4 py-2 border border-border text-sm font-medium rounded-lg text-foreground hover:bg-accent focus:outline-none transition-colors"
            >
              {t("cancel")}
            </button>
            <button
              onClick={handleExport}
              disabled={selectedIds.length === 0 || isExporting}
              type="button"
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2 bg-green-600 dark:bg-green-700 hover:bg-green-700 dark:hover:bg-green-600 disabled:bg-gray-200 dark:disabled:bg-gray-800 disabled:text-gray-400 dark:disabled:text-gray-600 text-sm font-semibold text-white rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
            >
              {isExporting ? (
                <>
                  <Loader2 className="h-4.5 w-4.5 animate-spin" />
                  <span>{t("exporting") || "Exporting..."}</span>
                </>
              ) : (
                <>
                  <FileSpreadsheet className="h-4.5 w-4.5" />
                  <span>{t("exportSelected") || "Export Selected"}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
