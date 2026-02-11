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
    <div className="flex justify-between items-center py-3 px-6 border-t border-border bg-card text-card-foreground rounded-b-2xl">
      <button
        onClick={() => onPageChange(Math.max(currentPage - 1, 1))}
        disabled={currentPage === 1}
        className="inline-flex items-center px-3 py-1 text-sm bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
            <span key={i} className="px-3 py-1 text-sm text-muted-foreground">
              ...
            </span>
          ) : (
            <button
              key={i}
              onClick={() => onPageChange(page)}
              className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                currentPage === page
                  ? "bg-primary text-primary-foreground font-bold shadow-sm"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
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
        className="inline-flex items-center px-3 py-1 text-sm bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {t("next")}
        <ChevronRight className="w-4 h-4 ml-1" />
      </button>
    </div>
  );
}
