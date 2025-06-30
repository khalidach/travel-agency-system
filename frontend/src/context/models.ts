// frontend/src/context/models.ts
export interface User {
  id: number;
  username: string;
  agencyName: string;
  token: string;
  role: "admin" | "manager" | "employee" | "owner";
  adminId?: number;
  totalEmployees?: number;
  activeUser?: boolean;
}

export interface Employee {
  id: number;
  username: string;
  role: "manager" | "employee";
  adminId: number;
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
  userId: number;
  employeeId?: number;
  totalBookings?: number;
  pricing?: ProgramPricing; // The associated pricing, if it exists
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

export type PersonType = "adult" | "child" | "infant";

export interface Booking {
  id: number;
  clientNameAr: string;
  clientNameFr: string;
  personType: PersonType;
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
  userId: number;
  employeeId?: number;
  employeeName?: string;
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

export interface PersonTypePercentage {
  type: PersonType;
  ticketPercentage: number;
}

export interface ProgramPricing {
  id: number;
  selectProgram: string;
  programId: number;
  ticketAirline: number;
  visaFees: number;
  guideFees: number;
  transportFees: number;
  allHotels: HotelPrice[];
  personTypes: PersonTypePercentage[];
  employeeId?: number;
  employeeName?: string;
}

export interface Pagination {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: Pagination;
}

export interface Occupant {
  id: number; // booking id
  clientName: string;
}

export interface Room {
  name: string;
  type: string;
  capacity: number;
  occupants: Occupant[];
}
