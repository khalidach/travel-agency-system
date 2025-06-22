import React, { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Download, Upload, Calendar } from "lucide-react";

// Components
import Modal from "../components/Modal";
import BookingForm, { BookingFormData } from "../components/BookingForm";
import ProgramCard from "../components/booking/ProgramCard";
import BookingSkeleton from "../components/skeletons/BookingSkeleton";

// Types and API
import type { Program, PaginatedResponse, Payment } from "../context/models";
import * as api from "../services/api";
import { toast } from "react-hot-toast";

export default function Booking() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // State for Modals and Forms
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Data Fetching
  const { data: programResponse, isLoading: isLoadingPrograms } = useQuery<
    PaginatedResponse<Program>
  >({
    queryKey: ["programs", "all"],
    queryFn: () => api.getPrograms(1, 1000),
  });
  const programs = programResponse?.data ?? [];

  // Mutations
  const { mutate: createBooking } = useMutation({
    mutationFn: (data: {
      bookingData: BookingFormData;
      initialPayments: Payment[];
    }) =>
      api.createBooking({
        ...data.bookingData,
        advancePayments: data.initialPayments,
      }),
    onSuccess: (newBooking) => {
      queryClient.invalidateQueries({ queryKey: ["programs"] }); // To update booking counts
      toast.success("Booking created! Navigating to booking page...");
      setIsBookingModalOpen(false);
      // Navigate to the new booking's program page
      navigate(`/booking/program/${newBooking.tripId}`);
    },
    onError: (error: Error) =>
      toast.error(error.message || "Failed to create booking."),
  });

  const { mutate: importBookings, isPending: isImporting } = useMutation({
    mutationFn: api.importBookings,
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["programs"] }); // To update booking counts
      toast.success(result.message);
    },
    onError: (error: Error) => toast.error(error.message || "Import failed."),
    onSettled: () => {
      setImportFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
  });

  // Event Handlers
  const handleProgramSelect = (pId: number) => {
    navigate(`/booking/program/${pId}`);
  };

  const handleAddBooking = () => {
    setIsBookingModalOpen(true);
  };

  const handleSaveBooking = (
    bookingData: BookingFormData,
    initialPayments: Payment[]
  ) => {
    // Only creation is possible from this page, not editing.
    createBooking({ bookingData, initialPayments });
  };

  const handleExportTemplate = async () => {
    toast.loading("Generating template...");
    try {
      const blob = await api.exportBookingTemplate();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "Booking_Template.xlsx";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.dismiss();
      toast.success("Template downloaded!");
    } catch (error) {
      toast.dismiss();
      toast.error("Failed to download template.");
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImportFile(e.target.files[0]);
    }
  };

  const handleImport = () => {
    if (!importFile) {
      toast.error("Please select a file to import.");
      return;
    }
    importBookings(importFile);
  };

  if (isLoadingPrograms) {
    return <BookingSkeleton />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Select a Program</h1>
          <p className="text-gray-600 mt-2">
            Choose a program to view its bookings, or create a new booking.
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex items-center gap-x-3">
          <button
            onClick={handleExportTemplate}
            className="inline-flex items-center px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors shadow-sm"
          >
            <Download className="w-5 h-5 mr-2" />
            Download Template
          </button>
          <input
            type="file"
            accept=".xlsx"
            ref={fileInputRef}
            onChange={handleFileSelect}
            style={{ display: "none" }}
          />
          {importFile ? (
            <button
              onClick={handleImport}
              disabled={isImporting}
              className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors shadow-sm disabled:bg-gray-400"
            >
              <Upload className="w-5 h-5 mr-2" />
              {isImporting ? "Uploading..." : "Upload File"}
            </button>
          ) : (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors shadow-sm"
            >
              <Upload className="w-5 h-5 mr-2" />
              Import
            </button>
          )}
          <button
            onClick={handleAddBooking}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Plus className="w-5 h-5 mr-2" />
            {t("addBooking")}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {programs.map((program) => (
          <ProgramCard
            key={program.id}
            program={program}
            bookingCount={program.totalBookings || 0}
            onClick={() => handleProgramSelect(program.id)}
          />
        ))}
        {programs.length === 0 && !isLoadingPrograms && (
          <div className="col-span-full text-center py-12 bg-white rounded-2xl">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Calendar className="w-12 h-12 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No programs found
            </h3>
            <p className="text-gray-500 mb-6">
              Create a program on the 'Programs' page to get started.
            </p>
            <button
              onClick={() => navigate("/programs")}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-5 h-5 mr-2" />
              Create Program
            </button>
          </div>
        )}
      </div>

      <Modal
        isOpen={isBookingModalOpen}
        onClose={() => setIsBookingModalOpen(false)}
        title={t("addBooking")}
        size="xl"
      >
        <BookingForm
          booking={null} // Always null since we only create from this page
          programs={programs}
          onSave={handleSaveBooking}
          onCancel={() => setIsBookingModalOpen(false)}
        />
      </Modal>
    </div>
  );
}
