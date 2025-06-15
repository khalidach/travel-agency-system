import React, { createContext, useContext, useReducer, ReactNode, useEffect } from "react";
import * as api from '../services/api';

// --- INTERFACES (UPDATED FOR POSTGRESQL) ---
export interface User {
  id: number; // Changed from _id: string
  username: string;
  agencyName: string; // Switched to camelCase
  token: string;
}

export interface CityData {
  name: string;
  nights: number;
}

export interface Program {
  id: number; // Changed from _id: string
  name: string;
  type: "Hajj" | "Umrah" | "Tourism";
  duration: number;
  cities: CityData[];
  packages: Package[];
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
  sellingPrice: number;
}

export interface Booking {
  id: number; // Changed from _id: string
  clientNameAr: string;
  clientNameFr: string;
  phoneNumber: string;
  passportNumber: string;
  tripId: string;
  packageId: string;
  selectedHotel: {
    cities: string[];
    hotelNames: string[];
    roomTypes: string[]; // Changed from roomType: string
  };
  sellingPrice: number;
  basePrice: number;
  advancePayments: Payment[];
  remainingBalance: number;
  isFullyPaid: boolean;
  profit: number;
  createdAt: string;
}

export interface Payment {
  _id: string; // MongoDB IDs can still exist in the JSONB field, so we keep this for payments
  id: string; // Keeping both for safety
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
    double: number;
    triple: number;
    quad: number;
    quintuple: number;
  };
}

export interface ProgramPricing {
  id: number; // Changed from _id: string
  selectProgram: string;
  programId: string;
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

type AppAction =
  | { type: "LOGIN"; payload: User }
  | { type: "LOGOUT" }
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_PROGRAMS"; payload: Program[] }
  | { type: "SET_BOOKINGS"; payload: Booking[] }
  | { type: "SET_PROGRAM_PRICING"; payload: ProgramPricing[] }
  | { type: "ADD_PROGRAM"; payload: Program }
  | { type: "UPDATE_PROGRAM"; payload: Program }
  | { type: "DELETE_PROGRAM"; payload: number } // Changed to number
  | { type: "ADD_BOOKING"; payload: Booking }
  | { type: "UPDATE_BOOKING"; payload: Booking }
  | { type: "DELETE_BOOKING"; payload: number } // Changed to number
  | { type: "ADD_PAYMENT"; payload: { bookingId: number; updatedBooking: Booking } } // Changed to number
  | { type: "UPDATE_PAYMENT"; payload: { bookingId: number; updatedBooking: Booking } } // Changed to number
  | { type: "DELETE_PAYMENT"; payload: { bookingId: number; updatedBooking: Booking } } // Changed to number
  | { type: "SET_LANGUAGE"; payload: "en" | "ar" | "fr" }
  | { type: "ADD_PROGRAM_PRICING"; payload: ProgramPricing }
  | { type: "UPDATE_PROGRAM_PRICING"; payload: ProgramPricing }
  | { type: "DELETE_PROGRAM_PRICING"; payload: number }; // Changed to number


const userFromStorage = localStorage.getItem('user');
const initialUser = userFromStorage ? JSON.parse(userFromStorage) : null;

const initialState: AppState = {
  programs: [],
  bookings: [],
  programPricing: [],
  currentLanguage: "en",
  loading: !!initialUser,
  isAuthenticated: !!initialUser,
  user: initialUser,
};

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case "LOGIN":
      // The login response now provides `agencyName` directly
      localStorage.setItem('user', JSON.stringify(action.payload));
      return { ...state, isAuthenticated: true, user: action.payload, loading: true };
    case "LOGOUT":
      localStorage.removeItem('user');
      return { ...initialState, isAuthenticated: false, user: null, loading: false, programs: [], bookings: [], programPricing: [] };
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
            bookings: state.bookings.map(b => b.id === action.payload.bookingId ? action.payload.updatedBooking : b)
        };
    case "SET_LANGUAGE":
      return { ...state, currentLanguage: action.payload };
    case "ADD_PROGRAM_PRICING":
        return { ...state, programPricing: [...state.programPricing, action.payload] };
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

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [programs, bookings, programPricing] = await Promise.all([
          api.getPrograms(),
          api.getBookings(),
          api.getProgramPricing(),
        ]);
        dispatch({ type: "SET_PROGRAMS", payload: programs });
        dispatch({ type: "SET_BOOKINGS", payload: bookings });
        dispatch({ type: "SET_PROGRAM_PRICING", payload: programPricing });
      } catch (error) {
        console.error("Failed to fetch initial data", error);
        if (error instanceof Error && error.message.includes('401')) {
          dispatch({ type: 'LOGOUT' });
        }
      } finally {
        dispatch({ type: "SET_LOADING", payload: false });
      }
    };
    
    const handleAuthError = () => {
        dispatch({ type: 'LOGOUT' });
    };
    window.addEventListener('auth-error', handleAuthError);

    if (state.isAuthenticated) {
      fetchData();
    }

    return () => {
        window.removeEventListener('auth-error', handleAuthError);
    };
  }, [state.isAuthenticated]);

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