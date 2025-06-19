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

    let idleTimer: ReturnType<typeof setTimeout>;
    let tokenRefreshTimer: ReturnType<typeof setInterval>;

    const resetIdleTimer = () => {
      clearTimeout(idleTimer);
      idleTimer = setTimeout(handleLogout, idleTimeout);
    };

    const events = ["mousemove", "keydown", "click", "scroll"];
    events.forEach((event) => window.addEventListener(event, resetIdleTimer));
    resetIdleTimer();

    tokenRefreshTimer = setInterval(handleRefreshToken, refreshInterval);

    return () => {
      clearTimeout(idleTimer);
      clearInterval(tokenRefreshTimer);
      events.forEach((event) =>
        window.removeEventListener(event, resetIdleTimer)
      );
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
