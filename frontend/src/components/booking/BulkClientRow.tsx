import React from "react";
import { useFormContext, Controller } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Trash2 } from "lucide-react";

interface BulkClientRowProps {
  index: number;
  remove: (index: number) => void;
}

const BulkClientRow = ({ index, remove }: BulkClientRowProps) => {
  const { t } = useTranslation();
  const {
    control,
    formState: { errors },
  } = useFormContext();

  // Helper to safely get nested errors
  const getError = (fieldName: string) => {
    const fieldErrors = errors.clients as any;
    return fieldErrors?.[index]?.[fieldName];
  };

  return (
    <div className="grid grid-cols-12 gap-3 items-start p-3 border-b dark:border-gray-700">
      {/* Index */}
      <div className="col-span-12 md:col-span-1 flex items-center pt-2">
        <span className="text-gray-500 dark:text-gray-400 font-semibold">
          {index + 1}.
        </span>
      </div>

      {/* Client Info */}
      {/* Updated to 4 columns to accommodate new fields */}
      <div className="col-span-12 md:col-span-10 grid grid-cols-1 md:grid-cols-5 gap-3">
        <div className="md:col-span-2">
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t("clientNameFr")}
          </label>
          <div className="grid grid-cols-2 gap-2">
            <Controller
              name={`clients.${index}.clientNameFr.lastName`}
              control={control}
              rules={{ required: true }}
              render={({ field }) => (
                <input
                  {...field}
                  type="text"
                  placeholder="Last Name"
                  className={`w-full px-2 py-1.5 border rounded-md text-sm dark:bg-gray-700 dark:text-gray-100 ${
                    getError("clientNameFr.lastName")
                      ? "border-red-500"
                      : "border-gray-300 dark:border-gray-600"
                  }`}
                />
              )}
            />
            <Controller
              name={`clients.${index}.clientNameFr.firstName`}
              control={control}
              render={({ field }) => (
                <input
                  {...field}
                  type="text"
                  placeholder="First Name"
                  className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md text-sm dark:bg-gray-700 dark:text-gray-100"
                />
              )}
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t("clientNameAr")}
          </label>
          <Controller
            name={`clients.${index}.clientNameAr`}
            control={control}
            render={({ field }) => (
              <input
                {...field}
                type="text"
                className={`w-full px-2 py-1.5 border rounded-md text-sm dark:bg-gray-700 dark:text-gray-100 ${
                  getError("clientNameAr")
                    ? "border-red-500"
                    : "border-gray-300 dark:border-gray-600"
                }`}
                dir="rtl"
              />
            )}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t("passportNumber")}
          </label>
          <Controller
            name={`clients.${index}.passportNumber`}
            control={control}
            rules={{ required: true }}
            render={({ field }) => (
              <input
                {...field}
                type="text"
                className={`w-full px-2 py-1.5 border rounded-md text-sm dark:bg-gray-700 dark:text-gray-100 ${
                  getError("passportNumber")
                    ? "border-red-500"
                    : "border-gray-300 dark:border-gray-600"
                }`}
              />
            )}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t("phoneNumber")}
          </label>
          <Controller
            name={`clients.${index}.phoneNumber`}
            control={control}
            render={({ field }) => (
              <input
                {...field}
                type="tel"
                className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md text-sm dark:bg-gray-700 dark:text-gray-100"
              />
            )}
          />
        </div>

        {/* --- NEW FIELD: Date of Birth --- */}
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t("dateOfBirth")}
          </label>
          <Controller
            name={`clients.${index}.dateOfBirth`}
            control={control}
            render={({ field }) => (
              <input
                {...field}
                type="date"
                value={field.value ? field.value.split("T")[0] || "" : ""} // Format date for input
                className={`w-full px-2 py-1.5 border rounded-md text-sm dark:bg-gray-700 dark:text-gray-100 ${
                  getError("dateOfBirth")
                    ? "border-red-500"
                    : "border-gray-300 dark:border-gray-600"
                }`}
              />
            )}
          />
        </div>

        {/* --- NEW FIELD: Passport Expiration Date --- */}
        <div className="md:col-span-2">
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t("passportExpirationDate")}
          </label>
          <Controller
            name={`clients.${index}.passportExpirationDate`}
            control={control}
            render={({ field }) => (
              <input
                {...field}
                type="date"
                value={field.value ? field.value.split("T")[0] || "" : ""} // Format date for input
                className={`w-full px-2 py-1.5 border rounded-md text-sm dark:bg-gray-700 dark:text-gray-100 ${
                  getError("passportExpirationDate")
                    ? "border-red-500"
                    : "border-gray-300 dark:border-gray-600"
                }`}
              />
            )}
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t("personType")}
          </label>
          <Controller
            name={`clients.${index}.personType`}
            control={control}
            rules={{ required: true }}
            render={({ field }) => (
              <select
                {...field}
                className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md text-sm dark:bg-gray-700 dark:text-gray-100"
              >
                <option value="adult">{t("adult")}</option>
                <option value="child">{t("child")}</option>
                <option value="infant">{t("infant")}</option>
              </select>
            )}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t("gender")}
          </label>
          <Controller
            name={`clients.${index}.gender`}
            control={control}
            rules={{ required: true }}
            render={({ field }) => (
              <select
                {...field}
                className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md text-sm dark:bg-gray-700 dark:text-gray-100"
              >
                <option value="male">{t("male")}</option>
                <option value="female">{t("female")}</option>
              </select>
            )}
          />
        </div>
      </div>

      {/* Remove Button */}
      <div className="col-span-12 md:col-span-1 flex items-center justify-end pt-2">
        <button
          type="button"
          onClick={() => remove(index)}
          className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default BulkClientRow;
