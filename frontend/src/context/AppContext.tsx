import React, { createContext, useContext, useReducer, ReactNode, useEffect } from "react";
import * as api from '../services/api';

// Interfaces (keep them as they are)
export interface CityData {
  name: string;
  nights: number;
}

export interface Program {
  _id: string;
  id: string;
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
  _id: string;
  id: string;
  clientNameAr: string;
  clientNameFr: string;
  phoneNumber: string;
  passportNumber: string;
  tripId: string;
  packageId: string;
  selectedHotel: {
    cities: string[];
    hotelNames: string[];
    roomType: string;
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
    double: number;
    triple: number;
    quad: number;
    quintuple: number;
  };
}

export interface ProgramPricing {
  _id: string;
  id: string;
  selectProgram: string;
  programId: string;
  ticketAirline: number;
  visaFees: number;
  guideFees: number;
  allHotels: HotelPrice[];
}

interface AppState {
  programs: Program[];
  bookings: Booking[];
  programPricing: ProgramPricing[];
  currentLanguage: "en" | "ar" | "fr";
  loading: boolean;
}

// AppAction remains the same, but with new actions for setting data
type AppAction =
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_PROGRAMS"; payload: Program[] }
  | { type: "SET_BOOKINGS"; payload: Booking[] }
  | { type: "SET_PROGRAM_PRICING"; payload: ProgramPricing[] }
  | { type: "ADD_PROGRAM"; payload: Program }
  | { type: "UPDATE_PROGRAM"; payload: Program }
  | { type: "DELETE_PROGRAM"; payload: string }
  | { type: "ADD_BOOKING"; payload: Booking }
  | { type: "UPDATE_BOOKING"; payload: Booking }
  | { type: "DELETE_BOOKING"; payload: string }
  | { type: "ADD_PAYMENT"; payload: { bookingId: string; updatedBooking: Booking } }
  | { type: "UPDATE_PAYMENT"; payload: { bookingId: string; updatedBooking: Booking } }
  | { type: "DELETE_PAYMENT"; payload: { bookingId: string; updatedBooking: Booking } }
  | { type: "SET_LANGUAGE"; payload: "en" | "ar" | "fr" }
  | { type: "ADD_PROGRAM_PRICING"; payload: ProgramPricing }
  | { type: "UPDATE_PROGRAM_PRICING"; payload: ProgramPricing }
  | { type: "DELETE_PROGRAM_PRICING"; payload: string };

// The initial state is now empty, as it will be filled by API calls.
const initialState: AppState = {
  programs: [],
  bookings: [],
  programPricing: [],
  currentLanguage: "en",
  loading: true,
};

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case "SET_LOADING":
      return { ...state, loading: action.payload };
    case "SET_PROGRAMS":
      return { ...state, programs: action.payload.map(p => ({...p, id: p._id})) };
    case "SET_BOOKINGS":
      return { ...state, bookings: action.payload.map(b => ({...b, id: b._id})) };
    case "SET_PROGRAM_PRICING":
        return { ...state, programPricing: action.payload.map(p => ({...p, id: p._id})) };
    case "ADD_PROGRAM":
      return { ...state, programs: [...state.programs, {...action.payload, id: action.payload._id}] };
    case "UPDATE_PROGRAM":
      return {
        ...state,
        programs: state.programs.map((p) =>
          p._id === action.payload._id ? {...action.payload, id: action.payload._id} : p
        ),
      };
    case "DELETE_PROGRAM":
      return {
        ...state,
        programs: state.programs.filter((p) => p._id !== action.payload),
      };
    case "ADD_BOOKING":
       return { ...state, bookings: [...state.bookings, {...action.payload, id: action.payload._id}] };
    case "UPDATE_BOOKING":
        return {
            ...state,
            bookings: state.bookings.map((b) =>
              b._id === action.payload._id ? {...action.payload, id: action.payload._id} : b
            ),
          };
    case "DELETE_BOOKING":
      return {
        ...state,
        bookings: state.bookings.filter((b) => b._id !== action.payload),
      };
    case "ADD_PAYMENT":
    case "UPDATE_PAYMENT":
    case "DELETE_PAYMENT":
        return {
            ...state,
            bookings: state.bookings.map(b => b._id === action.payload.bookingId ? {...action.payload.updatedBooking, id: action.payload.updatedBooking._id} : b)
        };
    case "SET_LANGUAGE":
      return { ...state, currentLanguage: action.payload };
    case "ADD_PROGRAM_PRICING":
        return {
            ...state,
            programPricing: [...state.programPricing, {...action.payload, id: action.payload._id}],
          };
    case "UPDATE_PROGRAM_PRICING":
      return {
        ...state,
        programPricing: state.programPricing.map((p) =>
          p._id === action.payload._id ? {...action.payload, id: action.payload._id} : p
        ),
      };
    case "DELETE_PROGRAM_PRICING":
      return {
        ...state,
        programPricing: state.programPricing.filter(
          (p) => p._id !== action.payload
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
        dispatch({ type: "SET_LOADING", payload: true });
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
      } finally {
        dispatch({ type: "SET_LOADING", payload: false });
      }
    };

    fetchData();
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