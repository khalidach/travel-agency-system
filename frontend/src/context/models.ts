// frontend/src/context/models.ts
export interface TierLimits {
  bookingsPerMonth: number;
  programsPerMonth: number;
  programPricingsPerMonth: number;
  programCosts: boolean; // تم التغيير
  employees: number;
  invoicing: boolean;
  facturesPerMonth: number;
  dailyServicesPerMonth: number;
  dailyServices: boolean;
  bookingExcelExportsPerMonth: number;
  listExcelExportsPerMonth: number;
  flightListExport: boolean;
  profitReport: boolean;
  employeeAnalysis: boolean;
}

export interface Tier {
  id: number;
  name: string;
  limits: TierLimits;
}

export interface User {
  id: number;
  username: string;
  agencyName: string;
  token: string;
  role: "admin" | "manager" | "employee" | "owner";
  adminId?: number;
  activeUser?: boolean;
  facturationSettings?: FacturationSettings;
  tierId?: number;
  limits?: Partial<TierLimits>;
  tierLimits?: TierLimits;
  ownerName?: string;
  phone?: string;
  email?: string;
}

export interface FacturationSettings {
  ice?: string;
  if?: string;
  rc?: string;
  patente?: string;
  cnss?: string;
  address?: string;
  phone?: string;
  email?: string;
  bankName?: string;
  rib?: string;
}

export interface FactureItem {
  description: string;
  quantity: number;
  prixUnitaire: number;
  fraisServiceUnitaire: number;
  total: number;
}

export interface Facture {
  id: number;
  facture_number: string;
  userId: number;
  employeeId?: number;
  clientName: string;
  clientAddress: string;
  clientICE?: string;
  date: string;
  items: FactureItem[];
  type: "facture" | "devis";
  showMargin?: boolean;
  prixTotalHorsFrais: number;
  totalFraisServiceHT: number;
  tva: number;
  total: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Employee {
  id: number;
  username: string;
  role: "manager" | "employee";
  adminId: number;
  active?: boolean;
}

export interface CityData {
  name: string;
  nights: number;
}

export interface ProgramVariation {
  name: string;
  duration: number;
  cities: CityData[];
}

export interface RoomTypeDefinition {
  name: string;
  guests: number;
  isDefault: boolean;
}

export interface HotelRoomCount {
  hotelName: string;
  roomCount: number;
}

export type ProgramType = "Hajj" | "Umrah" | "Tourism" | "Ramadan"; // تم إضافة "Ramadan" هنا

export interface Program {
  id: number;
  name: string;
  type: ProgramType; // استخدام النوع الجديد
  variations: ProgramVariation[];
  packages: Package[];
  roomTypes: RoomTypeDefinition[];
  userId: number;
  employeeId?: number;
  totalBookings?: number;
  pricing?: ProgramPricing;
  costs?: ProgramCost;
  hotelRoomCounts?: HotelRoomCount[];
  totalOccupants?: number;
  isCommissionBased?: boolean;
  maxBookings?: number | null; // NEW: Maximum number of bookings allowed. Null/0 means unlimited.
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
  purchasePrice?: number;
}

export interface RelatedPerson {
  ID: number;
  clientName: string;
}

export type PersonType = "adult" | "child" | "infant";
export type Gender = "male" | "female";

export interface ClientNameFr {
  lastName: string;
  firstName: string;
}

export interface Booking {
  id: number;
  clientNameAr: string;
  clientNameFr: ClientNameFr;
  personType: PersonType;
  phoneNumber: string;
  passportNumber: string;
  dateOfBirth?: string;
  passportExpirationDate?: string;
  gender?: Gender;
  tripId: string;
  variationName?: string;
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
  bookingSource?: string; // NEW: Field for source of booking
}

export interface Payment {
  _id: string;
  id: string;
  amount: number;
  method: "cash" | "cheque" | "transfer" | "card";
  date: string;
  labelPaper?: string; // NEW: Optional Label Paper field
  chequeNumber?: string;
  bankName?: string;
  chequeCashingDate?: string;
  transferPayerName?: string;
  transferReference?: string;
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
  ticketPricesByVariation?: { [key: string]: number };
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

export interface BookingSummaryStats {
  totalBookings: number;
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
  totalPaid: number;
  totalRemaining: number;
}

export interface DailyService {
  id: number;
  userId: number;
  employeeId?: number;
  type: "airline-ticket" | "hotel-reservation" | "reservation-ticket" | "visa";
  serviceName: string;
  originalPrice: number;
  totalPrice: number;
  profit: number;
  date: string;
  createdAt: string;
  updatedAt: string;
  advancePayments?: Payment[];
  remainingBalance: number;
  isFullyPaid: boolean;
  totalPaid?: number; // Calculated on the fly by the backend
}

export interface DashboardStats {
  allTimeStats: {
    totalBookings: number;
    totalRevenue: number;
    totalProfit: number;
    activePrograms: number;
  };
  dateFilteredStats: {
    totalBookings: number;
    totalDailyServices: number; // ADDED
    totalFactures: number; // ADDED
    totalRevenue: number; // UPDATED definition (now combined)
  };
  programTypeData: {
    Hajj: number;
    Umrah: number;
    Tourism: number;
  };
  dailyServiceProfitData: {
    type: string;
    totalProfit: number;
  }[];
  paymentStatus: {
    fullyPaid: number;
    pending: number;
  };
  recentBookings: Booking[];
}

export interface EmployeeAnalysisData {
  employee: Employee;
  programsCreatedCount: number;
  bookingsMadeCount: number;
  dailyServicesMadeCount: number;
}

export interface ProgramPerformanceData {
  programPerformance: any[];
  programSummary: {
    totalBookings: number;
    totalRevenue: number;
    totalCost: number;
    totalProfit: number;
  };
}

export interface ServicePerformanceData {
  dailyServicePerformance: any[];
  serviceSummary: {
    totalServices: number;
    totalRevenue: number;
    totalCost: number;
    totalProfit: number;
  };
}

export interface ProgramCostDetails {
  flightTickets?: number;
  visa?: number;
  transport?: number;
  hotels?: { name: string; amount: number }[];
  custom?: { name: string; amount: number }[];
}

export interface ProgramCost {
  id: number;
  programId: number;
  costs: ProgramCostDetails;
  isEnabled: boolean;
  totalCost: number;
}
