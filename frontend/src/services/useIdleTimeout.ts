import { useEffect, useCallback, useRef } from "react";
import { useAuthContext } from "../context/AuthContext";
import * as api from "./api";
import { toast } from "react-hot-toast";

const useIdleTimeout = (idleTimeout: number, refreshInterval: number) => {
  const { state, dispatch } = useAuthContext();
  const idleLogoutTimer = useRef<ReturnType<typeof setTimeout>>();

  const handleLogout = useCallback(() => {
    dispatch({ type: "LOGOUT" });
    toast.error("You have been logged out due to inactivity.");
  }, [dispatch]);

  const resetIdleTimer = useCallback(() => {
    // Clear the previous idle timer
    if (idleLogoutTimer.current) {
      clearTimeout(idleLogoutTimer.current);
    }
    // Set a new idle timer
    idleLogoutTimer.current = setTimeout(handleLogout, idleTimeout);
  }, [handleLogout, idleTimeout]);

  // Effect for handling the idle timeout
  useEffect(() => {
    if (!state.isAuthenticated) {
      return;
    }

    // Set up event listeners to reset the idle timer on user activity
    const events = ["mousemove", "keydown", "click", "scroll"];
    events.forEach((event) => window.addEventListener(event, resetIdleTimer));

    // Initialize the idle timer when the component mounts
    resetIdleTimer();

    // Cleanup function to remove event listeners and clear the timer
    return () => {
      if (idleLogoutTimer.current) {
        clearTimeout(idleLogoutTimer.current);
      }
      events.forEach((event) =>
        window.removeEventListener(event, resetIdleTimer)
      );
    };
  }, [state.isAuthenticated, resetIdleTimer]);

  // Effect for periodically refreshing the token
  useEffect(() => {
    if (!state.isAuthenticated) {
      return;
    }

    // Function to refresh the token
    const refreshToken = async () => {
      try {
        const userData = await api.refreshToken();
        dispatch({ type: "REFRESH_TOKEN", payload: userData });
      } catch (error) {
        console.error("Failed to refresh token, logging out.", error);
        handleLogout();
      }
    };

    // Set an interval to refresh the token periodically
    const tokenRefreshInterval = setInterval(refreshToken, refreshInterval);

    // Cleanup function to clear the interval when the component unmounts or auth state changes
    return () => {
      clearInterval(tokenRefreshInterval);
    };
  }, [state.isAuthenticated, refreshInterval, dispatch, handleLogout]);
};

export default useIdleTimeout;
