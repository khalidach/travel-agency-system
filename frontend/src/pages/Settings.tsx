// frontend/src/pages/Settings.tsx
import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as api from "../services/api";
import { FacturationSettings } from "../context/models";
import { toast } from "react-hot-toast";
import { Save } from "lucide-react";

export default function Settings() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [settings, setSettings] = useState<FacturationSettings>({});

  const { data: initialSettings, isLoading } = useQuery<FacturationSettings>({
    queryKey: ["settings"],
    queryFn: api.getSettings,
  });

  useEffect(() => {
    if (initialSettings) {
      setSettings(initialSettings);
    }
  }, [initialSettings]);

  const { mutate: updateSettings, isPending } = useMutation({
    mutationFn: (data: FacturationSettings) => api.updateSettings(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      toast.success("Settings saved successfully!");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to save settings.");
    },
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSettings((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings(settings);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64 text-muted-foreground">
        Loading...
      </div>
    );
  }

  // Common input class using semantic design tokens
  const inputClass =
    "mt-1 block w-full px-3 py-2 border border-input rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-ring focus:border-ring bg-background text-foreground placeholder:text-muted-foreground transition-colors";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">
          {t("settingsTitle")}
        </h1>
        <p className="text-muted-foreground mt-2">{t("settingsSubtitle")}</p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-card text-card-foreground p-8 rounded-2xl shadow-sm border border-border"
      >
        <h2 className="text-xl font-semibold text-foreground mb-6">
          {t("facturationSettings")}
        </h2>

        <div className="space-y-6">
          <h3 className="text-lg font-medium text-foreground border-b border-border pb-2">
            {t("companyInfo")}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-muted-foreground">
                {t("ice")}
              </label>
              <input
                type="text"
                name="ice"
                value={settings.ice || ""}
                onChange={handleChange}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground">
                {t("if")}
              </label>
              <input
                type="text"
                name="if"
                value={settings.if || ""}
                onChange={handleChange}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground">
                {t("rc")}
              </label>
              <input
                type="text"
                name="rc"
                value={settings.rc || ""}
                onChange={handleChange}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground">
                {t("patente")}
              </label>
              <input
                type="text"
                name="patente"
                value={settings.patente || ""}
                onChange={handleChange}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground">
                {t("cnss")}
              </label>
              <input
                type="text"
                name="cnss"
                value={settings.cnss || ""}
                onChange={handleChange}
                className={inputClass}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-muted-foreground">
                {t("address")}
              </label>
              <input
                type="text"
                name="address"
                value={settings.address || ""}
                onChange={handleChange}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground">
                {t("phone")}
              </label>
              <input
                type="text"
                name="phone"
                value={settings.phone || ""}
                onChange={handleChange}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground">
                {t("email")}
              </label>
              <input
                type="email"
                name="email"
                value={settings.email || ""}
                onChange={handleChange}
                className={inputClass}
              />
            </div>
          </div>

          <h3 className="text-lg font-medium text-foreground border-b border-border pb-2 pt-4">
            {t("bankInfo")}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-muted-foreground">
                {t("bankName")}
              </label>
              <input
                type="text"
                name="bankName"
                value={settings.bankName || ""}
                onChange={handleChange}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground">
                {t("rib")}
              </label>
              <input
                type="text"
                name="rib"
                value={settings.rib || ""}
                onChange={handleChange}
                className={inputClass}
              />
            </div>
          </div>
        </div>

        <div className="mt-8 flex justify-end">
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex items-center px-6 py-3 bg-primary text-white font-semibold rounded-lg hover:bg-primary/90 shadow-sm disabled:opacity-50 transition-colors"
          >
            <Save className={`w-5 h-5 mr-2`} />
            {isPending ? t("saving") : t("saveSettings")}
          </button>
        </div>
      </form>
    </div>
  );
}
