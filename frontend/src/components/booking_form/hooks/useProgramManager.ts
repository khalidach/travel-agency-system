// frontend/src/components/booking/hooks/useProgramManager.ts
import { useState, useCallback, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { UseFormSetValue } from "react-hook-form";
import * as api from "../../../services/api";
import type { Program, ProgramPricing, Booking } from "../../../context/models";
import type { FormState, BookingFormData } from "../../booking_form/types";

interface UseProgramManagerProps {
  programs: Program[];
  setValue: UseFormSetValue<BookingFormData>;
  tripId: string;
  selectedHotel: {
    cities: string[];
    hotelNames: string[];
    roomTypes: string[];
  };
}

export function useProgramManager({
  programs,
  setValue,
  tripId,
  selectedHotel,
}: UseProgramManagerProps) {
  const [formState, setFormState] = useState<FormState>({
    search: "",
    showDropdown: false,
    selectedProgram: null,
    selectedVariation: null,
    selectedPackage: null,
    selectedPriceStructure: null,
    error: null,
  });

  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");

  // Debounce Search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(formState.search);
    }, 300);
    return () => clearTimeout(handler);
  }, [formState.search]);

  // Queries
  const { data: searchResults } = useQuery<Booking[]>({
    queryKey: ["bookingSearch", tripId, debouncedSearchTerm],
    queryFn: () => api.searchBookingsInProgram(tripId!, debouncedSearchTerm),
    enabled: !!tripId && debouncedSearchTerm.length > 0,
  });

  const { data: programPricing } = useQuery<ProgramPricing | null>({
    queryKey: ["programPricing", tripId],
    queryFn: () => api.getProgramPricingByProgramId(tripId!),
    enabled: !!tripId && !formState.selectedProgram?.isCommissionBased,
  });

  // Handlers
  const handleProgramChange = useCallback(
    (programIdStr: string) => {
      const programIdNum = parseInt(programIdStr, 10);
      const program = programs.find((p) => p.id === programIdNum);

      setFormState((prev) => ({
        ...prev,
        selectedProgram: program || null,
        selectedVariation: null,
        selectedPackage: null,
        selectedPriceStructure: null,
        error: null,
      }));

      setValue("tripId", programIdStr);
      setValue("variationName", "");
      setValue("packageId", "");
      setValue("selectedHotel", { cities: [], hotelNames: [], roomTypes: [] });
      setValue("relatedPersons", []);
    },
    [programs, setValue],
  );

  const handleVariationChange = useCallback(
    (variationName: string) => {
      if (!formState.selectedProgram) return;

      const variation = (formState.selectedProgram.variations || []).find(
        (v) => v.name === variationName,
      );

      setFormState((prev) => ({
        ...prev,
        selectedVariation: variation || null,
        selectedPackage: null,
        selectedPriceStructure: null,
      }));

      setValue("variationName", variationName);
      setValue("packageId", "");
      setValue("selectedHotel", { cities: [], hotelNames: [], roomTypes: [] });
    },
    [formState.selectedProgram, setValue],
  );

  const handlePackageChange = useCallback(
    (packageName: string) => {
      if (!formState.selectedProgram) return;

      const pkg = (formState.selectedProgram.packages || []).find(
        (p) => p.name === packageName,
      );

      setFormState((prev) => ({
        ...prev,
        selectedPackage: pkg || null,
        selectedPriceStructure: null,
        selectedVariation: formState.selectedVariation,
      }));

      if (pkg && formState.selectedVariation) {
        const cities = (formState.selectedVariation.cities || []).map(
          (c) => c.name,
        );
        setValue("packageId", packageName);
        setValue("selectedHotel", {
          cities,
          hotelNames: Array(cities.length).fill(""),
          roomTypes: Array(cities.length).fill(""),
        });
      }
    },
    [formState.selectedProgram, formState.selectedVariation, setValue],
  );

  // Sync Price Structure based on Hotel Selection
  useEffect(() => {
    if (
      formState.selectedPackage &&
      formState.selectedVariation &&
      formState.selectedVariation.cities.length ===
        selectedHotel.hotelNames.length &&
      selectedHotel.hotelNames.every((h) => h)
    ) {
      const hotelCombination = selectedHotel.hotelNames.join("_");
      const priceStructure = formState.selectedPackage.prices.find(
        (p) => p.hotelCombination === hotelCombination,
      );
      setFormState((prev) => ({
        ...prev,
        selectedPriceStructure: priceStructure || null,
      }));
    } else {
      setFormState((prev) => ({
        ...prev,
        selectedPriceStructure: null,
      }));
    }
  }, [
    selectedHotel.hotelNames,
    formState.selectedPackage,
    formState.selectedVariation,
  ]);

  const hasPackages = useMemo(
    () =>
      !!(
        formState.selectedProgram?.packages &&
        formState.selectedProgram.packages.length > 0
      ),
    [formState.selectedProgram],
  );

  return {
    formState,
    setFormState,
    searchResults,
    programPricing,
    hasPackages,
    handleProgramChange,
    handleVariationChange,
    handlePackageChange,
  };
}
