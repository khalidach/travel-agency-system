import { useEffect, useCallback } from "react";
import { useAppContext } from "../context/AppContext";
import * as api from "./api";
import { toast } from "react-hot-toast";

const useIdleTimeout = (idleTimeout: number, refreshInterval: number) => {
  const { dispatch, state } = useAppContext();

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

    // This timer resets on any user activity. If it ever completes, the user is logged out.
    const resetIdleTimer = () => {
      clearTimeout(idleTimer);
      idleTimer = setTimeout(handleLogout, idleTimeout);
    };

    // Add event listeners to reset the idle timer.
    const events = ["mousemove", "keydown", "click", "scroll"];
    events.forEach((event) => window.addEventListener(event, resetIdleTimer));
    resetIdleTimer(); // Start the first idle timer

    // This interval timer periodically refreshes the token in the background.
    // This keeps the session alive as long as the tab is open and the user is active.
    tokenRefreshTimer = setInterval(handleRefreshToken, refreshInterval);

    // Cleanup function
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
