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

// Use localStorage to persist session across tabs.
const userFromStorage = localStorage.getItem("user");
const initialUser = userFromStorage ? JSON.parse(userFromStorage) : null;

const initialState: AuthState = {
  loading: false,
  isAuthenticated: !!initialUser,
  user: initialUser,
};

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case "LOGIN":
    case "REFRESH_TOKEN":
      // Use localStorage to store user data.
      localStorage.setItem("user", JSON.stringify(action.payload));
      return {
        ...state,
        isAuthenticated: true,
        user: action.payload,
        loading: false,
      };
    case "LOGOUT":
      // Remove user data from localStorage on logout.
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
    const handleAuthError = () => {
      dispatch({ type: "LOGOUT" });
      toast.error("Your session has expired. Please log in again.");
    };

    // Event listener to sync logout across tabs
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === "user" && event.newValue === null) {
        // When 'user' is removed from localStorage in another tab, log out here too.
        dispatch({ type: "LOGOUT" });
      }
    };

    window.addEventListener("auth-error", handleAuthError);
    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("auth-error", handleAuthError);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

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
