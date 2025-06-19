import React, { createContext, useContext, useReducer, ReactNode } from "react";
import type { Booking } from "./models";

interface BookingsState {
  bookings: Booking[];
  loading: boolean;
}

type BookingsAction =
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_BOOKINGS"; payload: Booking[] }
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
    };

const initialState: BookingsState = {
  bookings: [],
  loading: false,
};

function bookingsReducer(
  state: BookingsState,
  action: BookingsAction
): BookingsState {
  switch (action.type) {
    case "SET_LOADING":
      return { ...state, loading: action.payload };
    case "SET_BOOKINGS":
      return { ...state, bookings: action.payload };
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
    default:
      return state;
  }
}

const BookingsContext = createContext<{
  state: BookingsState;
  dispatch: React.Dispatch<BookingsAction>;
} | null>(null);

export function BookingsProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(bookingsReducer, initialState);

  return (
    <BookingsContext.Provider value={{ state, dispatch }}>
      {children}
    </BookingsContext.Provider>
  );
}

export function useBookingsContext() {
  const context = useContext(BookingsContext);
  if (!context) {
    throw new Error(
      "useBookingsContext must be used within a BookingsProvider"
    );
  }
  return context;
}
