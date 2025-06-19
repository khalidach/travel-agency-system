import React, {
  createContext,
  useContext,
  useReducer,
  ReactNode,
  useEffect,
} from "react";
import * as api from "../services/api";

// --- INTERFACES (UNCHANGED) ---
export interface User {
  id: number;
  username: string;
  agencyName: string;
  token: string;
}
export interface CityData {
  name: string;
  nights: number;
}
export interface RoomTypeDefinition {
  name: string;
  guests: number;
  isDefault: boolean;
}
export interface Program {
  id: number;
  name: string;
  type: "Hajj" | "Umrah" | "Tourism";
  duration: number;
  cities: CityData[];
  packages: Package[];
  roomTypes: RoomTypeDefinition[];
}
export interface Package {
  name: string;
  hotels: {
    [city: string]: string[];
  };
  prices: PriceStructure[];
}
export interface PriceStructure {
  hotelCombination: string;
  roomTypes: RoomPrice[];
}
export interface RoomPrice {
  type: string;
  guests: number;
}
export interface RelatedPerson {
  ID: number;
  clientName: string;
}
export interface Booking {
  id: number;
  clientNameAr: string;
  clientNameFr: string;
  phoneNumber: string;
  passportNumber: string;
  tripId: string;
  packageId: string;
  selectedHotel: {
    cities: string[];
    hotelNames: string[];
    roomTypes: string[];
  };
  sellingPrice: number;
  basePrice: number;
  advancePayments: Payment[];
  remainingBalance: number;
  isFullyPaid: boolean;
  profit: number;
  createdAt: string;
  relatedPersons?: RelatedPerson[];
}
export interface Payment {
  _id: string;
  id: string;
  amount: number;
  method: "cash" | "cheque" | "transfer" | "card";
  date: string;
  chequeNumber?: string;
  bankName?: string;
  chequeCashingDate?: string;
}
export interface HotelPrice {
  name: string;
  city: string;
  nights: number;
  PricePerNights: {
    [roomTypeName: string]: number;
  };
}
export interface ProgramPricing {
  id: number;
  selectProgram: string;
  programId: number;
  ticketAirline: number;
  visaFees: number;
  guideFees: number;
  allHotels: HotelPrice[];
}

interface AppState {
  isAuthenticated: boolean;
  user: User | null;
  programs: Program[];
  bookings: Booking[];
  programPricing: ProgramPricing[];
  currentLanguage: "en" | "ar" | "fr";
  loading: boolean;
}

// --- AppAction Type (UNCHANGED) ---
type AppAction =
  | { type: "LOGIN"; payload: User }
  | { type: "REFRESH_TOKEN"; payload: User }
  | { type: "LOGOUT" }
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_PROGRAMS"; payload: Program[] }
  | { type: "SET_BOOKINGS"; payload: Booking[] }
  | { type: "SET_PROGRAM_PRICING"; payload: ProgramPricing[] }
  | { type: "ADD_PROGRAM"; payload: Program }
  | { type: "UPDATE_PROGRAM"; payload: Program }
  | { type: "DELETE_PROGRAM"; payload: number }
  | { type: "ADD_BOOKING"; payload: Booking }
  | { type: "UPDATE_BOOKING"; payload: Booking }
  | { type: "DELETE_BOOKING"; payload: number }
  | {
      type: "ADD_PAYMENT";
      payload: { bookingId: number; updatedBooking: Booking };
    }
  | {
      type: "UPDATE_PAYMENT";
      payload: { bookingId: number; updatedBooking: Booking };
    }
  | {
      type: "DELETE_PAYMENT";
      payload: { bookingId: number; updatedBooking: Booking };
    }
  | { type: "SET_LANGUAGE"; payload: "en" | "ar" | "fr" }
  | { type: "ADD_PROGRAM_PRICING"; payload: ProgramPricing }
  | { type: "UPDATE_PROGRAM_PRICING"; payload: ProgramPricing }
  | { type: "DELETE_PROGRAM_PRICING"; payload: number };

const userFromStorage = localStorage.getItem("user");
const initialUser = userFromStorage ? JSON.parse(userFromStorage) : null;

// MODIFIED: `loading` is now `false` by default
const initialState: AppState = {
  programs: [],
  bookings: [],
  programPricing: [],
  currentLanguage: "en",
  loading: false, // Changed from `!!initialUser`
  isAuthenticated: !!initialUser,
  user: initialUser,
};

// --- appReducer (UNCHANGED from previous step) ---
function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case "LOGIN":
      localStorage.setItem("user", JSON.stringify(action.payload));
      return {
        ...state,
        isAuthenticated: true,
        user: action.payload,
        loading: false,
      };
    case "REFRESH_TOKEN":
      localStorage.setItem("user", JSON.stringify(action.payload));
      return {
        ...state,
        user: action.payload,
      };
    case "LOGOUT":
      localStorage.removeItem("user");
      return {
        ...initialState,
        isAuthenticated: false,
        user: null,
        loading: false,
        programs: [],
        bookings: [],
        programPricing: [],
      };
    case "SET_LOADING":
      return { ...state, loading: action.payload };
    case "SET_PROGRAMS":
      return { ...state, programs: action.payload };
    case "SET_BOOKINGS":
      return { ...state, bookings: action.payload };
    case "SET_PROGRAM_PRICING":
      return { ...state, programPricing: action.payload };
    case "ADD_PROGRAM":
      return { ...state, programs: [...state.programs, action.payload] };
    case "UPDATE_PROGRAM":
      return {
        ...state,
        programs: state.programs.map((p) =>
          p.id === action.payload.id ? action.payload : p
        ),
      };
    case "DELETE_PROGRAM":
      return {
        ...state,
        programs: state.programs.filter((p) => p.id !== action.payload),
      };
    case "ADD_BOOKING":
      return { ...state, bookings: [...state.bookings, action.payload] };
    case "UPDATE_BOOKING":
      return {
        ...state,
        bookings: state.bookings.map((b) =>
          b.id === action.payload.id ? action.payload : b
        ),
      };
    case "DELETE_BOOKING":
      return {
        ...state,
        bookings: state.bookings.filter((b) => b.id !== action.payload),
      };
    case "ADD_PAYMENT":
    case "UPDATE_PAYMENT":
    case "DELETE_PAYMENT":
      return {
        ...state,
        bookings: state.bookings.map((b) =>
          b.id === action.payload.bookingId ? action.payload.updatedBooking : b
        ),
      };
    case "SET_LANGUAGE":
      return { ...state, currentLanguage: action.payload };
    case "ADD_PROGRAM_PRICING":
      return {
        ...state,
        programPricing: [...state.programPricing, action.payload],
      };
    case "UPDATE_PROGRAM_PRICING":
      return {
        ...state,
        programPricing: state.programPricing.map((p) =>
          p.id === action.payload.id ? action.payload : p
        ),
      };
    case "DELETE_PROGRAM_PRICING":
      return {
        ...state,
        programPricing: state.programPricing.filter(
          (p) => p.id !== action.payload
        ),
      };
    default:
      return state;
  }
}

const AppContext = createContext<{
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
} | null>(null);

// --- AppProvider and useAppContext (UNCHANGED from previous step) ---
export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  useEffect(() => {
    const handleAuthError = () => {
      dispatch({ type: "LOGOUT" });
    };
    window.addEventListener("auth-error", handleAuthError);

    return () => {
      window.removeEventListener("auth-error", handleAuthError);
    };
  }, []);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useAppContext must be used within an AppProvider");
  }
  return context;
}
