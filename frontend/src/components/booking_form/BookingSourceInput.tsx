// frontend/src/components/booking/BookingSourceInput.tsx
import { useFormContext } from "react-hook-form";
import { useTranslation } from "react-i18next";

export const BookingSourceInput = () => {
  const { t } = useTranslation();
  const { register } = useFormContext();

  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        {t("bookingSource") || "مصدر الحجز (Booking Source)"}
      </label>
      <input
        type="text"
        {...register("bookingSource")}
        placeholder={
          (t("bookingSourcePlaceholder") as string) ||
          "Facebook, Friend, Recommendation..."
        }
        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
      />
    </div>
  );
};
