import { useEffect, useCallback, useState, useMemo } from "react";
import {
  useForm,
  FormProvider,
  useFieldArray,
  FieldErrors,
} from "react-hook-form";
import { toast } from "react-hot-toast";
import { Plus } from "lucide-react";
import { useTranslation } from "react-i18next"; // Import useTranslation

import type {
  Booking,
  Program,
  Payment,
  RelatedPerson,
} from "../context/models";
import type {
  BookingFormData,
  BookingSaveData,
  FormState,
} from "./booking_form/types";
import { emptyClient } from "./booking_form/types";

// UI Components
import HotelRoomSelection from "./booking_form/HotelRoomSelection";
import ClientInfoFields from "./booking_form/ClientInfoFields";
import ProgramPackageSelection from "./booking_form/ProgramPackageSelection";
import RelatedPeopleManager from "./booking_form/RelatedPeopleManager";
import PricingFields from "./booking_form/PricingFields";
import BulkClientRow from "./booking_form/BulkClientRow";
import { BookingSourceInput } from "./booking_form/BookingSourceInput";
import { BulkModeToggle } from "./booking_form/BulkModeToggle";
import { FormActions } from "./booking_form/FormActions";

// Hooks
import { useProgramManager } from "./booking_form/hooks/useProgramManager";
import { useBookingPricing } from "./booking_form/hooks/useBookingPricing";
import { useBookingInitialization } from "./booking_form/hooks/useBookingInitialization";

interface BookingFormProps {
  booking?: Booking | null;
  programs: Program[];
  onSave: (bookingData: BookingSaveData, initialPayments: Payment[]) => void;
  onCancel: () => void;
  programId?: string;
}

export default function BookingForm({
  booking,
  programs,
  onSave,
  onCancel,
  programId,
}: BookingFormProps) {
  const { t } = useTranslation(); // Initialize translation
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
      bookingSource: "",
    },
  });

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    reset,
    trigger,
  } = methods;

  const { fields, append, remove } = useFieldArray({
    control,
    name: "clients",
  });

  // Watch critical fields
  const watchedValues = watch();
  const { selectedHotel, sellingPrice, tripId, clients } = watchedValues;
  const dob_day = clients?.[0]?.dob_day;
  const dob_month = clients?.[0]?.dob_month;
  const dob_year = clients?.[0]?.dob_year;

  // 1. Program & State Management Hook
  const {
    formState,
    setFormState,
    searchResults,
    programPricing,
    hasPackages,
    handleProgramChange,
    handleVariationChange,
    handlePackageChange,
  } = useProgramManager({ programs, setValue, tripId, selectedHotel });

  // 2. Pricing Logic Hook (display-only, sets basePrice/profit in form for UI)
  useBookingPricing({
    formState,
    programPricing,
    selectedHotel,
    clients,
    sellingPrice,
    setValue,
  });

  // 3. Initialization Hook
  useBookingInitialization({
    booking,
    programs,
    programId,
    reset,
    trigger,
    handleProgramChange,
    setIsBulkMode,
    setFormState,
  });

  // Effect: Sync Date of Birth parts for the first client (Main Client)
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

  // Handler: Form Invalid
  const onInvalid = useCallback(
    (errors: FieldErrors<BookingFormData>) => {
      console.log("Form Errors:", errors);
      toast.error(t("correctFormErrors")); // Translate toast

      setTimeout(() => {
        const firstErrorElement = document.querySelector(
          ".border-red-500, [aria-invalid='true'], .text-red-500"
        );
        if (firstErrorElement) {
          firstErrorElement.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });
        }
      }, 100);
    },
    [t],
  );

  // Handler: Form Submit
  const onSubmit = useCallback(
    (data: BookingFormData) => {
      // basePrice and profit are display-only — not sent to backend
      // Profit is calculated at program level via ProgramCosting

      if (!isBulkMode && booking) {
        const { clients: _clients, ...restOfData } = data;
        const singleClientData =
          _clients && _clients.length > 0 ? _clients[0] : {};
        onSave(
          { ...singleClientData, ...restOfData },
          booking?.advancePayments || [],
        );
        return;
      }
      onSave(data, booking?.advancePayments || []);
    },
    [onSave, booking, isBulkMode],
  );

  // Helper: Hotel/Room Updaters
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
    [selectedHotel, setValue],
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
    [selectedHotel, setValue],
  );

  // Helper: Related Persons
  const availablePeople = useMemo(() => {
    if (!searchResults) return [];
    const selectedIDs = new Set(
      (watchedValues.relatedPersons || []).map((p) => p.ID),
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
      setFormState((prev: FormState) => ({
        ...prev,
        search: "",
        showDropdown: false,
      }));
    },
    [setValue, watchedValues.relatedPersons, setFormState],
  );

  const removeRelatedPerson = useCallback(
    (personId: number) => {
      setValue(
        "relatedPersons",
        (watchedValues.relatedPersons || []).filter((p) => p.ID !== personId),
      );
    },
    [setValue, watchedValues.relatedPersons],
  );

  const handleSellingPriceChange = useCallback(
    (price: number) => {
      const currentBase = methods.getValues("basePrice");
      setValue("sellingPrice", price);
      setValue("profit", price - currentBase);
    },
    [setValue, methods],
  );

  return (
    <FormProvider {...methods}>
      <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="space-y-6">
        {formState.error && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-600 rounded-lg dark:bg-red-900/20 dark:border-red-700 dark:text-red-300">
            {formState.error}
          </div>
        )}

        {!booking && (
          <BulkModeToggle
            isBulkMode={isBulkMode}
            setIsBulkMode={setIsBulkMode}
          />
        )}

        {isBulkMode && !booking ? (
          <div>
            {fields.map((field, index) => (
              <BulkClientRow key={field.id} index={index} remove={remove} />
            ))}
            <button
              type="button"
              onClick={() => append(emptyClient)}
              className="mt-4 inline-flex items-center px-3 py-1 text-sm bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
            >
              <Plus className="w-4 h-4 mr-1 " /> {t("addPerson")}
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
          handleVariationChange={handleVariationChange}
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
            setFormState((prev: FormState) => ({
              ...prev,
              search: value,
              showDropdown: true,
            }))
          }
          onFocus={() =>
            setFormState((prev: FormState) => ({ ...prev, showDropdown: true }))
          }
          onBlur={() =>
            setTimeout(
              () =>
                setFormState((prev: FormState) => ({
                  ...prev,
                  showDropdown: false,
                })),
              200,
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

        <BookingSourceInput />

        <PricingFields handleSellingPriceChange={handleSellingPriceChange} />

        <FormActions
          onCancel={onCancel}
          isEditing={!!booking}
        />
      </form>
    </FormProvider>
  );
}
