// frontend/src/components/booking/BookingPageHeader.tsx
import React, { useRef } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Plus, Download, Upload, ChevronLeft } from "lucide-react";
import type { Program } from "../../context/models";

interface BookingPageHeaderProps {
  program: Program | undefined;
  onAddBooking: () => void;
  onExportTemplate: () => void;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onImport: () => void;
  isImporting: boolean;
  importFile: File | null;
}

export default function BookingPageHeader({
  program,
  onAddBooking,
  onExportTemplate,
  onFileSelect,
  onImport,
  isImporting,
  importFile,
}: BookingPageHeaderProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-4">
      {/* Title row */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate("/booking")}
          className="p-2 bg-gray-100 dark:bg-gray-700 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-gray-700 dark:text-gray-300" />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            {t("bookingsFor")} {program?.name || t("booking")}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {t("manageBookingsSubtitle")}
          </p>
        </div>
      </div>

      {/* Action buttons row */}
      <div className="flex items-center justify-end gap-x-3">

        <button
          onClick={onExportTemplate}
          className="inline-flex items-center px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors shadow-sm"
        >
          <Download className={`w-5 h-5 mr-2`} />
          {t("downloadTemplate")}
        </button>
        <input
          type="file"
          accept=".xlsx"
          ref={fileInputRef}
          onChange={onFileSelect}
          style={{ display: "none" }}
        />
        {importFile ? (
          <button
            onClick={onImport}
            disabled={isImporting}
            className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors shadow-sm disabled:bg-gray-400"
          >
            <Upload className={`w-5 h-5 mr-2`} />
            {isImporting ? t("uploading") : t("uploadFile")}
          </button>
        ) : (
          <button
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors shadow-sm"
          >
            <Upload className={`w-5 h-5 mr-2`} />
            {t("import")}
          </button>
        )}


        <button
          onClick={onAddBooking}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors shadow-sm"
        >
          <Plus className={`w-5 h-5 mr-2`} />
          {t("addBooking")}
        </button>
      </div>
    </div>
  );
}
