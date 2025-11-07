import React, { useEffect } from "react";
import { useFormContext, Controller, useWatch, get } from "react-hook-form";
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
    getValues, // Need getValues for validation
    trigger, // Need trigger for cross-field validation
    setValue, // Need setValue to clear passport
  } = useFormContext();

  // Watch for changes in specific fields for this row
  const noPassport = useWatch({
    control,
    name: `clients.${index}.noPassport`,
  });
  const clientNameFrLastName = useWatch({
    control,
    name: `clients.${index}.clientNameFr.lastName`,
  });
  const clientNameAr = useWatch({
    control,
    name: `clients.${index}.clientNameAr`,
  });

  // Helper to safely get nested errors
  const getError = (fieldName: string) => {
    const fieldErrors = errors.clients as any;
    try {
      // Handle nested paths like 'clientNameFr.lastName'
      const parts = fieldName.split(".");
      let error = fieldErrors?.[index];
      for (const part of parts) {
        if (!error) return null;
        error = error[part];
      }
      return error;
    } catch (e) {
      return null;
    }
  };

  // Effect to clear passport number if "No passport" is checked
  useEffect(() => {
    if (noPassport) {
      setValue(`clients.${index}.passportNumber`, "");
      trigger(`clients.${index}.passportNumber`); // Clear errors
    } else {
      trigger(`clients.${index}.passportNumber`); // Re-validate
    }
  }, [noPassport, setValue, trigger, index]);

  // Validation rules
  const nameFrRules = {
    validate: (value: string) => {
      const arName = getValues(`clients.${index}.clientNameAr`);
      return (
        (!!value && value.trim() !== "") ||
        (!!arName && arName.trim() !== "") ||
        (t("clientNameRequired") as string)
      );
    },
  };

  const nameArRules = {
    validate: (value: string) => {
      const frLastName = getValues(`clients.${index}.clientNameFr.lastName`);
      return (
        (!!value && value.trim() !== "") ||
        (!!frLastName && frLastName.trim() !== "") ||
        (t("clientNameRequired") as string)
      );
    },
  };

  const passportRules = {
    required: !noPassport ? (t("passportNumberRequired") as string) : false,
  };

  // Check if either name field has an error, but only if both are empty
  const showNameError =
    (getError("clientNameFr.lastName") || getError("clientNameAr")) &&
    !clientNameFrLastName &&
    !clientNameAr;

  return (
    <div className="grid grid-cols-12 gap-3 items-start p-3 border-b dark:border-gray-700">
      {/* Index */}
      <div className="col-span-12 md:col-span-1 flex items-center pt-9">
        <span className="text-gray-500 dark:text-gray-400 font-semibold">
          {index + 1}.
        </span>
      </div>

      {/* Client Info */}
      <div className="col-span-12 md:col-span-10 grid grid-cols-1 md:grid-cols-5 gap-3">
        <div className="md:col-span-2">
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t("clientNameFr")}
          </label>
          <div className="grid grid-cols-2 gap-2">
            <Controller
              name={`clients.${index}.clientNameFr.lastName`}
              control={control}
              rules={nameFrRules} // Use new rules
              render={({ field }) => (
                <input
                  {...field}
                  type="text"
                  placeholder="Last Name"
                  className={`w-full px-2 py-1.5 border rounded-md text-sm dark:bg-gray-700 dark:text-gray-100 ${
                    showNameError
                      ? "border-red-500"
                      : "border-gray-300 dark:border-gray-600"
                  }`}
                  onChange={(e) => {
                    field.onChange(e);
                    trigger(`clients.${index}.clientNameAr`); // Trigger validation
                  }}
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
          {showNameError && (
            <p className="text-red-500 dark:text-red-400 text-xs mt-1">
              {t("clientNameRequired")}
            </p>
          )}
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t("clientNameAr")}
          </label>
          <Controller
            name={`clients.${index}.clientNameAr`}
            control={control}
            rules={nameArRules} // Use new rules
            render={({ field }) => (
              <input
                {...field}
                type="text"
                className={`w-full px-2 py-1.5 border rounded-md text-sm dark:bg-gray-700 dark:text-gray-100 ${
                  showNameError
                    ? "border-red-500"
                    : "border-gray-300 dark:border-gray-600"
                }`}
                dir="rtl"
                onChange={(e) => {
                  field.onChange(e);
                  trigger(`clients.${index}.clientNameFr.lastName`); // Trigger validation
                }}
              />
            )}
          />
        </div>
        <div className="flex flex-col justify-start mb-auto">
          {/* "No passport yet" checkbox */}
          <div className="flex items-center">
            <Controller
              name={`clients.${index}.noPassport`}
              control={control}
              render={({ field }) => (
                <input
                  type="checkbox"
                  id={`noPassport-${index}`}
                  {...field}
                  checked={!!field.value}
                  className="h-3 w-3 text-blue-600 border-gray-300 rounded focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:focus:ring-blue-600"
                />
              )}
            />
            <label
              htmlFor={`noPassport-${index}`}
              className="ml-1 text-xs text-gray-600 dark:text-gray-400"
            >
              {t("noPassportYet")}
            </label>
          </div>

          {/* Passport Label */}
          <div className="flex justify-between items-center mb-1">
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
              {t("passportNumber")}
            </label>
          </div>

          {/* Passport Input */}
          <Controller
            name={`clients.${index}.passportNumber`}
            control={control}
            rules={passportRules} // Use new conditional rules
            render={({ field }) => (
              <input
                {...field}
                type="text"
                disabled={noPassport} // Disable input if checkbox is checked
                className={`w-full px-2 py-1.5 border rounded-md text-sm dark:bg-gray-700 dark:text-gray-100 ${
                  getError("passportNumber")
                    ? "border-red-500"
                    : "border-gray-300 dark:border-gray-600"
                } ${
                  noPassport
                    ? "bg-gray-100 dark:bg-gray-800 cursor-not-allowed opacity-50"
                    : ""
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
      <div className="col-span-12 md:col-span-1 flex items-center justify-end pt-9">
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
