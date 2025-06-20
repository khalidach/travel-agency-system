import React from "react";
import { useTranslation } from "react-i18next";
import { useAuthContext } from "../context/AuthContext"; // Updated
import { Globe, User, LogOut } from "lucide-react";

export default function Header() {
  const { t, i18n } = useTranslation();
  const { state, dispatch } = useAuthContext(); // Updated

  const changeLanguage = (lang: "en" | "ar" | "fr") => {
    i18n.changeLanguage(lang);
    // Note: The 'SET_LANGUAGE' action was part of the old AppContext.
    // This can be moved to a separate 'SettingsContext' or managed by i18n exclusively.
    // For now, we remove the dispatch call as it doesn't belong in AuthContext.
  };

  const handleLogout = () => {
    dispatch({ type: "LOGOUT" });
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-100">
      <div className="px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Welcome, {state.user?.agencyName || "User"}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Here's your travel management dashboard
            </p>
          </div>

          <div className="flex items-center space-x-4">
            {/* Language Selector */}
            <div className="relative">
              <div className="flex items-center space-x-1 bg-gray-50 rounded-lg p-1">
                <button
                  onClick={() => changeLanguage("en")}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    i18n.language === "en"
                      ? "bg-white text-blue-600 shadow-sm"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  EN
                </button>
                <button
                  onClick={() => changeLanguage("ar")}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    i18n.language === "ar"
                      ? "bg-white text-blue-600 shadow-sm"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  العربية
                </button>
                <button
                  onClick={() => changeLanguage("fr")}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    i18n.language === "fr"
                      ? "bg-white text-blue-600 shadow-sm"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  FR
                </button>
              </div>
            </div>

            {/* Profile & Logout */}
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-full flex items-center justify-center ring-2 ring-white">
                <User className="w-5 h-5 text-white" />
              </div>
              <div className="hidden md:block">
                <p className="text-sm font-medium text-gray-900">
                  {state.user?.agencyName}
                </p>
                <p className="text-xs text-gray-500">{state.user?.username}</p>
              </div>
              <button
                onClick={handleLogout}
                className="p-2 text-gray-500 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors"
                title="Logout"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
