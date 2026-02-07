// frontend/src/components/booking/hooks/useBookingInitialization.ts
import { useEffect } from "react";
import { UseFormReset, UseFormTrigger } from "react-hook-form";
import type { Booking, Program } from "../../../context/models";
import type { BookingFormData, ClientFormData, FormState } from "../types";

interface UseBookingInitializationProps {
  booking: Booking | null | undefined;
  programs: Program[];
  programId: string | undefined;
  reset: UseFormReset<BookingFormData>;
  trigger: UseFormTrigger<BookingFormData>;
  handleProgramChange: (id: string) => void;
  setIsBulkMode: (mode: boolean) => void;
  setFormState: React.Dispatch<React.SetStateAction<FormState>>;
}

export function useBookingInitialization({
  booking,
  programs,
  programId,
  reset,
  trigger,
  handleProgramChange,
  setIsBulkMode,
  setFormState,
}: UseBookingInitializationProps) {
  useEffect(() => {
    const initializeForm = async () => {
      if (booking) {
        setIsBulkMode(false);
        const program = programs.find(
          (p) => p.id.toString() === (booking.tripId || "").toString(),
        );

        if (program) {
          const variation = (program.variations || []).find(
            (v) => v.name === booking.variationName,
          );
          const pkg = (program.packages || []).find(
            (p) => p.name === booking.packageId,
          );
          setFormState((prev) => ({
            ...prev,
            selectedProgram: program,
            selectedVariation: variation || null,
            selectedPackage: pkg || null,
          }));
        }

        // Date Logic
        let day: number | string = "",
          month: number | string = "",
          year: number | string = "";
        if (booking.dateOfBirth) {
          if (booking.dateOfBirth.includes("XX/XX/")) {
            year = parseInt(booking.dateOfBirth.split("/")[2], 10);
          } else {
            try {
              const date = new Date(booking.dateOfBirth);
              if (!isNaN(date.getTime())) {
                day = date.getUTCDate();
                month = date.getUTCMonth() + 1;
                year = date.getUTCFullYear();
              }
            } catch (_) {
              // Invalid date format
            }
          }
        }

        const initialNoPassport = !booking.passportNumber;

        const clientData: ClientFormData = {
          clientNameAr: booking.clientNameAr,
          clientNameFr: booking.clientNameFr || { lastName: "", firstName: "" },
          personType: booking.personType,
          phoneNumber: booking.phoneNumber,
          passportNumber: booking.passportNumber,
          gender: booking.gender || "male",
          dateOfBirth: booking.dateOfBirth,
          passportExpirationDate: booking.passportExpirationDate,
          dob_day: day,
          dob_month: month,
          dob_year: year,
          noPassport: initialNoPassport,
        };

        const {
          clientNameAr: _cAr,
          clientNameFr: _cFr,
          personType: _pt,
          phoneNumber: _pn,
          passportNumber: _pp,
          gender: _g,
          dateOfBirth: _dob,
          passportExpirationDate: _ped,
          ...restOfBooking
        } = booking;

        reset({
          ...restOfBooking,
          sellingPrice: Number(booking.sellingPrice),
          basePrice: Number(booking.basePrice),
          profit: Number(booking.sellingPrice) - Number(booking.basePrice),
          createdAt: new Date(booking.createdAt).toISOString().split("T")[0],
          relatedPersons: booking.relatedPersons || [],
          clients: [clientData],
        });

        await trigger();
      } else if (programId) {
        handleProgramChange(programId);
      }
    };

    initializeForm();
  }, [
    booking,
    programs,
    programId,
    reset,
    trigger,
    handleProgramChange,
    setIsBulkMode,
    setFormState,
  ]);
}
