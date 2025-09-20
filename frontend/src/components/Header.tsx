// frontend/src/components/Header.tsx
import React, { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useAuthContext } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { useQueryClient } from "@tanstack/react-query";
import { User, LogOut, Settings, Sun, Moon } from "lucide-react";
import { Link } from "react-router-dom";
import * as api from "../services/api";
import { toast } from "react-hot-toast";

export default function Header() {
  const { t, i18n } = useTranslation();
  const { state, dispatch } = useAuthContext();
  const { theme, toggleTheme } = useTheme();
  const queryClient = useQueryClient();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const changeLanguage = (lang: "en" | "ar" | "fr") => {
    i18n.changeLanguage(lang);
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  };

  useEffect(() => {
    document.documentElement.dir = i18n.language === "ar" ? "rtl" : "ltr";
  }, [i18n.language]);

  const handleLogout = async () => {
    try {
      await api.logout();
    } catch (error) {
      console.error("Logout API call failed:", error);
      toast.error("Could not clear session on server. Logging out locally.");
    } finally {
      queryClient.clear();
      dispatch({ type: "LOGOUT" });
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-100 dark:border-gray-700">
      <div className="px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {t("welcomeMessage", { name: state.user?.agencyName || "User" })}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {t("headerSubtitle")}
            </p>
          </div>

          <div className="flex items-center space-x-4">
            {/* Language Selector */}
            <div className="relative">
              <div className="flex items-center gap-x-3 bg-gray-50 dark:bg-gray-700 rounded-lg p-1">
                <button
                  onClick={() => changeLanguage("fr")}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    i18n.language === "fr"
                      ? "bg-white text-blue-600 shadow-sm dark:bg-gray-900 dark:text-white"
                      : "text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
                  }`}
                >
                  FR
                </button>
                <button
                  onClick={() => changeLanguage("ar")}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    i18n.language === "ar"
                      ? "bg-white text-blue-600 shadow-sm dark:bg-gray-900 dark:text-white"
                      : "text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
                  }`}
                >
                  AR
                </button>
                <button
                  onClick={() => changeLanguage("en")}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    i18n.language === "en"
                      ? "bg-white text-blue-600 shadow-sm dark:bg-gray-900 dark:text-white"
                      : "text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
                  }`}
                >
                  EN
                </button>
              </div>
            </div>

            {/* Profile Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-x-3"
              >
                <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-full flex items-center justify-center ring-2 ring-white dark:ring-gray-800">
                  <User className="w-5 h-5 text-white" />
                </div>
                <div className="hidden md:block text-left">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {state.user?.agencyName}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {state.user?.username}
                  </p>
                </div>
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 origin-top-right bg-white dark:bg-gray-800 rounded-xl shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none py-2">
                  <Link
                    to="/account-settings"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <Settings className="w-4 h-4 mr-3" />
                    <span>{t("accountSettings")}</span>
                  </Link>
                  <button
                    onClick={toggleTheme}
                    className="flex items-center w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    {theme === "light" ? (
                      <Moon className="w-4 h-4 mr-3" />
                    ) : (
                      <Sun className="w-4 h-4 mr-3" />
                    )}
                    <span>
                      {theme === "light" ? t("dark") : t("light")} {t("theme")}
                    </span>
                  </button>
                  <div className="border-t border-gray-100 dark:border-gray-700 my-1"></div>
                  <button
                    onClick={handleLogout}
                    className="flex items-center w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    <LogOut className="w-4 h-4 mr-3" />
                    <span>{t("logout")}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
