import React, { createContext, useContext, useReducer, ReactNode } from "react";

export interface CityData {
  name: string;
  nights: number;
}

export interface Program {
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
  basePrice: number;
  sellingPrice: number;
}

export interface Booking {
  id: string;
  clientNameAr: string;
  clientNameFr: string;
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
  id: string;
  amount: number;
  method: "cash" | "cheque" | "transfer" | "card";
  date: string;
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
}

type AppAction =
  | { type: "ADD_PROGRAM"; payload: Program }
  | { type: "UPDATE_PROGRAM"; payload: Program }
  | { type: "DELETE_PROGRAM"; payload: string }
  | { type: "ADD_BOOKING"; payload: Booking }
  | { type: "UPDATE_BOOKING"; payload: Booking }
  | { type: "DELETE_BOOKING"; payload: string }
  | { type: "ADD_PAYMENT"; payload: { bookingId: string; payment: Payment } }
  | { type: "SET_LANGUAGE"; payload: "en" | "ar" | "fr" }
  | { type: "ADD_PROGRAM_PRICING"; payload: ProgramPricing }
  | { type: "UPDATE_PROGRAM_PRICING"; payload: ProgramPricing }
  | { type: "DELETE_PROGRAM_PRICING"; payload: string };

const initialState: AppState = {
  programPricing: [
    {
      id: "1",
      selectProgram: "Umrah Spring 2025",
      programId: "1",
      ticketAirline: 9000,
      visaFees: 1650,
      guideFees: 500,
      allHotels: [
        {
          name: "Al-Taysir Towers",
          city: "Makkah",
          nights: 5,
          PricePerNights: {
            double: 800,
            triple: 700,
            quad: 600,
            quintuple: 500,
          },
        },
        {
          name: "Safir Al Misk",
          city: "Makkah",
          nights: 5,
          PricePerNights: {
            double: 1000,
            triple: 900,
            quad: 800,
            quintuple: 700,
          },
        },
        {
          name: "Qasr Al-Ansar",
          city: "Madinah",
          nights: 5,
          PricePerNights: {
            double: 900,
            triple: 800,
            quad: 700,
            quintuple: 600,
          },
        },
      ],
    },
  ],
  programs: [
    {
      id: "1",
      name: "Umrah Spring 2025",
      type: "Umrah",
      duration: 10,
      cities: [
        { name: "Makkah", nights: 5 },
        { name: "Madinah", nights: 5 },
      ],
      packages: [
        {
          name: "Standard",
          hotels: {
            Makkah: ["Al-Taysir Towers", "Safir Al Misk"],
            Madinah: ["Qasr Al-Ansar"],
          },
          prices: [
            {
              hotelCombination: "Qasr Al-Ansar_Al-Taysir Towers",
              roomTypes: [
                { type: "Double", basePrice: 3000, sellingPrice: 4000 },
                { type: "Triple", basePrice: 2500, sellingPrice: 3500 },
              ],
            },
            {
              hotelCombination: "Qasr Al-Ansar_Safir Al Misk",
              roomTypes: [
                { type: "Quad", basePrice: 5000, sellingPrice: 6500 },
                { type: "Triple", basePrice: 7000, sellingPrice: 8500 },
              ],
            },
          ],
        },
      ],
    },
    {
      id: "2",
      name: "Hajj 2025 Premium",
      type: "Hajj",
      duration: 21,
      cities: [
        { name: "Makkah", nights: 7 },
        { name: "Madinah", nights: 7 },
        { name: "Mina", nights: 7 },
      ],
      packages: [
        {
          name: "Premium",
          hotels: {
            Makkah: ["Fairmont Makkah", "Swissotel Makkah"],
            Madinah: ["Pullman Zamzam Madinah"],
          },
          prices: [
            {
              hotelCombination: "Pullman Zamzam Madinah_Fairmont Makkah",
              roomTypes: [
                { type: "Double", basePrice: 8000, sellingPrice: 10000 },
                { type: "Single", basePrice: 12000, sellingPrice: 15000 },
              ],
            },
          ],
        },
      ],
    },
  ],
  bookings: [
    {
      id: "1",
      clientNameAr: "أحمد بن علي",
      clientNameFr: "Ahmed Ben Ali",
      passportNumber: "A12345678",
      tripId: "1",
      packageId: "Standard",
      selectedHotel: {
        cities: ["Makkah", "Madinah"],
        hotelNames: ["Al-Taysir Towers", "Qasr Al-Ansar"],
        roomType: "Double",
      },
      sellingPrice: 4000,
      basePrice: 3000,
      advancePayments: [
        { id: "1", amount: 2000, method: "cash", date: "2025-01-15" },
      ],
      remainingBalance: 2000,
      isFullyPaid: false,
      profit: 1000,
      createdAt: "2025-01-15",
    },
    {
      id: "2",
      clientNameAr: "فاطمة الزهراء",
      clientNameFr: "Fatima Zahra",
      passportNumber: "B87654321",
      tripId: "2",
      packageId: "Premium",
      selectedHotel: {
        cities: ["Makkah", "Madinah"],
        hotelNames: ["Fairmont Makkah", "Pullman Zamzam Madinah"],
        roomType: "Double",
      },
      sellingPrice: 10000,
      basePrice: 8000,
      advancePayments: [
        { id: "2", amount: 5000, method: "transfer", date: "2025-01-10" },
        { id: "3", amount: 5000, method: "cash", date: "2025-01-20" },
      ],
      remainingBalance: 0,
      isFullyPaid: true,
      profit: 2000,
      createdAt: "2025-01-10",
    },
  ],
  currentLanguage: "en",
};

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
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
      return {
        ...state,
        bookings: state.bookings.map((booking) => {
          if (booking.id === action.payload.bookingId) {
            const newPayments = [
              ...booking.advancePayments,
              action.payload.payment,
            ];
            const totalPaid = newPayments.reduce(
              (sum, payment) => sum + payment.amount,
              0
            );
            const remainingBalance = booking.sellingPrice - totalPaid;
            return {
              ...booking,
              advancePayments: newPayments,
              remainingBalance: Math.max(0, remainingBalance),
              isFullyPaid: remainingBalance <= 0,
            };
          }
          return booking;
        }),
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

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

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
