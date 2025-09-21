// frontend/src/components/BookingForm.tsx
import React, { useEffect, useMemo, useCallback, useState } from "react";
import {
  useForm,
  FormProvider,
  useFieldArray,
  FieldErrors,
} from "react-hook-form";
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
  ProgramVariation,
  ClientNameFr,
} from "../context/models";
import * as api from "../services/api";
import { useAuthContext } from "../context/AuthContext";
import HotelRoomSelection from "./booking/HotelRoomSelection";
import ClientInfoFields from "./booking/ClientInfoFields";
import ProgramPackageSelection from "./booking/ProgramPackageSelection";
import RelatedPeopleManager from "./booking/RelatedPeopleManager";
import PricingFields from "./booking/PricingFields";
import BulkClientRow from "./booking/BulkClientRow";
import { Plus, Users } from "lucide-react";

export type ClientFormData = {
  clientNameAr: string;
  clientNameFr: ClientNameFr;
  personType: "adult" | "child" | "infant";
  phoneNumber: string;
  passportNumber: string;
  gender: "male" | "female";
  dateOfBirth?: string;
  passportExpirationDate?: string;
  // Add optional fields for the three-part date of birth
  dob_day?: number | string;
  dob_month?: number | string;
  dob_year?: number | string;
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

interface BookingFormProps {
  booking?: Booking | null;
  programs: Program[];
  onSave: (bookingData: any, initialPayments: Payment[]) => void;
  onCancel: () => void;
  programId?: string;
}

interface FormState {
  search: string;
  showDropdown: boolean;
  selectedProgram: Program | null;
  selectedVariation: ProgramVariation | null;
  selectedPackage: Package | null;
  selectedPriceStructure: PriceStructure | null;
  error: string | null;
}

const emptyClient: ClientFormData = {
  clientNameFr: { lastName: "", firstName: "" },
  clientNameAr: "",
  passportNumber: "",
  phoneNumber: "",
  personType: "adult",
  gender: "male",
  dob_day: "",
  dob_month: "",
  dob_year: "",
};

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
  const [isBulkMode, setIsBulkMode] = useState(false);

  const methods = useForm<BookingFormData>({
    mode: "onChange",
    defaultValues: {
      tripId: "",
      packageId: "",
      selectedHotel: { cities: [], hotelNames: [], roomTypes: [] },
      sellingPrice: 0,
      basePrice: 0,
      profit: 0,
      createdAt: new Date().toISOString().split("T")[0],
      relatedPersons: [],
      clients: [emptyClient],
    },
  });

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    reset,
    trigger,
    formState: { isValid },
  } = methods;

  const { fields, append, remove } = useFieldArray({
    control,
    name: "clients",
  });

  const [formState, setFormState] = React.useState<FormState>({
    search: "",
    showDropdown: false,
    selectedProgram: null,
    selectedVariation: null,
    selectedPackage: null,
    selectedPriceStructure: null,
    error: null,
  });

  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");

  const watchedValues = watch();
  const { selectedHotel, sellingPrice, basePrice, tripId, clients } =
    watchedValues;

  const personType = clients?.[0]?.personType || "adult";
  const dob_day = clients?.[0]?.dob_day;
  const dob_month = clients?.[0]?.dob_month;
  const dob_year = clients?.[0]?.dob_year;

  useEffect(() => {
    const day = dob_day ? String(dob_day).padStart(2, "0") : "";
    const month = dob_month ? String(dob_month).padStart(2, "0") : "";
    const year = dob_year || "";

    if (year && (!day || !month)) {
      setValue("clients.0.dateOfBirth", `XX/XX/${year}`);
    } else if (day && month && year) {
      setValue("clients.0.dateOfBirth", `${year}-${month}-${day}`);
    } else {
      setValue("clients.0.dateOfBirth", "");
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
    enabled: !!tripId && !formState.selectedProgram?.isCommissionBased,
  });

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
    [programs, setValue]
  );

  const handleVariationChange = useCallback(
    (variationName: string) => {
      if (!formState.selectedProgram) return;

      const variation = (formState.selectedProgram.variations || []).find(
        (v) => v.name === variationName
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
    [formState.selectedProgram, setValue]
  );

  useEffect(() => {
    const initializeForm = async () => {
      if (booking) {
        setIsBulkMode(false); // Never allow bulk mode on edit
        const program = programs.find(
          (p) => p.id.toString() === (booking.tripId || "").toString()
        );

        if (program) {
          const variation = (program.variations || []).find(
            (v) => v.name === booking.variationName
          );
          const pkg = (program.packages || []).find(
            (p) => p.name === booking.packageId
          );
          setFormState((prev) => ({
            ...prev,
            selectedProgram: program,
            selectedVariation: variation || null,
            selectedPackage: pkg || null,
          }));
        }

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
            } catch (e) {
              // Invalid date format
            }
          }
        }

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
        };

        reset({
          ...booking,
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
  }, [booking, programs, reset, programId, handleProgramChange, trigger]);

  const calculateTotalBasePrice = useCallback((): number => {
    const representativePersonType = clients?.[0]?.personType || "adult";

    if (!formState.selectedProgram || !formState.selectedVariation) {
      return 0;
    }

    if (formState.selectedProgram.isCommissionBased) {
      if (
        !formState.selectedPackage ||
        !selectedHotel.hotelNames.some((h) => h)
      ) {
        return 0;
      }
      const hotelCombination = selectedHotel.hotelNames.join("_");
      const priceStructure = (formState.selectedPackage.prices || []).find(
        (p) => p.hotelCombination === hotelCombination
      );
      if (!priceStructure) return 0;
      const roomTypeName = selectedHotel.roomTypes?.[0];
      if (!roomTypeName) return 0;
      const roomTypeDef = priceStructure.roomTypes.find(
        (rt) => rt.type === roomTypeName
      );
      if (!roomTypeDef || typeof roomTypeDef.purchasePrice === "undefined")
        return 0;
      return Math.round(Number(roomTypeDef.purchasePrice || 0));
    }

    if (!programPricing) return 0;

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
          const cityInfo = formState.selectedVariation?.cities.find(
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

    let ticketPriceForVariation = Number(programPricing.ticketAirline || 0);
    if (
      programPricing.ticketPricesByVariation &&
      formState.selectedVariation.name &&
      programPricing.ticketPricesByVariation[formState.selectedVariation.name]
    ) {
      ticketPriceForVariation = Number(
        programPricing.ticketPricesByVariation[formState.selectedVariation.name]
      );
    }

    const personTypeInfo = (programPricing.personTypes || []).find(
      (p) => p.type === representativePersonType
    );
    const ticketPercentage = personTypeInfo
      ? personTypeInfo.ticketPercentage / 100
      : 1;
    const ticketAirline = ticketPriceForVariation * ticketPercentage;
    const visaFees = Number(programPricing.visaFees || 0);
    const guideFees = Number(programPricing.guideFees || 0);
    const transportFees = Number(programPricing.transportFees || 0);
    return Math.round(
      ticketAirline + visaFees + guideFees + transportFees + hotelCosts
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
    selectedHotel,
    sellingPrice,
    personType,
    formState.selectedProgram,
    formState.selectedVariation,
    formState.selectedPackage,
    formState.selectedPriceStructure,
    calculateTotalBasePrice,
    setValue,
    programPricing,
  ]);

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
    formState.selectedVariation,
  ]);

  const handleSellingPriceChange = useCallback(
    (price: number) => {
      setValue("sellingPrice", price);
      setValue("profit", price - basePrice);
    },
    [setValue, basePrice]
  );

  const onInvalid = useCallback((errors: FieldErrors) => {
    console.log("Form Errors:", errors);
    toast.error("Please correct the errors before saving.");
  }, []);

  const onSubmit = useCallback(
    (data: BookingFormData) => {
      // For single booking mode (not bulk), we need to ensure the structure is what the update expects
      if (!isBulkMode && booking) {
        const { clients, ...restOfData } = data;
        const singleClientData =
          clients && clients.length > 0 ? clients[0] : {};
        onSave(
          { ...singleClientData, ...restOfData },
          booking?.advancePayments || []
        );
        return;
      }

      onSave(data, booking?.advancePayments || []);
    },
    [onSave, booking, isBulkMode]
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

      if (pkg && formState.selectedVariation) {
        const cities = (formState.selectedVariation.cities || []).map(
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
    [formState.selectedProgram, formState.selectedVariation, setValue]
  );

  const updateHotelSelection = useCallback(
    (cityIndex: number, hotelName: string) => {
      const newHotelNames = [...selectedHotel.hotelNames];
      const newRoomTypes = [...selectedHotel.roomTypes];

      newHotelNames[cityIndex] = hotelName;
      newRoomTypes[cityIndex] = "";

      setValue("selectedHotel", {
        ...selectedHotel,
        hotelNames: newHotelNames,
        roomTypes: newRoomTypes,
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
    if (!searchResults) return [];
    const selectedIDs = new Set(
      (watchedValues.relatedPersons || []).map((p) => p.ID)
    );
    if (booking) selectedIDs.add(booking.id);
    return searchResults.filter((b) => !selectedIDs.has(b.id));
  }, [searchResults, watchedValues.relatedPersons, booking]);

  const addRelatedPersons = useCallback(
    (persons: Booking[]) => {
      const newPersons: RelatedPerson[] = persons.map((person) => ({
        ID: person.id,
        clientName: `${person.clientNameFr.firstName} ${person.clientNameFr.lastName}`,
      }));
      setValue("relatedPersons", [
        ...(watchedValues.relatedPersons || []),
        ...newPersons,
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

        {!booking && (
          <div className="flex items-center justify-end">
            <label
              htmlFor="bulk-mode-toggle"
              className="flex items-center cursor-pointer"
            >
              <span className="mr-3 text-sm font-medium text-gray-900">
                Ajout groupé
              </span>
              <div className="relative">
                <input
                  type="checkbox"
                  id="bulk-mode-toggle"
                  className="sr-only"
                  checked={isBulkMode}
                  onChange={() => setIsBulkMode(!isBulkMode)}
                />
                <div className="block bg-gray-200 w-14 h-8 rounded-full"></div>
                <div
                  className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform ${
                    isBulkMode ? "translate-x-6 bg-blue-600" : ""
                  }`}
                ></div>
              </div>
            </label>
          </div>
        )}

        {isBulkMode && !booking ? (
          <div>
            {fields.map((field, index) => (
              <BulkClientRow key={field.id} index={index} remove={remove} />
            ))}
            <button
              type="button"
              onClick={() => append(emptyClient)}
              className="mt-4 inline-flex items-center px-3 py-1 text-sm bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
            >
              <Plus className="w-4 h-4 mr-1" /> Ajouter une personne
            </button>
          </div>
        ) : (
          <ClientInfoFields />
        )}

        <ProgramPackageSelection
          programs={programs}
          hasPackages={hasPackages}
          selectedProgram={formState.selectedProgram}
          handleProgramChange={handleProgramChange}
          handlePackageChange={handlePackageChange}
          handleVariationChange={handleVariationChange}
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
          onAddPersons={addRelatedPersons}
          onRemovePerson={removeRelatedPerson}
        />

        <HotelRoomSelection
          selectedProgram={formState.selectedProgram}
          selectedVariation={formState.selectedVariation}
          selectedPackage={formState.selectedPackage}
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
