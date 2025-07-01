// frontend/src/services/useIdleTimeout.ts

import { useEffect, useCallback, useRef } from "react";
import { useAuthContext } from "../context/AuthContext";
import * as api from "./api";
import { toast } from "react-hot-toast";

const useIdleTimeout = (
  idleTimeout: number = 60 * 60 * 1000, // 1 hour
  refreshInterval: number = 45 * 60 * 1000 // 45 minutes
) => {
  const { state, dispatch } = useAuthContext();
  const idleTimer = useRef<ReturnType<typeof setTimeout>>();
  const refreshTokenTimer = useRef<ReturnType<typeof setInterval>>();

  const handleLogoutForInactivity = useCallback(() => {
    // Clear timers on logout
    if (idleTimer.current) clearTimeout(idleTimer.current);
    if (refreshTokenTimer.current) clearInterval(refreshTokenTimer.current);

    dispatch({ type: "LOGOUT" });
    toast.error("You have been logged out due to inactivity.");
  }, [dispatch]);

  const resetIdleTimer = useCallback(() => {
    if (idleTimer.current) {
      clearTimeout(idleTimer.current);
    }
    idleTimer.current = setTimeout(handleLogoutForInactivity, idleTimeout);
  }, [handleLogoutForInactivity, idleTimeout]);

  const refreshToken = useCallback(async () => {
    try {
      const userData = await api.refreshToken();
      dispatch({ type: "REFRESH_TOKEN", payload: userData });
      console.log("Token refreshed successfully");
    } catch (error) {
      console.error("Failed to refresh token, logging out.", error);
      // Clear timers on logout
      if (idleTimer.current) clearTimeout(idleTimer.current);
      if (refreshTokenTimer.current) clearInterval(refreshTokenTimer.current);
      dispatch({ type: "LOGOUT" });
      toast.error("Your session has expired. Please log in again.");
    }
  }, [dispatch]);

  useEffect(() => {
    if (state.isAuthenticated) {
      // Setup user activity listeners
      const events = ["mousemove", "keydown", "click", "scroll", "touchstart"];
      events.forEach((event) =>
        window.addEventListener(event, resetIdleTimer, { passive: true })
      );

      // Initial setup of timers
      resetIdleTimer();
      refreshTokenTimer.current = setInterval(refreshToken, refreshInterval);

      // Cleanup function
      return () => {
        events.forEach((event) =>
          window.removeEventListener(event, resetIdleTimer)
        );
        if (idleTimer.current) {
          clearTimeout(idleTimer.current);
        }
        if (refreshTokenTimer.current) {
          clearInterval(refreshTokenTimer.current);
        }
      };
    }
  }, [state.isAuthenticated, resetIdleTimer, refreshToken, refreshInterval]);
};

export default useIdleTimeout;
