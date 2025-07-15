// frontend/src/components/BookingForm.tsx
import React, { useEffect, useMemo, useCallback, useState } from "react";
import { useForm, FormProvider, FieldErrors } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import type {
  Booking,
  Program,
  Package,
  Payment,
  RelatedPerson,
  PriceStructure,
  ProgramPricing,
} from "../context/models";
import * as api from "../services/api";
import { useAuthContext } from "../context/AuthContext";
import HotelRoomSelection from "./booking/HotelRoomSelection";
import ClientInfoFields from "./booking/ClientInfoFields";
import ProgramPackageSelection from "./booking/ProgramPackageSelection";
import RelatedPeopleManager from "./booking/RelatedPeopleManager";
import PricingFields from "./booking/PricingFields";

export type BookingFormData = Omit<
  Booking,
  "id" | "isFullyPaid" | "remainingBalance" | "advancePayments" | "createdAt"
> & {
  createdAt: string;
  // Add optional fields for the three-part date of birth
  dob_day?: number;
  dob_month?: number;
  dob_year?: number;
};

interface BookingFormProps {
  booking?: Booking | null;
  programs: Program[];
  onSave: (bookingData: BookingFormData, initialPayments: Payment[]) => void;
  onCancel: () => void;
  programId?: string;
}

interface FormState {
  search: string;
  showDropdown: boolean;
  selectedProgram: Program | null;
  selectedPackage: Package | null;
  selectedPriceStructure: PriceStructure | null;
  error: string | null;
}

export default function BookingForm({
  booking,
  programs,
  onSave,
  onCancel,
  programId,
}: BookingFormProps) {
  const { t } = useTranslation();
  const { state: authState } = useAuthContext();
  const userRole = authState.user?.role;

  const methods = useForm<BookingFormData>({
    mode: "onChange",
    defaultValues: {
      clientNameAr: "",
      clientNameFr: "",
      personType: "adult",
      phoneNumber: "",
      passportNumber: "",
      dateOfBirth: "",
      passportExpirationDate: "",
      gender: "male",
      tripId: "",
      packageId: "",
      selectedHotel: { cities: [], hotelNames: [], roomTypes: [] },
      sellingPrice: 0,
      basePrice: 0,
      profit: 0,
      createdAt: new Date().toISOString().split("T")[0],
      relatedPersons: [],
    },
  });

  const {
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { isValid },
  } = methods;

  const [formState, setFormState] = React.useState<FormState>({
    search: "",
    showDropdown: false,
    selectedProgram: null,
    selectedPackage: null,
    selectedPriceStructure: null,
    error: null,
  });

  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");

  const watchedValues = watch();
  const {
    selectedHotel,
    sellingPrice,
    basePrice,
    personType,
    tripId,
    dob_day,
    dob_month,
    dob_year,
  } = watchedValues;

  // Re-introduce the logic to combine the three DOB inputs into one string
  useEffect(() => {
    const day = dob_day ? String(dob_day).padStart(2, "0") : "";
    const month = dob_month ? String(dob_month).padStart(2, "0") : "";
    const year = dob_year || "";

    if (year && (!day || !month)) {
      setValue("dateOfBirth", `XX/XX/${year}`);
    } else if (day && month && year) {
      setValue("dateOfBirth", `${year}-${month}-${day}`);
    } else {
      setValue("dateOfBirth", "");
    }
  }, [dob_day, dob_month, dob_year, setValue]);

  const hasPackages = useMemo(
    () =>
      !!(
        formState.selectedProgram?.packages &&
        formState.selectedProgram.packages.length > 0
      ),
    [formState.selectedProgram]
  );

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(formState.search);
    }, 300);

    return () => {
      clearTimeout(handler);
    };
  }, [formState.search]);

  const { data: searchResults } = useQuery<Booking[]>({
    queryKey: ["bookingSearch", tripId, debouncedSearchTerm],
    queryFn: () => api.searchBookingsInProgram(tripId!, debouncedSearchTerm),
    enabled: !!tripId && debouncedSearchTerm.length > 0,
  });

  const { data: programPricing } = useQuery<ProgramPricing | null>({
    queryKey: ["programPricing", tripId],
    queryFn: () => api.getProgramPricingByProgramId(tripId!),
    enabled: !!tripId,
  });

  const handleProgramChange = useCallback(
    (programIdStr: string) => {
      const programIdNum = parseInt(programIdStr, 10);
      const program = programs.find((p) => p.id === programIdNum);

      setFormState((prev) => ({
        ...prev,
        selectedProgram: program || null,
        selectedPackage: null,
        selectedPriceStructure: null,
        error: null,
      }));

      setValue("tripId", programIdStr);
      setValue("packageId", "");
      setValue("selectedHotel", { cities: [], hotelNames: [], roomTypes: [] });
      setValue("relatedPersons", []);
    },
    [programs, setValue]
  );

  useEffect(() => {
    if (booking) {
      const program = programs.find(
        (p) => p.id.toString() === (booking.tripId || "").toString()
      );

      if (program) {
        const pkg = (program.packages || []).find(
          (p) => p.name === booking.packageId
        );
        setFormState((prev) => ({
          ...prev,
          selectedProgram: program,
          selectedPackage: pkg || null,
        }));
      }

      // Logic to parse dateOfBirth back into day, month, year
      let day, month, year;
      if (booking.dateOfBirth) {
        if (booking.dateOfBirth.includes("XX/XX/")) {
          year = parseInt(booking.dateOfBirth.split("/")[2], 10);
        } else {
          try {
            const date = new Date(booking.dateOfBirth);
            day = date.getDate();
            month = date.getMonth() + 1;
            year = date.getFullYear();
          } catch (e) {
            // Invalid date format
          }
        }
      }

      reset({
        ...booking,
        dob_day: day,
        dob_month: month,
        dob_year: year,
        passportExpirationDate: booking.passportExpirationDate
          ? new Date(booking.passportExpirationDate).toISOString().split("T")[0]
          : "",
        sellingPrice: Number(booking.sellingPrice),
        basePrice: Number(booking.basePrice),
        profit: Number(booking.sellingPrice) - Number(booking.basePrice),
        createdAt: new Date(booking.createdAt).toISOString().split("T")[0],
        relatedPersons: booking.relatedPersons || [],
      });
    } else if (programId) {
      handleProgramChange(programId);
    }
  }, [booking, programs, reset, programId, handleProgramChange]);

  const calculateTotalBasePrice = useCallback((): number => {
    if (!formState.selectedProgram || !programPricing) return 0;

    let hotelCosts = 0;
    if (formState.selectedPriceStructure && programPricing.allHotels) {
      hotelCosts = selectedHotel.cities.reduce((total, city, index) => {
        const hotelName = selectedHotel.hotelNames[index];
        const roomTypeName = selectedHotel.roomTypes[index];
        if (!roomTypeName || !hotelName) return total;

        const roomDef = formState.selectedPriceStructure?.roomTypes.find(
          (rt) => rt.type === roomTypeName
        );
        const guests = roomDef ? roomDef.guests : 1;

        const hotelPricingInfo = programPricing.allHotels.find(
          (h) => h.name === hotelName && h.city === city
        );
        if (hotelPricingInfo && hotelPricingInfo.PricePerNights) {
          const pricePerNight = Number(
            hotelPricingInfo.PricePerNights[roomTypeName] || 0
          );
          const cityInfo = formState.selectedProgram?.cities.find(
            (c) => c.name === city
          );
          const nights = cityInfo ? cityInfo.nights : 0;

          if (pricePerNight > 0 && nights > 0 && guests > 0) {
            return total + (pricePerNight * nights) / guests;
          }
        }
        return total;
      }, 0);
    }

    const personTypeInfo = (programPricing.personTypes || []).find(
      (p) => p.type === personType
    );
    const ticketPercentage = personTypeInfo
      ? personTypeInfo.ticketPercentage / 100
      : 1;
    const ticketAirline =
      Number(programPricing.ticketAirline || 0) * ticketPercentage;

    const visaFees = Number(programPricing.visaFees || 0);
    const guideFees = Number(programPricing.guideFees || 0);
    const transportFees = Number(programPricing.transportFees || 0);

    return Math.round(
      ticketAirline + visaFees + guideFees + transportFees + hotelCosts
    );
  }, [
    formState.selectedProgram,
    formState.selectedPriceStructure,
    selectedHotel,
    programPricing,
    personType,
  ]);

  useEffect(() => {
    if (formState.selectedProgram) {
      const newBasePrice = calculateTotalBasePrice();
      setValue("basePrice", newBasePrice);
      setValue("profit", sellingPrice - newBasePrice);
    }
  }, [
    selectedHotel,
    sellingPrice,
    personType,
    formState.selectedProgram,
    formState.selectedPriceStructure,
    calculateTotalBasePrice,
    setValue,
    programPricing,
  ]);

  useEffect(() => {
    if (
      formState.selectedPackage &&
      formState.selectedProgram?.cities.length ===
        selectedHotel.hotelNames.length &&
      selectedHotel.hotelNames.every((h) => h)
    ) {
      const hotelCombination = selectedHotel.hotelNames.join("_");
      const priceStructure = formState.selectedPackage.prices.find(
        (p) => p.hotelCombination === hotelCombination
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
    formState.selectedProgram,
  ]);

  const handleSellingPriceChange = useCallback(
    (price: number) => {
      setValue("sellingPrice", price);
      setValue("profit", price - basePrice);
    },
    [setValue, basePrice]
  );

  const onInvalid = useCallback((errors: FieldErrors) => {
    if (errors.dob_day || errors.dob_month || errors.dob_year) {
      toast.error("Invalid date of birth.");
    }
    console.log("Form Errors:", errors);
    toast.error("Please correct the errors before saving.");
  }, []);

  const onSubmit = useCallback(
    (data: any) => {
      const hasCitiesWithNights = (
        formState.selectedProgram?.cities || []
      ).some((c) => c.nights > 0);

      if (!formState.selectedProgram) {
        setFormState((prev) => ({
          ...prev,
          error: "A valid program must be selected.",
        }));
        return;
      }

      if (hasPackages && !formState.selectedPackage) {
        setFormState((prev) => ({
          ...prev,
          error: "A package must be selected for this program.",
        }));
        return;
      }

      if (
        hasCitiesWithNights &&
        !formState.selectedPriceStructure &&
        watchedValues.selectedHotel.hotelNames.some((h) => h)
      ) {
        setFormState((prev) => ({
          ...prev,
          error:
            "A valid hotel and room combination is required for programs with overnight stays.",
        }));
        return;
      }

      const processedData = { ...data };

      if (
        userRole === "employee" ||
        userRole === "manager" ||
        userRole === "admin"
      ) {
        processedData.basePrice = calculateTotalBasePrice();
        processedData.profit =
          processedData.sellingPrice - processedData.basePrice;
      }

      onSave(processedData, booking?.advancePayments || []);
    },
    [
      formState,
      hasPackages,
      watchedValues,
      userRole,
      calculateTotalBasePrice,
      onSave,
      booking,
    ]
  );

  const handlePackageChange = useCallback(
    (packageName: string) => {
      if (!formState.selectedProgram) return;

      const pkg = (formState.selectedProgram.packages || []).find(
        (p) => p.name === packageName
      );

      setFormState((prev) => ({
        ...prev,
        selectedPackage: pkg || null,
        selectedPriceStructure: null,
      }));

      if (pkg) {
        const cities = (formState.selectedProgram.cities || []).map(
          (c) => c.name
        );
        setValue("packageId", packageName);
        setValue("selectedHotel", {
          cities,
          hotelNames: Array(cities.length).fill(""),
          roomTypes: Array(cities.length).fill(""),
        });
      }
    },
    [formState.selectedProgram, setValue]
  );

  const updateHotelSelection = useCallback(
    (cityIndex: number, hotelName: string) => {
      const newHotelNames = [...selectedHotel.hotelNames];
      newHotelNames[cityIndex] = hotelName;

      setValue("selectedHotel", {
        ...selectedHotel,
        hotelNames: newHotelNames,
        roomTypes: Array(selectedHotel.cities.length).fill(""),
      });
    },
    [selectedHotel, setValue]
  );

  const updateRoomTypeSelection = useCallback(
    (cityIndex: number, roomType: string) => {
      const newRoomTypes = [...selectedHotel.roomTypes];
      newRoomTypes[cityIndex] = roomType;
      setValue("selectedHotel", {
        ...selectedHotel,
        roomTypes: newRoomTypes,
      });
    },
    [selectedHotel, setValue]
  );

  const availablePeople = useMemo(() => {
    if (!searchResults) {
      return [];
    }

    const selectedIDs = new Set(
      (watchedValues.relatedPersons || []).map((p) => p.ID)
    );
    if (booking) {
      selectedIDs.add(booking.id);
    }

    return searchResults.filter((b) => !selectedIDs.has(b.id));
  }, [searchResults, watchedValues.relatedPersons, booking]);

  const addRelatedPerson = useCallback(
    (person: Booking) => {
      const newPerson: RelatedPerson = {
        ID: person.id,
        clientName: person.clientNameFr,
      };
      setValue("relatedPersons", [
        ...(watchedValues.relatedPersons || []),
        newPerson,
      ]);
      setFormState((prev) => ({
        ...prev,
        search: "",
        showDropdown: false,
      }));
    },
    [setValue, watchedValues.relatedPersons]
  );

  const removeRelatedPerson = useCallback(
    (personId: number) => {
      setValue(
        "relatedPersons",
        (watchedValues.relatedPersons || []).filter((p) => p.ID !== personId)
      );
    },
    [setValue, watchedValues.relatedPersons]
  );

  return (
    <FormProvider {...methods}>
      <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="space-y-6">
        {formState.error && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-600 rounded-lg">
            {formState.error}
          </div>
        )}

        <ClientInfoFields />

        <ProgramPackageSelection
          programs={programs}
          hasPackages={hasPackages}
          selectedProgram={formState.selectedProgram}
          handleProgramChange={handleProgramChange}
          handlePackageChange={handlePackageChange}
          programId={programId}
          booking={booking}
        />

        <RelatedPeopleManager
          search={formState.search}
          showDropdown={formState.showDropdown}
          selectedProgram={formState.selectedProgram}
          availablePeople={availablePeople}
          relatedPersons={watchedValues.relatedPersons || []}
          onSearchChange={(value) =>
            setFormState((prev) => ({
              ...prev,
              search: value,
              showDropdown: true,
            }))
          }
          onFocus={() =>
            setFormState((prev) => ({ ...prev, showDropdown: true }))
          }
          onBlur={() =>
            setTimeout(
              () => setFormState((prev) => ({ ...prev, showDropdown: false })),
              200
            )
          }
          onAddPerson={addRelatedPerson}
          onRemovePerson={removeRelatedPerson}
        />

        <HotelRoomSelection
          selectedProgram={formState.selectedProgram}
          selectedPackage={formState.selectedPackage}
          selectedPriceStructure={formState.selectedPriceStructure}
          selectedHotel={selectedHotel}
          updateHotelSelection={updateHotelSelection}
          updateRoomTypeSelection={updateRoomTypeSelection}
        />

        <PricingFields handleSellingPriceChange={handleSellingPriceChange} />

        <div className="flex justify-end space-x-3 pt-6 border-t mt-6">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            {t("cancel")}
          </button>
          <button
            type="submit"
            disabled={!isValid}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {booking ? t("update") : t("save")}
          </button>
        </div>
      </form>
    </FormProvider>
  );
}
