import { useEffect, useCallback, useRef } from "react";
import { useAuthContext } from "../context/AuthContext";
import * as api from "./api";
import { toast } from "react-hot-toast";

const useIdleTimeout = (
  idleTimeout: number = 60 * 60 * 1000, // 1 hour
  refreshThreshold: number = 5 * 60 * 1000 // 5 minutes
) => {
  const { state, dispatch } = useAuthContext();
  const idleTimer = useRef<ReturnType<typeof setTimeout>>();
  const lastActivity = useRef<number>(Date.now());

  const handleLogout = useCallback(() => {
    dispatch({ type: "LOGOUT" });
    toast.error("You have been logged out due to inactivity.");
  }, [dispatch]);

  const refreshToken = useCallback(async () => {
    try {
      const userData = await api.refreshToken();
      dispatch({ type: "REFRESH_TOKEN", payload: userData });
      console.log("Token refreshed successfully");
      // After refreshing, reset the timer to ensure another hour of inactivity is required for logout
      resetIdleTimer();
    } catch (error) {
      console.error("Session expired, logging out.", error);
      dispatch({ type: "LOGOUT" });
      toast.error("Your session has expired. Please log in again.");
    }
  }, [dispatch]);

  const resetIdleTimer = useCallback(() => {
    if (idleTimer.current) {
      clearTimeout(idleTimer.current);
    }
    idleTimer.current = setTimeout(handleLogout, idleTimeout);
  }, [handleLogout, idleTimeout]);

  const handleActivity = useCallback(() => {
    const now = Date.now();
    // Refresh token if user is active and the last activity was more than the threshold ago
    if (now - lastActivity.current > refreshThreshold) {
      refreshToken();
    }
    lastActivity.current = now;
    resetIdleTimer();
  }, [resetIdleTimer, refreshToken, refreshThreshold]);

  useEffect(() => {
    if (state.isAuthenticated) {
      const events = ["mousemove", "keydown", "click", "scroll", "touchstart"];
      events.forEach((event) =>
        window.addEventListener(event, handleActivity, { passive: true })
      );

      resetIdleTimer(); // Initial setup

      return () => {
        events.forEach((event) =>
          window.removeEventListener(event, handleActivity)
        );
        if (idleTimer.current) {
          clearTimeout(idleTimer.current);
        }
      };
    }
  }, [state.isAuthenticated, handleActivity, resetIdleTimer]);
};

export default useIdleTimeout;
