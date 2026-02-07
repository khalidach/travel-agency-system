// frontend/src/components/booking/types.ts
import type {
  Booking,
  Package,
  Program,
  ProgramVariation,
  PriceStructure,
  ClientNameFr,
} from "../../context/models";

export type ClientFormData = {
  clientNameAr: string;
  clientNameFr: ClientNameFr;
  personType: "adult" | "child" | "infant";
  phoneNumber: string;
  passportNumber: string;
  gender: "male" | "female";
  dateOfBirth?: string;
  passportExpirationDate?: string;
  dob_day?: number | string;
  dob_month?: number | string;
  dob_year?: number | string;
  noPassport?: boolean;
};

export type BookingFormData = Omit<
  Booking,
  | "id"
  | "isFullyPaid"
  | "remainingBalance"
  | "advancePayments"
  | "createdAt"
  | "clientNameAr"
  | "clientNameFr"
  | "personType"
  | "phoneNumber"
  | "passportNumber"
  | "gender"
  | "dateOfBirth"
  | "passportExpirationDate"
> & {
  createdAt: string;
  clients: ClientFormData[];
};

export type FlatBookingData = Omit<BookingFormData, "clients"> &
  Partial<ClientFormData>;

export type BookingSaveData = BookingFormData | FlatBookingData;

export interface FormState {
  search: string;
  showDropdown: boolean;
  selectedProgram: Program | null;
  selectedVariation: ProgramVariation | null;
  selectedPackage: Package | null;
  selectedPriceStructure: PriceStructure | null;
  error: string | null;
}

export const emptyClient: ClientFormData = {
  clientNameFr: { lastName: "", firstName: "" },
  clientNameAr: "",
  passportNumber: "",
  phoneNumber: "",
  personType: "adult",
  gender: "male",
  dob_day: "",
  dob_month: "",
  dob_year: "",
  noPassport: false,
};
