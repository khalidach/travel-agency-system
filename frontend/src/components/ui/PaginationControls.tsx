// frontend/src/components/ui/PaginationControls.tsx
import React from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";

interface PaginationControlsProps {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  limit: number;
  onPageChange: (page: number) => void;
}

const PaginationControls: React.FC<PaginationControlsProps> = ({
  currentPage,
  totalPages,
  totalCount,
  limit,
  onPageChange,
}) => {
  const { t } = useTranslation();

  const isFirstPage = currentPage === 1;
  const isLastPage = currentPage === totalPages || totalPages === 0;

  const startIndex = (currentPage - 1) * limit + 1;
  const endIndex = Math.min(currentPage * limit, totalCount);

  if (totalPages <= 1 && totalCount <= limit) return null;

  return (
    <div className="flex items-center justify-between border-t border-border bg-card px-4 py-3 sm:px-6 shadow-sm rounded-lg mt-4">
      <div className="flex-1 flex justify-between sm:hidden">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={isFirstPage}
          className="relative inline-flex items-center rounded-md border border-border bg-card px-4 py-2 text-sm font-medium text-card-foreground hover:bg-accent disabled:opacity-50"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          {t("previous")}
        </button>
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={isLastPage}
          className="relative inline-flex items-center rounded-md border border-border bg-card px-4 py-2 text-sm font-medium text-card-foreground hover:bg-accent disabled:opacity-50"
        >
          {t("next")}
          <ArrowRight className="w-5 h-5 ml-2" />
        </button>
      </div>
      <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            {t("showing")} <span className="font-medium text-foreground">{startIndex}</span>{" "}
            {t("to")} <span className="font-medium text-foreground">{endIndex}</span> {t("of")}{" "}
            <span className="font-medium text-foreground">{totalCount}</span> {t("results")}
          </p>
        </div>
        <div>
          <nav
            className="relative z-0 inline-flex -space-x-px rounded-md shadow-sm"
            aria-label="Pagination"
          >
            <button
              onClick={() => onPageChange(currentPage - 1)}
              disabled={isFirstPage}
              className="relative inline-flex items-center rounded-l-md border border-border bg-card px-2 py-2 text-sm font-medium text-muted-foreground hover:bg-accent disabled:opacity-50"
            >
              <span className="sr-only">{t("previous")}</span>
              <ArrowLeft className="h-5 w-5" aria-hidden="true" />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(
              (pageNumber) => (
                <button
                  key={pageNumber}
                  onClick={() => onPageChange(pageNumber)}
                  aria-current={currentPage === pageNumber ? "page" : undefined}
                  className={`relative inline-flex items-center border px-4 py-2 text-sm font-medium ${
                    currentPage === pageNumber
                      ? "z-10 bg-primary/10 border-primary text-primary"
                      : "bg-card border-border text-muted-foreground hover:bg-accent"
                  }`}
                >
                  {pageNumber}
                </button>
              )
            )}
            <button
              onClick={() => onPageChange(currentPage + 1)}
              disabled={isLastPage}
              className="relative inline-flex items-center rounded-r-md border border-border bg-card px-2 py-2 text-sm font-medium text-muted-foreground hover:bg-accent disabled:opacity-50"
            >
              <span className="sr-only">{t("next")}</span>
              <ArrowRight className="h-5 w-5" aria-hidden="true" />
            </button>
          </nav>
        </div>
      </div>
    </div>
  );
};

export default PaginationControls;
