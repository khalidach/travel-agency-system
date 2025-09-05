import React, {
  createContext,
  useContext,
  useReducer,
  ReactNode,
  useEffect,
} from "react";
import * as api from "../services/api";
import { toast } from "react-hot-toast";
import type { User } from "./models";

interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  loading: boolean;
}

type AuthAction =
  | { type: "LOGIN"; payload: User }
  | { type: "REFRESH_TOKEN"; payload: User }
  | { type: "LOGOUT" }
  | { type: "SET_LOADING"; payload: boolean };

// The initial state should always assume the user is logged out until verified.
// We start in a loading state to check the session on app load.
const initialState: AuthState = {
  loading: true,
  isAuthenticated: false,
  user: null,
};

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case "LOGIN":
    case "REFRESH_TOKEN":
      // The httpOnly cookie is the source of truth, not localStorage.
      // We no longer store user data in localStorage.
      return {
        ...state,
        isAuthenticated: true,
        user: action.payload,
        loading: false,
      };
    case "LOGOUT":
      // Clear localStorage for any old data that might exist.
      localStorage.removeItem("user");
      return {
        ...initialState,
        isAuthenticated: false,
        user: null,
        loading: false,
      };
    case "SET_LOADING":
      return { ...state, loading: action.payload };
    default:
      return state;
  }
}

const AuthContext = createContext<{
  state: AuthState;
  dispatch: React.Dispatch<AuthAction>;
} | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  useEffect(() => {
    // This function runs on initial app load to check for a valid session cookie.
    const checkUserSession = async () => {
      try {
        // The refreshToken API endpoint will succeed if a valid httpOnly cookie is present.
        const userData = await api.refreshToken();
        if (userData) {
          dispatch({ type: "LOGIN", payload: userData });
        }
      } catch (error) {
        // If it fails, it means no valid session exists. The state is already logged out.
        console.log("No active session found.");
        dispatch({ type: "LOGOUT" }); // Ensure any lingering state is cleared
      } finally {
        // Stop the loading indicator once the check is complete.
        dispatch({ type: "SET_LOADING", payload: false });
      }
    };

    checkUserSession();
  }, []); // The empty dependency array ensures this runs only once.

  useEffect(() => {
    const handleAuthError = () => {
      dispatch({ type: "LOGOUT" });
      toast.error("Your session has expired. Please log in again.");
    };

    // Event listener to sync logout across tabs
    const handleStorageChange = (event: StorageEvent) => {
      // This is now less critical but good for handling manual logout in another tab.
      if (event.key === "user" && event.newValue === null) {
        dispatch({ type: "LOGOUT" });
      }
    };

    window.addEventListener("auth-error", handleAuthError);
    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("auth-error", handleAuthError);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [dispatch]);

  return (
    <AuthContext.Provider value={{ state, dispatch }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuthContext must be used within an AuthProvider");
  }
  return context;
}
