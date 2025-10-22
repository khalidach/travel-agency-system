import React from "react";
import { useFormContext, Controller, get } from "react-hook-form";
import { useTranslation } from "react-i18next";
// Removed "react-datepicker/dist/react-datepicker.css" as it's no longer used

const ClientInfoFields = () => {
  const { t } = useTranslation();
  const {
    control,
    formState: { errors },
  } = useFormContext(); // Removed setValue and refs

  // Removed handleInputChange function and refs

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
        {/* --- REFACTORED: Date of Birth --- */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t("dateOfBirth")}
          </label>
          <Controller
            name="clients.0.dateOfBirth"
            control={control}
            rules={{ required: t("dateOfBirthRequired") as string }}
            render={({ field }) => (
              <input
                type="date"
                {...field}
                value={field.value ? field.value.split("T")[0] : ""}
                className={`w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:text-gray-100 ${
                  get(errors, "clients.0.dateOfBirth")
                    ? "border-red-500"
                    : "border-gray-300 dark:border-gray-600"
                }`}
              />
            )}
          />
          {get(errors, "clients.0.dateOfBirth") && (
            <p className="text-red-500 dark:text-red-400 text-sm mt-1">
              {(get(errors, "clients.0.dateOfBirth") as any).message}
            </p>
          )}
        </div>
        {/* --- END REFACTORED --- */}

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t("passportExpirationDate")}
          </label>
          <div className="relative">
            <Controller
              name="clients.0.passportExpirationDate"
              control={control}
              rules={{
                required: t("passportExpirationDateRequired") as string,
              }} // Added required rule
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
                  (get(errors, "clients.0.passportExpirationDate") as any)
                    .message
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
              {(get(errors, "clients.0.gender") as any).message}
            </p>
          )}
        </div>
      </div>
    </>
  );
};

export default ClientInfoFields;
