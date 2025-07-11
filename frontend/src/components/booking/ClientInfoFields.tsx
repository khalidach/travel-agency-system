// frontend/src/components/booking/ClientInfoFields.tsx
import React, { useRef } from "react";
import { useFormContext, Controller, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";

const ClientInfoFields = () => {
  const { t } = useTranslation();
  const {
    control,
    formState: { errors },
    setValue,
  } = useFormContext();

  const monthRef = useRef<HTMLInputElement>(null);
  const yearRef = useRef<HTMLInputElement>(null);

  const dob_day = useWatch({ control, name: "dob_day" });
  const dob_month = useWatch({ control, name: "dob_month" });
  const dob_year = useWatch({ control, name: "dob_year" });

  React.useEffect(() => {
    const day = dob_day ? String(dob_day).padStart(2, "0") : "";
    const month = dob_month ? String(dob_month).padStart(2, "0") : "";
    const year = dob_year || "";

    if (year && (!day || !month)) {
      setValue("dateOfBirth", `XX/XX/${year}`);
    } else if (day && month && year) {
      setValue("dateOfBirth", `${year}-${month}-${day}`);
    } else {
      setValue("dateOfBirth", "");
    }
  }, [dob_day, dob_month, dob_year, setValue]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    field: "dob_day" | "dob_month",
    maxLength: number,
    nextFieldRef?: React.RefObject<HTMLInputElement>
  ) => {
    const { value } = e.target;
    const numericValue = value.replace(/[^0-9]/g, "");
    if (numericValue.length <= maxLength) {
      setValue(field, numericValue);
      if (numericValue.length === maxLength && nextFieldRef?.current) {
        nextFieldRef.current.focus();
      }
    }
  };

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t("clientNameFr")}
          </label>
          <Controller
            name="clientNameFr"
            control={control}
            rules={{ required: t("clientNameFrRequired") as string }}
            render={({ field }) => (
              <input
                {...field}
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            )}
          />
          {errors.clientNameFr && (
            <p className="text-red-500 text-sm mt-1">
              {(errors.clientNameFr as any).message}
            </p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t("clientNameAr")}
          </label>
          <Controller
            name="clientNameAr"
            control={control}
            rules={{ required: t("clientNameArRequired") as string }}
            render={({ field }) => (
              <input
                {...field}
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                dir="rtl"
              />
            )}
          />
          {errors.clientNameAr && (
            <p className="text-red-500 text-sm mt-1">
              {(errors.clientNameAr as any).message}
            </p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t("personType")}
          </label>
          <Controller
            name="personType"
            control={control}
            rules={{ required: t("personTypeRequired") as string }}
            render={({ field }) => (
              <select
                {...field}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="adult">{t("adult")}</option>
                <option value="child">{t("child")}</option>
                <option value="infant">{t("infant")}</option>
              </select>
            )}
          />
          {errors.personType && (
            <p className="text-red-500 text-sm mt-1">
              {(errors.personType as any).message}
            </p>
          )}
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t("passportNumber")}
          </label>
          <Controller
            name="passportNumber"
            control={control}
            rules={{ required: t("passportNumberRequired") as string }}
            render={({ field }) => (
              <input
                {...field}
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            )}
          />
          {errors.passportNumber && (
            <p className="text-red-500 text-sm mt-1">
              {(errors.passportNumber as any).message}
            </p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t("phoneNumber")}
          </label>
          <Controller
            name="phoneNumber"
            control={control}
            render={({ field }) => (
              <input
                {...field}
                type="tel"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            )}
          />
          {errors.phoneNumber && (
            <p className="text-red-500 text-sm mt-1">
              {(errors.phoneNumber as any).message}
            </p>
          )}
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t("dateOfBirth")}
          </label>
          <div className="grid grid-cols-3 gap-2">
            <Controller
              name="dob_day"
              control={control}
              rules={{
                validate: (value) =>
                  !value || (value >= 1 && value <= 31) || "Invalid day",
              }}
              render={({ field }) => (
                <input
                  {...field}
                  onChange={(e) => handleInputChange(e, "dob_day", 2, monthRef)}
                  type="text"
                  placeholder="DD"
                  className={`w-full px-2 py-2 border rounded-lg text-center ${
                    errors.dob_day ? "border-red-500" : "border-gray-300"
                  }`}
                />
              )}
            />
            <Controller
              name="dob_month"
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
                    handleInputChange(e, "dob_month", 2, yearRef)
                  }
                  type="text"
                  placeholder="MM"
                  className={`w-full px-2 py-2 border rounded-lg text-center ${
                    errors.dob_month ? "border-red-500" : "border-gray-300"
                  }`}
                />
              )}
            />
            <Controller
              name="dob_year"
              control={control}
              rules={{
                required: "Year is required",
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
                  placeholder="YYYY"
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^0-9]/g, "");
                    if (value.length <= 4) {
                      setValue("dob_year", value);
                    }
                  }}
                  className={`w-full px-2 py-2 border rounded-lg text-center ${
                    errors.dob_year ? "border-red-500" : "border-gray-300"
                  }`}
                />
              )}
            />
          </div>
          {errors.dob_day && (
            <p className="text-red-500 text-xs mt-1">
              {(errors.dob_day as any).message}
            </p>
          )}
          {errors.dob_month && (
            <p className="text-red-500 text-xs mt-1">
              {(errors.dob_month as any).message}
            </p>
          )}
          {errors.dob_year && (
            <p className="text-red-500 text-sm mt-1">
              {(errors.dob_year as any).message}
            </p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t("passportExpirationDate")}
          </label>
          <Controller
            name="passportExpirationDate"
            control={control}
            render={({ field }) => (
              <input
                {...field}
                type="date"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            )}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t("gender")}
          </label>
          <Controller
            name="gender"
            control={control}
            rules={{ required: t("genderRequired") as string }}
            render={({ field }) => (
              <select
                {...field}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="male">{t("male")}</option>
                <option value="female">{t("female")}</option>
              </select>
            )}
          />
          {errors.gender && (
            <p className="text-red-500 text-sm mt-1">
              {(errors.gender as any).message}
            </p>
          )}
        </div>
      </div>
    </>
  );
};

export default ClientInfoFields;
