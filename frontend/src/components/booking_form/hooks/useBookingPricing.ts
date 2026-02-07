// frontend/src/components/booking/hooks/useBookingPricing.ts
import { useCallback, useEffect } from "react";
import { UseFormSetValue } from "react-hook-form";
import type { ProgramPricing } from "../../../context/models";
import type { BookingFormData, FormState } from "../../booking/types";

interface UseBookingPricingProps {
  formState: FormState;
  programPricing: ProgramPricing | null | undefined;
  selectedHotel: {
    cities: string[];
    hotelNames: string[];
    roomTypes: string[];
  };
  clients: BookingFormData["clients"];
  sellingPrice: number;
  setValue: UseFormSetValue<BookingFormData>;
}

export function useBookingPricing({
  formState,
  programPricing,
  selectedHotel,
  clients,
  sellingPrice,
  setValue,
}: UseBookingPricingProps) {
  const calculateTotalBasePrice = useCallback((): number => {
    const representativePersonType = clients?.[0]?.personType || "adult";

    if (!formState.selectedProgram || !formState.selectedVariation) {
      return 0;
    }

    // 1. Commission Based Logic
    if (formState.selectedProgram.isCommissionBased) {
      if (
        !formState.selectedPackage ||
        !selectedHotel.hotelNames.some((h) => h)
      ) {
        return 0;
      }
      const hotelCombination = selectedHotel.hotelNames.join("_");
      const priceStructure = (formState.selectedPackage.prices || []).find(
        (p) => p.hotelCombination === hotelCombination,
      );
      if (!priceStructure) return 0;
      const roomTypeName = selectedHotel.roomTypes?.[0];
      if (!roomTypeName) return 0;
      const roomTypeDef = priceStructure.roomTypes.find(
        (rt) => rt.type === roomTypeName,
      );
      if (!roomTypeDef || typeof roomTypeDef.purchasePrice === "undefined")
        return 0;
      return Math.round(Number(roomTypeDef.purchasePrice || 0));
    }

    // 2. Standard Pricing Logic
    if (!programPricing) return 0;

    let hotelCosts = 0;
    if (formState.selectedPriceStructure && programPricing.allHotels) {
      hotelCosts = selectedHotel.cities.reduce((total, city, index) => {
        const hotelName = selectedHotel.hotelNames[index];
        const roomTypeName = selectedHotel.roomTypes[index];
        if (!roomTypeName || !hotelName) return total;
        const roomDef = formState.selectedPriceStructure?.roomTypes.find(
          (rt) => rt.type === roomTypeName,
        );
        const guests = roomDef ? roomDef.guests : 1;
        const hotelPricingInfo = programPricing.allHotels.find(
          (h) => h.name === hotelName && h.city === city,
        );
        if (hotelPricingInfo && hotelPricingInfo.PricePerNights) {
          const pricePerNight = Number(
            hotelPricingInfo.PricePerNights[roomTypeName] || 0,
          );
          const cityInfo = formState.selectedVariation?.cities.find(
            (c) => c.name === city,
          );
          const nights = cityInfo ? cityInfo.nights : 0;
          if (pricePerNight > 0 && nights > 0 && guests > 0) {
            return total + (pricePerNight * nights) / guests;
          }
        }
        return total;
      }, 0);
    }

    let ticketPriceForVariation = Number(programPricing.ticketAirline || 0);
    if (
      programPricing.ticketPricesByVariation &&
      formState.selectedVariation.name &&
      programPricing.ticketPricesByVariation[formState.selectedVariation.name]
    ) {
      ticketPriceForVariation = Number(
        programPricing.ticketPricesByVariation[
          formState.selectedVariation.name
        ],
      );
    }

    const personTypeInfo = (programPricing.personTypes || []).find(
      (p) => p.type === representativePersonType,
    );
    const ticketPercentage = personTypeInfo
      ? personTypeInfo.ticketPercentage / 100
      : 1;
    const ticketAirline = ticketPriceForVariation * ticketPercentage;
    const visaFees = Number(programPricing.visaFees || 0);
    const guideFees = Number(programPricing.guideFees || 0);
    const transportFees = Number(programPricing.transportFees || 0);

    return Math.round(
      ticketAirline + visaFees + guideFees + transportFees + hotelCosts,
    );
  }, [
    formState.selectedProgram,
    formState.selectedVariation,
    formState.selectedPackage,
    formState.selectedPriceStructure,
    selectedHotel,
    programPricing,
    clients,
  ]);

  useEffect(() => {
    if (formState.selectedProgram) {
      const newBasePrice = calculateTotalBasePrice();
      setValue("basePrice", newBasePrice);
      setValue("profit", sellingPrice - newBasePrice);
    }
  }, [
    calculateTotalBasePrice,
    sellingPrice,
    setValue,
    formState.selectedProgram,
  ]);

  return { calculateTotalBasePrice };
}
