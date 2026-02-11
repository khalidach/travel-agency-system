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
        <h1 className="text-2xl font-bold mb-6 text-foreground">
          {t("programPricing")}
        </h1>
        <p className="text-muted-foreground -mt-4 mb-4">
          {t("programPricingSubtitle")}
        </p>
      </div>
      <button
        onClick={onOpenHelp}
        className="p-2 text-secondary-foreground bg-secondary rounded-full hover:bg-secondary/80 transition-colors"
        aria-label="Help"
      >
        <HelpCircle className="w-6 h-6" />
      </button>
    </div>
  );
};
