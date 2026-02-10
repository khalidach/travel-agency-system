// frontend/src/pages/AccountSettings.tsx
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useAuthContext } from "../context/AuthContext";
import * as api from "../services/api";
import { useMutation } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import { Save, KeyRound, Building } from "lucide-react";

type FormData = {
  agencyName?: string;
  currentPassword: string;
  newPassword?: string;
  confirmPassword?: string;
};

export default function AccountSettings() {
  const { t } = useTranslation();
  const { state, dispatch } = useAuthContext();

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isDirty },
  } = useForm<FormData>({
    defaultValues: {
      agencyName: state.user?.agencyName || "",
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const { mutate: updateSettings, isPending } = useMutation({
    mutationFn: (data: FormData) => api.updateAccountSettings(data),
    onSuccess: async () => {
      toast.success("Account settings updated successfully!");
      // Refetch user data to update the UI
      try {
        const userData = await api.refreshToken();
        dispatch({ type: "REFRESH_TOKEN", payload: userData });
        reset({
          agencyName: userData.agencyName || "",
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        });
      } catch (error) {
        console.error("Failed to refresh user data after update", error);
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update settings.");
    },
  });

  const onSubmit = (data: FormData) => {
    // Initialize payload with the required field typed as FormData
    const payload: FormData = { currentPassword: data.currentPassword };

    if (data.newPassword) {
      payload.newPassword = data.newPassword;
    }

    if (
      state.user?.role === "admin" &&
      data.agencyName !== state.user.agencyName
    ) {
      payload.agencyName = data.agencyName;
    }

    updateSettings(payload);
  };

  const newPassword = watch("newPassword");
  const isAdmin = state.user?.role === "admin" || state.user?.role === "owner";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          {t("accountSettings")}
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          {t("updateAccountInfo")}
        </p>
      </div>
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 max-w-2xl mx-auto"
      >
        <div className="space-y-6">
          {isAdmin && (
            <div>
              <label
                htmlFor="agencyName"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center"
              >
                <Building className="w-4 h-4 mr-2" />
                {t("agencyName")}
              </label>
              <input
                id="agencyName"
                type="text"
                {...register("agencyName")}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
          )}

          <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
              {t("changePassword")}
            </h3>
            <div>
              <label
                htmlFor="currentPassword"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center"
              >
                <KeyRound className="w-4 h-4 mr-2" />
                {t("currentPassword")}
              </label>
              <input
                id="currentPassword"
                type="password"
                {...register("currentPassword", {
                  required: t("currentPasswordRequired") as string,
                })}
                className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${
                  errors.currentPassword
                    ? "border-red-500"
                    : "border-gray-300 dark:border-gray-600"
                }`}
              />
              {errors.currentPassword && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.currentPassword.message}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <label
                  htmlFor="newPassword"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  {t("newPassword")}
                </label>
                <input
                  id="newPassword"
                  type="password"
                  {...register("newPassword", {
                    minLength: {
                      value: 6,
                      message: t("passwordTooShort") as string,
                    },
                  })}
                  className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${
                    errors.newPassword
                      ? "border-red-500"
                      : "border-gray-300 dark:border-gray-600"
                  }`}
                />
                {errors.newPassword && (
                  <p className="text-red-500 text-xs mt-1">
                    {errors.newPassword.message}
                  </p>
                )}
              </div>
              <div>
                <label
                  htmlFor="confirmPassword"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  {t("confirmNewPassword")}
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  {...register("confirmPassword", {
                    validate: (value) =>
                      value === newPassword ||
                      (t("passwordMismatch") as string),
                  })}
                  className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${
                    errors.confirmPassword
                      ? "border-red-500"
                      : "border-gray-300 dark:border-gray-600"
                  }`}
                />
                {errors.confirmPassword && (
                  <p className="text-red-500 text-xs mt-1">
                    {errors.confirmPassword.message}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 flex justify-end">
          <button
            type="submit"
            disabled={isPending || !isDirty}
            className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 shadow-sm disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            <Save className="w-5 h-5 mr-2" />
            {isPending ? t("saving") : t("updateAccount")}
          </button>
        </div>
      </form>
    </div>
  );
}
