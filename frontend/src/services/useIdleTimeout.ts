import { useEffect, useCallback } from "react";
import { useAuthContext } from "../context/AuthContext"; // Updated
import * as api from "./api";
import { toast } from "react-hot-toast";

const useIdleTimeout = (idleTimeout: number, refreshInterval: number) => {
  const { state, dispatch } = useAuthContext(); // Updated

  const handleLogout = useCallback(() => {
    dispatch({ type: "LOGOUT" });
    toast.error("You have been logged out due to inactivity.");
  }, [dispatch]);

  const handleRefreshToken = useCallback(async () => {
    try {
      console.log("Refreshing token...");
      const userData = await api.refreshToken();
      dispatch({ type: "REFRESH_TOKEN", payload: userData });
    } catch (error) {
      console.error("Failed to refresh token, logging out.", error);
      handleLogout();
    }
  }, [dispatch, handleLogout]);

  useEffect(() => {
    if (!state.isAuthenticated) {
      return;
    }

    let idleLogoutTimer: ReturnType<typeof setTimeout>;
    let tokenRefreshTimer: ReturnType<typeof setTimeout>;

    const resetTimers = () => {
      // Clear existing timers
      clearTimeout(idleLogoutTimer);
      clearTimeout(tokenRefreshTimer);

      // Reset timers
      idleLogoutTimer = setTimeout(handleLogout, idleTimeout);
      tokenRefreshTimer = setTimeout(handleRefreshToken, refreshInterval);
    };

    const events = ["mousemove", "keydown", "click", "scroll"];
    events.forEach((event) => window.addEventListener(event, resetTimers));

    // Initialize timers
    resetTimers();

    return () => {
      clearTimeout(idleLogoutTimer);
      clearTimeout(tokenRefreshTimer);
      events.forEach((event) => window.removeEventListener(event, resetTimers));
    };
  }, [
    state.isAuthenticated,
    idleTimeout,
    refreshInterval,
    handleLogout,
    handleRefreshToken,
  ]);
};

export default useIdleTimeout;
