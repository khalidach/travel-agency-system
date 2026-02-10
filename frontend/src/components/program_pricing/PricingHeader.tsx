import React from "react";
import { HelpCircle } from "lucide-react";
import { useTranslation } from "react-i18next";

interface PricingHeaderProps {
  onOpenHelp: () => void;
}

export const PricingHeader: React.FC<PricingHeaderProps> = ({ onOpenHelp }) => {
  const { t } = useTranslation();

  return (
    <div className="flex justify-between items-start">
      <div>
        <h1 className="text-2xl font-bold mb-6 dark:text-gray-100">
          {t("programPricing")}
        </h1>
        <p className="text-gray-600 dark:text-gray-400 -mt-4 mb-4">
          {t("programPricingSubtitle")}
        </p>
      </div>
      <button
        onClick={onOpenHelp}
        className="p-2 text-gray-500 bg-gray-100 rounded-full hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
        aria-label="Help"
      >
        <HelpCircle className="w-6 h-6" />
      </button>
    </div>
  );
};
