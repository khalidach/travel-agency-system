// frontend/src/components/Header.tsx
import React, { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useAuthContext } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { useQueryClient, useQuery, useMutation } from "@tanstack/react-query";
import {
  User,
  LogOut,
  Settings,
  Sun,
  Moon,
  Bell,
  Check,
  X,
  Trash2,
} from "lucide-react"; // Added Trash2
import { Link } from "react-router-dom";
import * as api from "../services/api";
import { toast } from "react-hot-toast";

export default function Header() {
  const { t, i18n } = useTranslation();
  const { state, dispatch } = useAuthContext();
  const { theme, toggleTheme } = useTheme();
  const queryClient = useQueryClient();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
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

  // --- Notification Logic ---
  const { data: notifications = [] } = useQuery<any[]>({
    queryKey: ["notifications"],
    queryFn: async () => {
      return await api.getNotifications();
    },
    refetchInterval: 30000,
    enabled: state.isAuthenticated,
  });

  const markReadMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.markNotificationRead(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      await api.markAllNotificationsRead();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  // <NEW CODE>
  const deleteNotificationMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.deleteNotification(id);
    },
    onSuccess: () => {
      toast.success(t("notificationDeleted") || "Notification deleted");
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const clearAllNotificationsMutation = useMutation({
    mutationFn: async () => {
      await api.deleteAllNotifications();
    },
    onSuccess: () => {
      toast.success(t("notificationsCleared") || "Notifications cleared");
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const rejectBookingMutation = useMutation({
    mutationFn: async ({
      bookingId,
      notificationId,
    }: {
      bookingId: number;
      notificationId: number;
    }) => {
      await api.deleteBooking(bookingId); // Delete the booking directly
      await api.deleteNotification(notificationId); // Delete the notification
    },
    onSuccess: () => {
      toast.success(
        t("bookingRejectedAndDeleted") || "Booking rejected and deleted",
      );
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["bookingsByProgram"] });
      // Invalidate total bookings count/capacity queries if they exist
      queryClient.invalidateQueries({ queryKey: ["programs"] });
    },
    onError: (error: any) => {
      toast.error(
        t("errorRejectingBooking") ||
          error.message ||
          "Failed to reject booking",
      );
    },
  });
  // </NEW CODE>

  const updateStatusMutation = useMutation({
    mutationFn: async ({
      id,
      status,
      notificationId,
    }: {
      id: number;
      status: "confirmed" | "cancelled";
      notificationId: number;
    }) => {
      await api.updateBookingStatus(id, status);
      await api.markNotificationRead(notificationId);
    },
    onSuccess: () => {
      toast.success(t("statusUpdated") || "Status updated");
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["bookingsByProgram"] });
      queryClient.invalidateQueries({ queryKey: ["programs"] });
    },
    onError: () => {
      toast.error(t("errorUpdatingStatus") || "Failed to update status");
    },
  });

  const unreadCount = notifications.filter((n) => !n.isRead).length;
  // --------------------------

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setDropdownOpen(false);
        if (
          !event.target ||
          !(event.target as Element).closest(".notification-area")
        ) {
          setShowNotifications(false);
        }
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

            <div className="relative notification-area">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 relative transition-colors"
              >
                <Bell className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-gray-800"></span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-xl shadow-lg ring-1 ring-black ring-opacity-5 z-50 overflow-hidden">
                  <div className="p-3 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-700/50">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                      {t("notifications") || "Notifications"}
                    </h3>
                    <div className="flex items-center gap-3">
                      {unreadCount > 0 && (
                        <button
                          onClick={() => markAllReadMutation.mutate()}
                          className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400"
                        >
                          {t("markAllRead") || "Mark all read"}
                        </button>
                      )}
                      {notifications.length > 0 && (
                        <button
                          onClick={() => clearAllNotificationsMutation.mutate()}
                          className="text-xs text-red-600 hover:text-red-700 dark:text-red-400"
                        >
                          {t("clearAll") || "Clear All"}
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="p-6 text-center text-sm text-gray-500 dark:text-gray-400">
                        {t("noNotifications") || "No new notifications"}
                      </div>
                    ) : (
                      notifications.map((notif) => (
                        <div
                          key={notif.id}
                          className={`p-4 border-b border-gray-50 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors group relative ${
                            !notif.isRead
                              ? "bg-blue-50/50 dark:bg-blue-900/10"
                              : ""
                          }`}
                          onClick={() =>
                            !notif.isRead && markReadMutation.mutate(notif.id)
                          }
                        >
                          {/* Trash Icon for Deleting Single Notification */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteNotificationMutation.mutate(notif.id);
                            }}
                            className="absolute top-2 right-2 p-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                            title={t("deleteNotification") || "Delete"}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>

                          <div className="flex justify-between items-start mb-1 pr-6">
                            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                              {notif.title}
                            </p>
                            {!notif.isRead && (
                              <span className="w-2 h-2 bg-blue-500 rounded-full mt-1.5 flex-shrink-0"></span>
                            )}
                          </div>
                          <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                            {notif.message}
                          </p>

                          {/* APPROVAL BUTTONS IN NOTIFICATION */}
                          {notif.type === "booking_approval" &&
                            notif.referenceId && (
                              <div className="flex gap-2 mt-3 justify-end">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    rejectBookingMutation.mutate({
                                      bookingId: notif.referenceId,
                                      notificationId: notif.id,
                                    });
                                  }}
                                  className="flex items-center px-2 py-1 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-md border border-red-200"
                                >
                                  <X className="w-3 h-3 mr-1" />
                                  {t("reject") || "Reject"}
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    updateStatusMutation.mutate({
                                      id: notif.referenceId,
                                      status: "confirmed",
                                      notificationId: notif.id,
                                    });
                                  }}
                                  className="flex items-center px-2 py-1 text-xs font-medium text-green-600 bg-green-50 hover:bg-green-100 rounded-md border border-green-200"
                                >
                                  <Check className="w-3 h-3 mr-1" />
                                  {t("approve") || "Approve"}
                                </button>
                              </div>
                            )}

                          <p className="text-[10px] text-gray-400 mt-2 text-right">
                            {new Date(notif.createdAt).toLocaleString(
                              i18n.language,
                            )}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

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
                <div className="absolute right-0 mt-2 w-56 origin-top-right bg-white dark:bg-gray-800 rounded-xl shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none py-2 z-50">
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
