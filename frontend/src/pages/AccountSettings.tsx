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

  // Shared classes
  const labelClass =
    "block text-sm font-medium text-muted-foreground flex items-center";
  const inputBaseClass =
    "mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-1 bg-background text-foreground transition-colors";
  const inputDefaultClass = "border-input focus:ring-ring focus:border-ring";
  const inputErrorClass =
    "border-destructive focus:ring-destructive focus:border-destructive";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">
          {t("accountSettings")}
        </h1>
        <p className="text-muted-foreground mt-2">{t("updateAccountInfo")}</p>
      </div>
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="bg-card text-card-foreground p-8 rounded-2xl shadow-sm border border-border max-w-2xl mx-auto"
      >
        <div className="space-y-6">
          {isAdmin && (
            <div>
              <label htmlFor="agencyName" className={labelClass}>
                <Building className="w-4 h-4 mr-2" />
                {t("agencyName")}
              </label>
              <input
                id="agencyName"
                type="text"
                {...register("agencyName")}
                className={`${inputBaseClass} ${inputDefaultClass}`}
              />
            </div>
          )}

          <div className="border-t border-border pt-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">
              {t("changePassword")}
            </h3>
            <div>
              <label htmlFor="currentPassword" className={labelClass}>
                <KeyRound className="w-4 h-4 mr-2" />
                {t("currentPassword")}
              </label>
              <input
                id="currentPassword"
                type="password"
                {...register("currentPassword", {
                  required: t("currentPasswordRequired") as string,
                })}
                className={`${inputBaseClass} ${
                  errors.currentPassword ? inputErrorClass : inputDefaultClass
                }`}
              />
              {errors.currentPassword && (
                <p className="text-destructive text-xs mt-1">
                  {errors.currentPassword.message}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <label
                  htmlFor="newPassword"
                  className="block text-sm font-medium text-muted-foreground"
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
                  className={`${inputBaseClass} ${
                    errors.newPassword ? inputErrorClass : inputDefaultClass
                  }`}
                />
                {errors.newPassword && (
                  <p className="text-destructive text-xs mt-1">
                    {errors.newPassword.message}
                  </p>
                )}
              </div>
              <div>
                <label
                  htmlFor="confirmPassword"
                  className="block text-sm font-medium text-muted-foreground"
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
                  className={`${inputBaseClass} ${
                    errors.confirmPassword ? inputErrorClass : inputDefaultClass
                  }`}
                />
                {errors.confirmPassword && (
                  <p className="text-destructive text-xs mt-1">
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
            className="inline-flex items-center px-6 py-3 bg-primary text-white font-semibold rounded-lg hover:bg-primary/90 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Save className="w-5 h-5 mr-2" />
            {isPending ? t("saving") : t("updateAccount")}
          </button>
        </div>
      </form>
    </div>
  );
}
