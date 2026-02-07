// frontend/src/components/booking/FormActions.tsx
import React from "react";
import { useTranslation } from "react-i18next";

interface FormActionsProps {
  onCancel: () => void;
  isValid: boolean;
  isEditing: boolean;
}

export const FormActions = ({
  onCancel,
  isValid,
  isEditing,
}: FormActionsProps) => {
  const { t } = useTranslation();

  return (
    <div className="flex justify-end space-x-3 pt-6 border-t dark:border-gray-600 mt-6">
      <button
        type="button"
        onClick={onCancel}
        className="px-4 py-2 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
      >
        {t("cancel")}
      </button>
      <button
        type="submit"
        disabled={!isValid}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 dark:disabled:bg-gray-600 disabled:cursor-not-allowed"
      >
        {isEditing ? t("update") : t("save")}
      </button>
    </div>
  );
};
