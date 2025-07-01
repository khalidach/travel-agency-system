// frontend/src/services/useIdleTimeout.ts

import { useEffect, useCallback, useRef } from "react";
import { useAuthContext } from "../context/AuthContext";
import * as api from "./api";
import { toast } from "react-hot-toast";

const useIdleTimeout = (idleTimeout: number = 60 * 60 * 1000) => {
  // Default 1 hour
  const { state, dispatch } = useAuthContext();
  const idleLogoutTimer = useRef<ReturnType<typeof setTimeout>>();
  const refreshTokenTimer = useRef<ReturnType<typeof setTimeout>>();
  const lastActivityTime = useRef<number>(Date.now());

  const handleLogout = useCallback(() => {
    dispatch({ type: "LOGOUT" });
    toast.error("You have been logged out due to inactivity.");

    // Clear all timers
    if (idleLogoutTimer.current) {
      clearTimeout(idleLogoutTimer.current);
    }
    if (refreshTokenTimer.current) {
      clearTimeout(refreshTokenTimer.current);
    }
  }, [dispatch]);

  const refreshToken = useCallback(async () => {
    try {
      const userData = await api.refreshToken();
      dispatch({ type: "REFRESH_TOKEN", payload: userData });
      console.log("Token refreshed successfully");
    } catch (error) {
      console.error("Failed to refresh token, logging out.", error);
      handleLogout();
    }
  }, [dispatch, handleLogout]);

  const resetIdleTimer = useCallback(() => {
    lastActivityTime.current = Date.now();

    // Clear existing idle logout timer
    if (idleLogoutTimer.current) {
      clearTimeout(idleLogoutTimer.current);
    }

    // Set new idle logout timer
    idleLogoutTimer.current = setTimeout(() => {
      handleLogout();
    }, idleTimeout);
  }, [handleLogout, idleTimeout]);

  const scheduleTokenRefresh = useCallback(() => {
    // Clear existing refresh timer
    if (refreshTokenTimer.current) {
      clearTimeout(refreshTokenTimer.current);
    }

    // Schedule token refresh for 50 minutes (10 minutes before expiry)
    const refreshTime = 50 * 60 * 1000; // 50 minutes

    refreshTokenTimer.current = setTimeout(async () => {
      // Check if user has been active recently
      const timeSinceLastActivity = Date.now() - lastActivityTime.current;

      if (timeSinceLastActivity < idleTimeout) {
        // User is still active, refresh token
        await refreshToken();
        // Schedule next refresh
        scheduleTokenRefresh();
      } else {
        // User has been idle too long, will be logged out by idle timer
        console.log("User idle, skipping token refresh");
      }
    }, refreshTime);
  }, [refreshToken, idleTimeout]);

  useEffect(() => {
    if (!state.isAuthenticated) {
      // Clear all timers when not authenticated
      if (idleLogoutTimer.current) {
        clearTimeout(idleLogoutTimer.current);
      }
      if (refreshTokenTimer.current) {
        clearTimeout(refreshTokenTimer.current);
      }
      return;
    }

    // Track user activity events
    const events = ["mousemove", "keydown", "click", "scroll", "touchstart"];

    // Add event listeners
    events.forEach((event) =>
      window.addEventListener(event, resetIdleTimer, { passive: true })
    );

    // Initialize timers
    resetIdleTimer();
    scheduleTokenRefresh();

    return () => {
      // Cleanup
      if (idleLogoutTimer.current) {
        clearTimeout(idleLogoutTimer.current);
      }
      if (refreshTokenTimer.current) {
        clearTimeout(refreshTokenTimer.current);
      }
      events.forEach((event) =>
        window.removeEventListener(event, resetIdleTimer)
      );
    };
  }, [state.isAuthenticated, resetIdleTimer, scheduleTokenRefresh]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (idleLogoutTimer.current) {
        clearTimeout(idleLogoutTimer.current);
      }
      if (refreshTokenTimer.current) {
        clearTimeout(refreshTokenTimer.current);
      }
    };
  }, []);
};

export default useIdleTimeout;
