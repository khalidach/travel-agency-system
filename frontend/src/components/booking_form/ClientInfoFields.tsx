import React, { useRef, useEffect } from "react";
import {
  useFormContext,
  Controller,
  get,
  useWatch,
  FieldError,
} from "react-hook-form";
import { useTranslation } from "react-i18next";
// Removed "react-datepicker/dist/react-datepicker.css" as it's no longer used

const ClientInfoFields = () => {
  const { t } = useTranslation();
  const {
    control,
    formState: { errors },
    setValue,
    trigger, // To trigger validation on the other name field
    getValues, // To get the value of the other name field in validation
  } = useFormContext();

  // Watch for changes in specific fields
  const noPassport = useWatch({ control, name: "clients.0.noPassport" });
  const clientNameFrLastName = useWatch({
    control,
    name: "clients.0.clientNameFr.lastName",
  });
  const clientNameAr = useWatch({ control, name: "clients.0.clientNameAr" });

  const monthRef = useRef<HTMLInputElement>(null);
  const yearRef = useRef<HTMLInputElement>(null);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    field: "clients.0.dob_day" | "clients.0.dob_month",
    maxLength: number,
    nextFieldRef?: React.RefObject<HTMLInputElement>,
  ) => {
    const { value } = e.target;
    const numericValue = value.replace(/[^0-9]/g, "");
    if (numericValue.length <= maxLength) {
      setValue(field, numericValue, { shouldValidate: true });
      if (numericValue.length === maxLength && nextFieldRef?.current) {
        nextFieldRef.current.focus();
      }
    }
  };

  // Effect to clear passport number if "No passport" is checked
  useEffect(() => {
    if (noPassport) {
      setValue("clients.0.passportNumber", "");
      // Manually clear errors for passportNumber if it's now valid
      trigger("clients.0.passportNumber");
    } else {
      // Re-trigger validation if the box is unchecked, in case it's now required and empty
      trigger("clients.0.passportNumber");
    }
  }, [noPassport, setValue, trigger]);

  // Validation rules
  const nameFrRules = {
    validate: (value: string) => {
      const arName = getValues("clients.0.clientNameAr");
      return (
        (!!value && value.trim() !== "") ||
        (!!arName && arName.trim() !== "") ||
        (t("clientNameRequired") as string)
      );
    },
  };

  const nameArRules = {
    validate: (value: string) => {
      const frLastName = getValues("clients.0.clientNameFr.lastName");
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

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-[3fr_2fr_1fr] gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t("clientNameFr")}
          </label>
          <div className="grid grid-cols-2 gap-2">
            <Controller
              name="clients.0.clientNameFr.lastName"
              control={control}
              rules={nameFrRules} // Use new rules
              render={({ field }) => (
                <input
                  {...field}
                  type="text"
                  placeholder="Last Name"
                  className={`w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:text-gray-100 ${
                    get(errors, "clients.0.clientNameFr.lastName") &&
                    !clientNameAr // Only show error if both are empty
                      ? "border-red-500"
                      : "border-gray-300 dark:border-gray-600"
                  }`}
                  onChange={(e) => {
                    field.onChange(e);
                    trigger("clients.0.clientNameAr"); // Trigger validation for the other field
                  }}
                />
              )}
            />
            <Controller
              name="clients.0.clientNameFr.firstName"
              control={control}
              render={({ field }) => (
                <input
                  {...field}
                  type="text"
                  placeholder="First Name"
                  className={`w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:text-gray-100 ${
                    get(errors, "clients.0.clientNameFr.firstName")
                      ? "border-red-500"
                      : "border-gray-300 dark:border-gray-600"
                  }`}
                />
              )}
            />
          </div>
          {/* Show error if validation fired and both fields are still empty */}
          {(get(errors, "clients.0.clientNameFr.lastName") ||
            get(errors, "clients.0.clientNameAr")) &&
            !clientNameFrLastName &&
            !clientNameAr && (
              <p className="text-red-500 dark:text-red-400 text-sm mt-1">
                {(get(errors, "clients.0.clientNameFr.lastName") as FieldError)
                  ?.message ||
                  (get(errors, "clients.0.clientNameAr") as FieldError)
                    ?.message}
              </p>
            )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t("clientNameAr")}
          </label>
          <Controller
            name="clients.0.clientNameAr"
            control={control}
            rules={nameArRules} // Use new rules
            render={({ field }) => (
              <input
                {...field}
                type="text"
                className={`w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:text-gray-100 ${
                  get(errors, "clients.0.clientNameAr") && !clientNameFrLastName // Only show error if both are empty
                    ? "border-red-500"
                    : "border-gray-300 dark:border-gray-600"
                }`}
                dir="rtl"
                onChange={(e) => {
                  field.onChange(e);
                  trigger("clients.0.clientNameFr.lastName"); // Trigger validation for the other field
                }}
              />
            )}
          />
          {/* Error message is now handled under the Fr name block to avoid duplication */}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t("personType")}
          </label>
          <Controller
            name="clients.0.personType"
            control={control}
            rules={{ required: t("personTypeRequired") as string }}
            render={({ field }) => (
              <select
                {...field}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
              >
                <option value="adult">{t("adult")}</option>
                <option value="child">{t("child")}</option>
                <option value="infant">{t("infant")}</option>
              </select>
            )}
          />
          {get(errors, "clients.0.personType") && (
            <p className="text-red-500 dark:text-red-400 text-sm mt-1">
              {(get(errors, "clients.0.personType") as FieldError).message}
            </p>
          )}
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t("passportNumber")}
            </label>
            {/* "No passport yet" checkbox */}
            <div className="flex items-center">
              <Controller
                name="clients.0.noPassport"
                control={control}
                render={({ field }) => (
                  <input
                    type="checkbox"
                    id="noPassport"
                    {...field}
                    checked={!!field.value}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:focus:ring-blue-600"
                  />
                )}
              />
              <label
                htmlFor="noPassport"
                className="ml-2 text-sm text-gray-600 dark:text-gray-400"
              >
                {t("noPassportYet")}
              </label>
            </div>
          </div>
          <Controller
            name="clients.0.passportNumber"
            control={control}
            rules={passportRules} // Use new conditional rules
            render={({ field }) => (
              <input
                {...field}
                type="text"
                disabled={noPassport} // Disable input if checkbox is checked
                className={`w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:text-gray-100 ${
                  get(errors, "clients.0.passportNumber")
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
          {get(errors, "clients.0.passportNumber") && (
            <p className="text-red-500 dark:text-red-400 text-sm mt-1">
              {(get(errors, "clients.0.passportNumber") as FieldError).message}
            </p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t("phoneNumber")}
          </label>
          <Controller
            name="clients.0.phoneNumber"
            control={control}
            render={({ field }) => (
              <input
                {...field}
                type="tel"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
              />
            )}
          />
          {get(errors, "clients.0.phoneNumber") && (
            <p className="text-red-500 dark:text-red-400 text-sm mt-1">
              {(get(errors, "clients.0.phoneNumber") as FieldError).message}
            </p>
          )}
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t("dateOfBirth")}
          </label>
          <div className="grid grid-cols-3 gap-2">
            <Controller
              name="clients.0.dob_day"
              control={control}
              rules={{
                validate: (value) =>
                  !value || (value >= 1 && value <= 31) || "Invalid day",
              }}
              render={({ field }) => (
                <input
                  {...field}
                  onChange={(e) =>
                    handleInputChange(e, "clients.0.dob_day", 2, monthRef)
                  }
                  type="text"
                  placeholder={t("day") as string}
                  className={`w-full px-2 py-2 border rounded-lg text-center dark:bg-gray-700 dark:text-gray-100 ${
                    get(errors, "clients.0.dob_day")
                      ? "border-red-500"
                      : "border-gray-300 dark:border-gray-600"
                  }`}
                />
              )}
            />
            <Controller
              name="clients.0.dob_month"
              control={control}
              rules={{
                validate: (value) =>
                  !value || (value >= 1 && value <= 12) || "Invalid month",
              }}
              render={({ field }) => (
                <input
                  {...field}
                  ref={monthRef}
                  onChange={(e) =>
                    handleInputChange(e, "clients.0.dob_month", 2, yearRef)
                  }
                  type="text"
                  placeholder={t("month") as string}
                  className={`w-full px-2 py-2 border rounded-lg text-center dark:bg-gray-700 dark:text-gray-100 ${
                    get(errors, "clients.0.dob_month")
                      ? "border-red-500"
                      : "border-gray-300 dark:border-gray-600"
                  }`}
                />
              )}
            />
            <Controller
              name="clients.0.dob_year"
              control={control}
              rules={{
                min: { value: 1900, message: "Invalid year" },
                max: {
                  value: new Date().getFullYear(),
                  message: "Invalid year",
                },
              }}
              render={({ field }) => (
                <input
                  {...field}
                  ref={yearRef}
                  type="text"
                  maxLength={4}
                  placeholder={t("year") as string}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^0-9]/g, "");
                    if (value.length <= 4) {
                      setValue("clients.0.dob_year", value, {
                        shouldValidate: true,
                      });
                    }
                  }}
                  className={`w-full px-2 py-2 border rounded-lg text-center dark:bg-gray-700 dark:text-gray-100 ${
                    get(errors, "clients.0.dob_year")
                      ? "border-red-500"
                      : "border-gray-300 dark:border-gray-600"
                  }`}
                />
              )}
            />
          </div>
          {get(errors, "clients.0.dob_day") && (
            <p className="text-red-500 dark:text-red-400 text-xs mt-1">
              {(get(errors, "clients.0.dob_day") as FieldError).message}
            </p>
          )}
          {get(errors, "clients.0.dob_month") && (
            <p className="text-red-500 dark:text-red-400 text-xs mt-1">
              {(get(errors, "clients.0.dob_month") as FieldError).message}
            </p>
          )}
          {get(errors, "clients.0.dob_year") && (
            <p className="text-red-500 dark:text-red-400 text-sm mt-1">
              {(get(errors, "clients.0.dob_year") as FieldError).message}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t("passportExpirationDate")}
          </label>
          <div className="relative">
            <Controller
              name="clients.0.passportExpirationDate"
              control={control}
              // Added required rule
              render={({ field }) => (
                <input
                  type="date"
                  {...field}
                  // Updated value formatting to robustly handle ISO strings
                  value={field.value ? field.value.split("T")[0] : ""}
                  min={new Date().toISOString().split("T")[0]}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors dark:bg-gray-700 dark:text-gray-100 ${
                    get(errors, "clients.0.passportExpirationDate")
                      ? "border-red-500"
                      : "border-gray-300 dark:border-gray-600"
                  }`}
                />
              )}
            />
            {get(errors, "clients.0.passportExpirationDate") && (
              <p className="text-red-500 dark:text-red-400 text-sm mt-1">
                {
                  (
                    get(
                      errors,
                      "clients.0.passportExpirationDate",
                    ) as FieldError
                  ).message
                }
              </p>
            )}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t("gender")}
          </label>
          <Controller
            name="clients.0.gender"
            control={control}
            rules={{ required: t("genderRequired") as string }}
            render={({ field }) => (
              <select
                {...field}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
              >
                <option value="male">{t("male")}</option>
                <option value="female">{t("female")}</option>
              </select>
            )}
          />
          {get(errors, "clients.0.gender") && (
            <p className="text-red-500 dark:text-red-400 text-sm mt-1">
              {(get(errors, "clients.0.gender") as FieldError).message}
            </p>
          )}
        </div>
      </div>
    </>
  );
};

export default ClientInfoFields;
