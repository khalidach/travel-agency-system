// frontend/src/components/booking_form/PricingFields.tsx
import { useFormContext, Controller } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useAuthContext } from "../../context/AuthContext";
import { BookingFormData } from "./types";

interface PricingFieldsProps {
  handleSellingPriceChange: (price: number) => void;
}

const PricingFields = ({ handleSellingPriceChange }: PricingFieldsProps) => {
  const { t } = useTranslation();
  const {
    control,
    formState: { errors },
  } = useFormContext<BookingFormData>();
  const { state: authState } = useAuthContext();
  const userRole = authState.user?.role;

  return (
    <div
      className={`grid grid-cols-1 ${
        userRole === "admin" ? "md:grid-cols-3" : ""
      } gap-4`}
    >
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {t("sellingPrice")} ({t("mad")})
        </label>
        <Controller
          name="sellingPrice"
          control={control}
          rules={{
            required: t("sellingPrice") + " " + t("isRequired"),
            min: 0,
          }}
          render={({ field }) => (
            <input
              {...field}
              type="number"
              onChange={(e) => {
                field.onChange(e.target.value);
                handleSellingPriceChange(Number(e.target.value));
              }}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              min="0"
              step="0.01"
            />
          )}
        />
        {errors.sellingPrice && (
          <p className="text-red-500 dark:text-red-400 text-sm mt-1">
            {errors.sellingPrice.message}
          </p>
        )}
      </div>

      {userRole === "admin" && (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t("basePrice")} ({t("mad")})
            </label>
            <Controller
              name="basePrice"
              control={control}
              render={({ field }) => (
                <input
                  {...field}
                  type="number"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  readOnly
                />
              )}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t("profit")} ({t("mad")})
            </label>
            <Controller
              name="profit"
              control={control}
              render={({ field }) => (
                <input
                  {...field}
                  type="number"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  readOnly
                />
              )}
            />
          </div>
        </>
      )}
    </div>
  );
};

export default PricingFields;
