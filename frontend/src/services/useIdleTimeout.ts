// frontend/src/services/useIdleTimeout.ts

import { useEffect, useCallback, useRef } from "react";
import { useAuthContext } from "../context/AuthContext";
import * as api from "./api";
import { toast } from "react-hot-toast";

const useIdleTimeout = (idleTimeout: number, refreshInterval: number) => {
  const { state, dispatch } = useAuthContext();
  const idleLogoutTimer = useRef<ReturnType<typeof setTimeout>>();
  const refreshTokenTimer = useRef<ReturnType<typeof setInterval>>();

  const handleLogout = useCallback(() => {
    dispatch({ type: "LOGOUT" });
    toast.error("You have been logged out due to inactivity.");
  }, [dispatch]);

  const refreshToken = async () => {
    try {
      const userData = await api.refreshToken();
      dispatch({ type: "REFRESH_TOKEN", payload: userData });
    } catch (error) {
      console.error("Failed to refresh token, logging out.", error);
      handleLogout();
    }
  };

  const resetTimers = useCallback(() => {
    if (idleLogoutTimer.current) {
      clearTimeout(idleLogoutTimer.current);
    }
    if (refreshTokenTimer.current) {
      clearInterval(refreshTokenTimer.current);
    }

    idleLogoutTimer.current = setTimeout(handleLogout, idleTimeout);
    refreshTokenTimer.current = setInterval(refreshToken, refreshInterval);
  }, [handleLogout, idleTimeout, refreshInterval]);

  useEffect(() => {
    if (!state.isAuthenticated) {
      return;
    }

    const events = ["mousemove", "keydown", "click", "scroll"];
    events.forEach((event) => window.addEventListener(event, resetTimers));

    resetTimers();

    return () => {
      if (idleLogoutTimer.current) {
        clearTimeout(idleLogoutTimer.current);
      }
      if (refreshTokenTimer.current) {
        clearInterval(refreshTokenTimer.current);
      }
      events.forEach((event) => window.removeEventListener(event, resetTimers));
    };
  }, [state.isAuthenticated, resetTimers]);
};

export default useIdleTimeout;
