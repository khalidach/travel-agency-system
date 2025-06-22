// frontend/src/services/useIdleTimeout.ts

import { useEffect, useCallback, useRef } from "react";
import { useAuthContext } from "../context/AuthContext";
import * as api from "./api";
import { toast } from "react-hot-toast";

const useIdleTimeout = (idleTimeout: number, refreshInterval: number) => {
  const { state, dispatch } = useAuthContext();
  const idleLogoutTimer = useRef<ReturnType<typeof setTimeout>>();

  // The refreshTokenTimer is no longer needed here.

  const handleLogout = useCallback(() => {
    dispatch({ type: "LOGOUT" });
    toast.error("You have been logged out due to inactivity.");
  }, [dispatch]);

  const resetIdleTimer = useCallback(() => {
    if (idleLogoutTimer.current) {
      clearTimeout(idleLogoutTimer.current);
    }
    idleLogoutTimer.current = setTimeout(handleLogout, idleTimeout);
  }, [handleLogout, idleTimeout]);

  // This effect handles the token refresh independently.
  useEffect(() => {
    if (!state.isAuthenticated) {
      return;
    }

    const refreshToken = async () => {
      try {
        const userData = await api.refreshToken();
        dispatch({ type: "REFRESH_TOKEN", payload: userData });
      } catch (error) {
        console.error("Failed to refresh token, logging out.", error);
        dispatch({ type: "LOGOUT" });
        toast.error("Your session has expired. Please log in again.");
      }
    };

    // Run the refresh token logic on an interval
    const interval = setInterval(refreshToken, refreshInterval);

    // Cleanup the interval when the component unmounts or user logs out
    return () => clearInterval(interval);
  }, [state.isAuthenticated, refreshInterval, dispatch]);

  // This effect handles the idle logout timer based on user activity.
  useEffect(() => {
    if (!state.isAuthenticated) {
      return;
    }

    const events = ["mousemove", "keydown", "click", "scroll"];
    events.forEach((event) => window.addEventListener(event, resetIdleTimer));

    resetIdleTimer();

    return () => {
      if (idleLogoutTimer.current) {
        clearTimeout(idleLogoutTimer.current);
      }
      events.forEach((event) =>
        window.removeEventListener(event, resetIdleTimer)
      );
    };
  }, [state.isAuthenticated, resetIdleTimer]);
};

export default useIdleTimeout;
