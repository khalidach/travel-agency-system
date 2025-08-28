// frontend/src/context/AuthContext.tsx
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

// Use sessionStorage to ensure session is cleared when the tab is closed.
const userFromStorage = sessionStorage.getItem("user");
const initialUser = userFromStorage ? JSON.parse(userFromStorage) : null;

const initialState: AuthState = {
  loading: true, // Start with loading true to check session status
  isAuthenticated: !!initialUser,
  user: initialUser,
};

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case "LOGIN":
    case "REFRESH_TOKEN":
      // The payload no longer contains a token.
      sessionStorage.setItem("user", JSON.stringify(action.payload));
      return {
        ...state,
        isAuthenticated: true,
        user: action.payload,
        loading: false,
      };
    case "LOGOUT":
      // Remove user data from sessionStorage on logout.
      sessionStorage.removeItem("user");
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
    const handleAuthError = () => {
      dispatch({ type: "LOGOUT" });
      toast.error("Your session has expired. Please log in again.");
    };

    const checkUserStatus = async () => {
      try {
        // On initial load, try to refresh the token.
        // If it succeeds, the user is still logged in.
        // If it fails (401), the auth-error event will be caught and the user logged out.
        const userStr = sessionStorage.getItem("user");
        if (userStr) {
          const userData = await api.refreshToken();
          dispatch({ type: "REFRESH_TOKEN", payload: userData });
        } else {
          dispatch({ type: "SET_LOADING", payload: false });
        }
      } catch (error) {
        // This will catch network errors or if the refresh endpoint itself fails for non-auth reasons.
        // The auth-error for 401 is handled by the event listener.
        console.error("Failed to refresh token on initial load", error);
        dispatch({ type: "LOGOUT" });
      }
    };

    checkUserStatus();

    window.addEventListener("auth-error", handleAuthError);
    return () => window.removeEventListener("auth-error", handleAuthError);
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
