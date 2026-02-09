// frontend/src/components/booking/PaginationControls.tsx
import { useTranslation } from "react-i18next";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationControlsProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  paginationRange: (string | number)[];
}

export default function PaginationControls({
  currentPage,
  totalPages,
  onPageChange,
  paginationRange,
}: PaginationControlsProps) {
  const { t } = useTranslation();
  if (totalPages <= 1) return null;

  return (
    <div className="flex justify-between items-center py-3 px-6 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-b-2xl">
      <button
        onClick={() => onPageChange(Math.max(currentPage - 1, 1))}
        disabled={currentPage === 1}
        className="inline-flex items-center px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <ChevronLeft
          className={`w-4 h-4 ${
            document.documentElement.dir === "rtl" ? "ml-1" : "mr-1"
          }`}
        />
        {t("previous")}
      </button>
      <div className="flex items-center space-x-1">
        {paginationRange.map((page, i) =>
          typeof page === "string" ? (
            <span
              key={i}
              className="px-3 py-1 text-sm text-gray-400 dark:text-gray-500"
            >
              ...
            </span>
          ) : (
            <button
              key={i}
              onClick={() => onPageChange(page)}
              className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                currentPage === page
                  ? "bg-blue-600 text-white font-bold shadow-sm"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
              }`}
            >
              {page}
            </button>
          ),
        )}
      </div>
      <button
        onClick={() => onPageChange(Math.min(currentPage + 1, totalPages))}
        disabled={currentPage === totalPages}
        className="inline-flex items-center px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {t("next")}
        <ChevronRight className="w-4 h-4 ml-1" />
      </button>
    </div>
  );
}
