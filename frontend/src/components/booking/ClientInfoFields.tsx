// frontend/src/components/booking/ClientInfoFields.tsx
import React, { useRef } from "react";
import { useFormContext, Controller, get } from "react-hook-form";
import { useTranslation } from "react-i18next";
import "react-datepicker/dist/react-datepicker.css";

const ClientInfoFields = () => {
  const { t } = useTranslation();
  const {
    control,
    formState: { errors },
    setValue,
  } = useFormContext();

  const monthRef = useRef<HTMLInputElement>(null);
  const yearRef = useRef<HTMLInputElement>(null);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    field: "clients.0.dob_day" | "clients.0.dob_month",
    maxLength: number,
    nextFieldRef?: React.RefObject<HTMLInputElement>
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
              rules={{ required: t("clientLastNameFrRequired") as string }}
              render={({ field }) => (
                <input
                  {...field}
                  type="text"
                  placeholder="Last Name"
                  className={`w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:text-gray-100 ${
                    get(errors, "clients.0.clientNameFr.lastName")
                      ? "border-red-500"
                      : "border-gray-300 dark:border-gray-600"
                  }`}
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
          {get(errors, "clients.0.clientNameFr.lastName") && (
            <p className="text-red-500 dark:text-red-400 text-sm mt-1">
              {(get(errors, "clients.0.clientNameFr.lastName") as any).message}
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
            rules={{ required: t("clientNameArRequired") as string }}
            render={({ field }) => (
              <input
                {...field}
                type="text"
                className={`w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:text-gray-100 ${
                  get(errors, "clients.0.clientNameAr")
                    ? "border-red-500"
                    : "border-gray-300 dark:border-gray-600"
                }`}
                dir="rtl"
              />
            )}
          />
          {get(errors, "clients.0.clientNameAr") && (
            <p className="text-red-500 dark:text-red-400 text-sm mt-1">
              {(get(errors, "clients.0.clientNameAr") as any).message}
            </p>
          )}
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
              {(get(errors, "clients.0.personType") as any).message}
            </p>
          )}
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t("passportNumber")}
          </label>
          <Controller
            name="clients.0.passportNumber"
            control={control}
            rules={{ required: t("passportNumberRequired") as string }}
            render={({ field }) => (
              <input
                {...field}
                type="text"
                className={`w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:text-gray-100 ${
                  get(errors, "clients.0.passportNumber")
                    ? "border-red-500"
                    : "border-gray-300 dark:border-gray-600"
                }`}
              />
            )}
          />
          {get(errors, "clients.0.passportNumber") && (
            <p className="text-red-500 dark:text-red-400 text-sm mt-1">
              {(get(errors, "clients.0.passportNumber") as any).message}
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
              {(get(errors, "clients.0.phoneNumber") as any).message}
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
              {(get(errors, "clients.0.dob_day") as any).message}
            </p>
          )}
          {get(errors, "clients.0.dob_month") && (
            <p className="text-red-500 dark:text-red-400 text-xs mt-1">
              {(get(errors, "clients.0.dob_month") as any).message}
            </p>
          )}
          {get(errors, "clients.0.dob_year") && (
            <p className="text-red-500 dark:text-red-400 text-sm mt-1">
              {(get(errors, "clients.0.dob_year") as any).message}
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
              render={({ field }) => (
                <input
                  type="date"
                  {...field}
                  value={field.value || ""}
                  min={new Date().toISOString().split("T")[0]}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors dark:bg-gray-700 dark:text-gray-100"
                />
              )}
            />
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
              {(get(errors, "clients.0.gender") as any).message}
            </p>
          )}
        </div>
      </div>
    </>
  );
};

export default ClientInfoFields;
