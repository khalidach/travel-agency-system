// frontend/src/pages/Facturation.tsx
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Download,
  Edit2,
  Trash2,
  FileText,
  HelpCircle,
} from "lucide-react";
import * as api from "../services/api";
import { Facture, PaginatedResponse } from "../context/models";
import Modal from "../components/Modal";
import ConfirmationModal from "../components/modals/ConfirmationModal";
import FactureForm from "../components/facturation/FactureForm";
import FacturePDF from "../components/facturation/FacturePDF";
import { toast } from "react-hot-toast";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import { usePagination } from "../hooks/usePagination";
import PaginationControls from "../components/booking/PaginationControls";
import VideoHelpModal from "../components/VideoHelpModal";

export default function Facturation() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFacture, setEditingFacture] = useState<Facture | null>(null);
  const [factureToDelete, setFactureToDelete] = useState<number | null>(null);
  const [factureToPreview, setFactureToPreview] = useState<Facture | null>(
    null,
  );
  const [currentPage, setCurrentPage] = useState(1);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const facturesPerPage = 10;

  const { data: facturesResponse, isLoading } = useQuery<
    PaginatedResponse<Facture>
  >({
    queryKey: ["factures", currentPage],
    queryFn: () => api.getFactures(currentPage, facturesPerPage),
    placeholderData: (prev) => prev,
  });

  const factures = facturesResponse?.data ?? [];
  const pagination = facturesResponse?.pagination;

  const paginationRange = usePagination({
    currentPage,
    totalCount: pagination?.totalCount ?? 0,
    pageSize: facturesPerPage,
    siblingCount: 1,
  });

  const { mutate: createFacture } = useMutation({
    mutationFn: (
      data: Omit<
        Facture,
        "id" | "facture_number" | "createdAt" | "updatedAt" | "userId"
      >,
    ) => {
      return api.createFacture(
        data as unknown as Omit<Facture, "id" | "createdAt" | "updatedAt">,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["factures"] });
      toast.success("Document created successfully!");
      setIsModalOpen(false);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const { mutate: updateFacture } = useMutation({
    mutationFn: (data: Facture) => api.updateFacture(data.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["factures"] });
      toast.success("Document updated successfully!");
      setIsModalOpen(false);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const { mutate: deleteFacture } = useMutation({
    mutationFn: (id: number) => api.deleteFacture(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["factures"] });
      toast.success("Document deleted successfully!");
      setFactureToDelete(null);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const handleSave = (
    data: Omit<
      Facture,
      "id" | "facture_number" | "createdAt" | "updatedAt" | "userId"
    >,
  ) => {
    if (editingFacture) {
      updateFacture({ ...editingFacture, ...data });
    } else {
      createFacture(data);
    }
  };

  const handleDownloadPDF = async (facture: Facture) => {
    setFactureToPreview(facture);
    // Increased timeout slightly to ensure rendering completes
    await new Promise((resolve) => setTimeout(resolve, 300));

    const input = document.getElementById("pdf-preview");
    if (input) {
      html2canvas(input, { scale: 2 }).then((canvas) => {
        const imgData = canvas.toDataURL("image/png");
        const pdf = new jsPDF("p", "mm", "a4");
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
        pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
        pdf.save(
          `${facture.type}_${facture.clientName.replace(/\s/g, "_")}.pdf`,
        );
        setFactureToPreview(null);
      });
    }
  };

  const handleNewDocumentClick = () => {
    setEditingFacture(null);
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            {t("facturationTitle")}
          </h1>
          <p className="text-muted-foreground mt-2">
            {t("facturationSubtitle")}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setIsHelpModalOpen(true)}
            className="p-2 text-muted-foreground bg-secondary hover:bg-secondary/80 rounded-full transition-colors"
            aria-label="Help"
          >
            <HelpCircle className="w-6 h-6" />
          </button>
          <button
            onClick={handleNewDocumentClick}
            className="inline-flex items-center px-4 py-2 bg-primary text-white rounded-xl hover:bg-primary/90 shadow-sm transition-colors"
          >
            <Plus
              className={`w-5 h-5 ${
                document.documentElement.dir === "rtl" ? "ml-2" : "mr-2"
              }`}
            />
            {t("newDocument")}
          </button>
        </div>
      </div>

      <div className="bg-card text-card-foreground rounded-2xl shadow-sm border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                {[
                  "N°",
                  "documentType",
                  "clientName",
                  "documentDate",
                  "total",
                  "actions",
                ].map((h) => (
                  <th
                    key={h}
                    className="px-6 py-4 text-xs font-medium text-muted-foreground uppercase tracking-wider text-left"
                  >
                    {t(h)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr>
                  <td
                    colSpan={6}
                    className="text-center p-4 text-muted-foreground"
                  >
                    Loading...
                  </td>
                </tr>
              ) : factures.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center p-12">
                    <FileText className="w-12 h-12 mx-auto text-muted-foreground/50" />
                    <h3 className="mt-2 text-sm font-medium text-foreground">
                      {t("noDocuments")}
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {t("createFirstDocument")}
                    </p>
                  </td>
                </tr>
              ) : (
                factures.map((facture) => (
                  <tr
                    key={facture.id}
                    className="hover:bg-muted/50 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">
                      {facture.facture_number}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm capitalize text-muted-foreground">
                      {t(facture.type)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                      {facture.clientName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                      {new Date(facture.date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                      {facture.total.toLocaleString()} {t("mad")}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleDownloadPDF(facture)}
                          className="p-2 text-muted-foreground hover:text-green-600 dark:hover:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                          title={t("download") || "Download"}
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setEditingFacture(facture);
                            setIsModalOpen(true);
                          }}
                          className="p-2 text-muted-foreground hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                          title={t("edit") || "Edit"}
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setFactureToDelete(facture.id)}
                          className="p-2 text-muted-foreground hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          title={t("delete") || "Delete"}
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
        {pagination && pagination.totalPages > 1 && (
          <div className="p-4 border-t border-border">
            <PaginationControls
              currentPage={currentPage}
              totalPages={pagination.totalPages}
              onPageChange={setCurrentPage}
              paginationRange={paginationRange}
            />
          </div>
        )}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingFacture(null);
        }}
        title={editingFacture ? t("updateDocument") : t("newDocument")}
        size="xl"
      >
        <FactureForm
          onSave={handleSave}
          onCancel={() => setIsModalOpen(false)}
          existingFacture={editingFacture}
          showMarginOnNew={!editingFacture}
        />
      </Modal>

      <ConfirmationModal
        isOpen={!!factureToDelete}
        onClose={() => setFactureToDelete(null)}
        onConfirm={() => deleteFacture(factureToDelete!)}
        title={t("deleteDocumentTitle")}
        message={t("deleteDocumentMessage")}
      />

      {/* This div is strictly for PDF generation. 
        It must remain hidden from view and standard light colors (white paper) for printing.
      */}
      {factureToPreview && (
        <div style={{ position: "fixed", left: "-9999px", top: "-9999px" }}>
          <div id="pdf-preview">
            <FacturePDF facture={factureToPreview} />
          </div>
        </div>
      )}
      <VideoHelpModal
        isOpen={isHelpModalOpen}
        onClose={() => setIsHelpModalOpen(false)}
        videoId="S_kIsNdsGys"
        title="Facturation Management"
      />
    </div>
  );
}
