import React from "react";
import { useTranslation } from "react-i18next";

interface PricingFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  onSearchSubmit: () => void;
  filterType: string;
  onFilterChange: (value: string) => void;
}

export const PricingFilters: React.FC<PricingFiltersProps> = ({
  searchTerm,
  onSearchChange,
  onSearchSubmit,
  filterType,
  onFilterChange,
}) => {
  const { t } = useTranslation();

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      onSearchSubmit();
    }
  };

  return (
    <div className="bg-card text-card-foreground rounded-2xl p-6 shadow-sm border border-border">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder={t("searchProgramsPlaceholder") as string}
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full px-4 py-2 border border-input rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent bg-background text-foreground placeholder:text-muted-foreground transition-colors"
          />
        </div>
        <select
          value={filterType}
          onChange={(e) => onFilterChange(e.target.value)}
          className="px-4 py-2 border border-input rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent bg-background text-foreground transition-colors"
        >
          <option value="all">{t("allTypes")}</option>
          <option value="Hajj">Hajj</option>
          <option value="Umrah">Umrah</option>
          <option value="Tourism">Tourism</option>
        </select>
      </div>
    </div>
  );
};
