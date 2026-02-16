import { useTranslation } from "react-i18next";

interface BulkModeToggleProps {
  isBulkMode: boolean;
  setIsBulkMode: (val: boolean) => void;
}

export const BulkModeToggle = ({
  isBulkMode,
  setIsBulkMode,
}: BulkModeToggleProps) => {
  const { t } = useTranslation();

  return (
    <div className="flex items-center justify-end">
      <label
        htmlFor="bulk-mode-toggle"
        className="flex items-center cursor-pointer"
      >
        <span className="mr-3 text-sm font-medium text-gray-900 dark:text-gray-100">
          {t("bulkAdd")}
        </span>
        <div className="relative">
          <input
            type="checkbox"
            id="bulk-mode-toggle"
            className="sr-only"
            checked={isBulkMode}
            onChange={() => setIsBulkMode(!isBulkMode)}
          />
          <div className="block bg-gray-200 dark:bg-gray-700 w-14 h-8 rounded-full"></div>
          <div
            className={`dot absolute left-1 top-1 bg-white dark:bg-gray-400 w-6 h-6 rounded-full transition-transform ${
              isBulkMode ? "translate-x-6 bg-blue-600" : ""
            }`}
          ></div>
        </div>
      </label>
    </div>
  );
};
