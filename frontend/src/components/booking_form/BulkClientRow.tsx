// frontend/src/components/booking_form/BulkClientRow.tsx
import { useEffect } from "react";
import { useFormContext, Controller, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Trash2 } from "lucide-react";
import { ClientFormData, BookingFormData } from "./types";
import MultiplePhoneInput from "../ui/MultiplePhoneInput";

interface BulkClientRowProps {
  index: number;
  remove: (index: number) => void;
}

const BulkClientRow = ({ index, remove }: BulkClientRowProps) => {
  const { t } = useTranslation();
  const {
    control,
    formState: { errors },
    getValues,
    trigger,
    setValue,
    watch,
  } = useFormContext<BookingFormData>();

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

  const clientErrors = errors.clients?.[index];
  const isLeader = useWatch({
    control,
    name: `clients.${index}.isLeader`,
  }) ?? false;
  const leaderRowIndex = useWatch({
    control,
    name: `clients.${index}.leaderRowIndex`,
  });
  const allClients = useWatch({
    control,
    name: "clients",
  }) || [];

  const leadersOptions = allClients
    .map((client, idx) => {
      if (!client?.isLeader) return null;
      const firstName = client.clientNameFr?.firstName || "";
      const lastName = client.clientNameFr?.lastName || "";
      const arName = client.clientNameAr || "";
      const name = `${firstName} ${lastName}`.trim() || arName || `${t("client")} ${idx + 1}`;
      return {
        index: idx,
        name: `${idx + 1}. ${name}`,
      };
    })
    .filter((opt): opt is { index: number; name: string } => opt !== null);

  useEffect(() => {
    const existingClientData = watch(`clients.${index}`) as ClientFormData;
    if (existingClientData.passportNumber !== undefined) {
      const isExistingBookingWithNoPassport =
        !existingClientData.passportNumber ||
        existingClientData.passportNumber === "";
      setValue(`clients.${index}.noPassport`, isExistingBookingWithNoPassport);
    }
  }, [index, setValue, watch]);

  useEffect(() => {
    if (noPassport) {
      setValue(`clients.${index}.passportNumber`, "");
      trigger(`clients.${index}.passportNumber`);
    } else {
      trigger(`clients.${index}.passportNumber`);
    }
  }, [noPassport, setValue, trigger, index]);

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

  const showNameError =
    (clientErrors?.clientNameFr?.lastName || clientErrors?.clientNameAr) &&
    !clientNameFrLastName &&
    !clientNameAr;

  return (
    <div className="grid grid-cols-12 gap-3 items-start p-3 border-b dark:border-gray-700">
      <div className="col-span-12 md:col-span-1 flex flex-col items-center pt-9 gap-2">
        <span className="text-gray-500 dark:text-gray-400 font-semibold">
          {index + 1}.
        </span>
        {isLeader && (
          <span className="text-yellow-500 text-lg animate-bounce" title={t("leader") || "Leader"}>
            👑
          </span>
        )}
      </div>

      <div className="col-span-12 md:col-span-10 grid grid-cols-1 md:grid-cols-5 gap-3">
        <div className="md:col-span-2">
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t("clientNameFr")}
          </label>
          <div className="grid grid-cols-2 gap-2">
            <Controller
              name={`clients.${index}.clientNameFr.lastName`}
              control={control}
              rules={nameFrRules}
              render={({ field }) => (
                <input
                  {...field}
                  type="text"
                  placeholder={t("lastNamePlaceholder") as string}
                  className={`w-full px-2 py-1.5 border rounded-md text-sm dark:bg-gray-700 dark:text-gray-100 ${
                    showNameError
                      ? "border-red-500"
                      : "border-gray-300 dark:border-gray-600"
                  }`}
                  onChange={(e) => {
                    field.onChange(e);
                    trigger(`clients.${index}.clientNameAr`);
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
                  placeholder={t("firstNamePlaceholder") as string}
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
            rules={nameArRules}
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
                  trigger(`clients.${index}.clientNameFr.lastName`);
                }}
              />
            )}
          />
        </div>
        <div className="flex flex-col justify-start mb-auto">
          <div className="flex items-center">
            <Controller
              name={`clients.${index}.noPassport`}
              control={control}
              render={({ field: { value, ...fieldProps } }) => (
                <input
                  type="checkbox"
                  id={`noPassport-${index}`}
                  {...fieldProps}
                  checked={!!value}
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

          <div className="flex justify-between items-center mb-1">
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
              {t("passportNumber")}
            </label>
          </div>

          <Controller
            name={`clients.${index}.passportNumber`}
            control={control}
            rules={passportRules}
            render={({ field }) => (
              <input
                {...field}
                type="text"
                disabled={noPassport}
                className={`w-full px-2 py-1.5 border rounded-md text-sm dark:bg-gray-700 dark:text-gray-100 ${
                  clientErrors?.passportNumber
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
              <MultiplePhoneInput
                value={field.value || ""}
                onChange={field.onChange}
                compact={true}
              />
            )}
          />
        </div>

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
                value={field.value ? field.value.split("T")[0] || "" : ""}
                className={`w-full px-2 py-1.5 border rounded-md text-sm dark:bg-gray-700 dark:text-gray-100 ${
                  clientErrors?.dateOfBirth
                    ? "border-red-500"
                    : "border-gray-300 dark:border-gray-600"
                }`}
              />
            )}
          />
        </div>

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
                value={field.value ? field.value.split("T")[0] || "" : ""}
                className={`w-full px-2 py-1.5 border rounded-md text-sm dark:bg-gray-700 dark:text-gray-100 ${
                  clientErrors?.passportExpirationDate
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

        {/* Family/Group Association Section */}
        <div className="md:col-span-5 border-t border-gray-100 dark:border-gray-700/50 mt-3 pt-3 flex flex-col sm:flex-row sm:items-center gap-4 bg-gray-50/50 dark:bg-gray-800/20 p-2 rounded-lg">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={!!isLeader}
              onChange={(e) => {
                const checked = e.target.checked;
                setValue(`clients.${index}.isLeader`, checked);
                if (checked) {
                  setValue(`clients.${index}.leaderRowIndex`, undefined);
                } else {
                  // Default to first leader in the form list
                  const clientsList = getValues("clients") || [];
                  const firstLeaderIdx = clientsList.findIndex((c) => c.isLeader) ?? 0;
                  setValue(`clients.${index}.leaderRowIndex`, firstLeaderIdx >= 0 ? firstLeaderIdx : 0);
                }
              }}
              className="h-4 w-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500 bg-white dark:bg-gray-700 cursor-pointer"
            />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
              {t("isLeader") || "Mark as Family Leader"}
            </span>
          </label>

          {!isLeader && (
            <div className="flex-1 flex items-center gap-2 max-w-xs">
              <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                {t("belongsToLeader") || "Belongs to:"}
              </span>
              <select
                value={leaderRowIndex ?? 0}
                onChange={(e) => {
                  setValue(`clients.${index}.leaderRowIndex`, Number(e.target.value));
                }}
                className="w-full px-2.5 py-1 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500/25 focus:border-blue-500 outline-none cursor-pointer"
              >
                {leadersOptions.map((opt) => (
                  <option key={opt.index} value={opt.index}>
                    {opt.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

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
