import React, { useEffect, useMemo } from "react";
import { useForm, Controller } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import type {
  Booking,
  Program,
  Package,
  Payment,
  RelatedPerson,
  PriceStructure,
  ProgramPricing,
  PaginatedResponse,
} from "../context/models";
import * as api from "../services/api";
import { X } from "lucide-react";
import { useAuthContext } from "../context/AuthContext";

export type BookingFormData = Omit<
  Booking,
  "id" | "isFullyPaid" | "remainingBalance" | "advancePayments" | "createdAt"
> & {
  createdAt: string;
};

interface BookingFormProps {
  booking?: Booking | null;
  programs: Program[];
  onSave: (bookingData: BookingFormData, initialPayments: Payment[]) => void;
  onCancel: () => void;
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
}: BookingFormProps) {
  const { t } = useTranslation();
  const { state: authState } = useAuthContext();
  const userRole = authState.user?.role;

  const { data: bookingResponse } = useQuery<PaginatedResponse<Booking>>({
    queryKey: ["bookings", "all"],
    queryFn: () => api.getBookings(1, 10000),
  });
  const allBookings = bookingResponse?.data ?? [];

  const { data: pricingResponse } = useQuery<PaginatedResponse<ProgramPricing>>(
    {
      queryKey: ["programPricing", "all"],
      queryFn: () => api.getProgramPricing(1, 10000),
    }
  );
  const programPricing = pricingResponse?.data ?? [];

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<BookingFormData>({
    defaultValues: {
      clientNameAr: "",
      clientNameFr: "",
      phoneNumber: "",
      passportNumber: "",
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

  const [formState, setFormState] = React.useState<FormState>({
    search: "",
    showDropdown: false,
    selectedProgram: null,
    selectedPackage: null,
    selectedPriceStructure: null,
    error: null,
  });

  const watchedValues = watch();
  const { selectedHotel, sellingPrice, basePrice } = watchedValues;

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

      reset({
        clientNameAr: booking.clientNameAr,
        clientNameFr: booking.clientNameFr,
        phoneNumber: booking.phoneNumber,
        passportNumber: booking.passportNumber,
        tripId: booking.tripId,
        packageId: booking.packageId,
        selectedHotel: booking.selectedHotel,
        sellingPrice: Number(booking.sellingPrice),
        basePrice: Number(booking.basePrice),
        profit: Number(booking.sellingPrice) - Number(booking.basePrice),
        createdAt: new Date(booking.createdAt).toISOString().split("T")[0],
        relatedPersons: booking.relatedPersons || [],
      });
    }
  }, [booking, programs, reset]);

  const calculateTotalBasePrice = React.useCallback((): number => {
    if (!formState.selectedProgram || !formState.selectedPriceStructure)
      return 0;

    const pricing = programPricing.find(
      (p) => p.programId === formState.selectedProgram?.id
    );
    if (!pricing || !pricing.allHotels) return 0;

    const hotelCosts = selectedHotel.cities.reduce((total, city, index) => {
      const hotelName = selectedHotel.hotelNames[index];
      const roomTypeName = selectedHotel.roomTypes[index];
      if (!roomTypeName) return total;

      const roomDef = formState.selectedPriceStructure?.roomTypes.find(
        (rt) => rt.type === roomTypeName
      );
      const guests = roomDef ? roomDef.guests : 1;

      const hotelPricingInfo = pricing.allHotels.find(
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

    const ticketAirline = Number(pricing.ticketAirline || 0);
    const visaFees = Number(pricing.visaFees || 0);
    const guideFees = Number(pricing.guideFees || 0);

    return Math.round(ticketAirline + visaFees + guideFees + hotelCosts);
  }, [
    formState.selectedProgram,
    formState.selectedPriceStructure,
    selectedHotel,
    programPricing,
  ]);

  useEffect(() => {
    // Always calculate the base price and profit in the background.
    // The UI will determine if these fields are shown.
    if (formState.selectedProgram && formState.selectedPriceStructure) {
      const newBasePrice = calculateTotalBasePrice();
      setValue("basePrice", newBasePrice);
      setValue("profit", sellingPrice - newBasePrice);
    }
  }, [
    selectedHotel,
    sellingPrice,
    formState.selectedProgram,
    formState.selectedPriceStructure,
    calculateTotalBasePrice,
    setValue,
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

  const handleSellingPriceChange = (price: number) => {
    setValue("sellingPrice", price);
    setValue("profit", price - basePrice);
  };

  const onSubmit = (data: BookingFormData) => {
    if (
      !formState.selectedProgram ||
      !formState.selectedPackage ||
      !formState.selectedPriceStructure
    ) {
      setFormState((prev) => ({
        ...prev,
        error:
          "A valid program, package, and hotel combination must be selected.",
      }));
      return;
    }
    // For employees, ensure basePrice and profit are not sent as part of their direct submission
    // if there are any lingering client-side values. Backend should handle final calculation.
    if (userRole === "employee") {
      data.basePrice = calculateTotalBasePrice();
      data.profit = data.sellingPrice - data.basePrice;
    }

    onSave(data, booking?.advancePayments || []);
  };

  const handleProgramChange = (programIdStr: string) => {
    const programId = parseInt(programIdStr, 10);
    const program = programs.find((p) => p.id === programId);

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
  };

  const handlePackageChange = (packageName: string) => {
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
  };

  const updateHotelSelection = (cityIndex: number, hotelName: string) => {
    const newHotelNames = [...selectedHotel.hotelNames];
    newHotelNames[cityIndex] = hotelName;

    setValue("selectedHotel", {
      ...selectedHotel,
      hotelNames: newHotelNames,
      roomTypes: Array(selectedHotel.cities.length).fill(""),
    });
  };

  const updateRoomTypeSelection = (cityIndex: number, roomType: string) => {
    const newRoomTypes = [...selectedHotel.roomTypes];
    newRoomTypes[cityIndex] = roomType;
    setValue("selectedHotel", {
      ...selectedHotel,
      roomTypes: newRoomTypes,
    });
  };

  const availablePeople = useMemo(() => {
    const selectedIDs = new Set(
      (watchedValues.relatedPersons || []).map((p) => p.ID)
    );
    if (booking) selectedIDs.add(booking.id);
    return allBookings.filter(
      (b) =>
        !selectedIDs.has(b.id) &&
        b.clientNameFr.toLowerCase().includes(formState.search.toLowerCase())
    );
  }, [allBookings, watchedValues.relatedPersons, formState.search, booking]);

  const addRelatedPerson = (person: Booking) => {
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
  };

  const removeRelatedPerson = (personId: number) => {
    setValue(
      "relatedPersons",
      (watchedValues.relatedPersons || []).filter((p) => p.ID !== personId)
    );
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {formState.error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-600 rounded-lg">
          {formState.error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t("Client Name (French)")}
          </label>
          <Controller
            name="clientNameFr"
            control={control}
            rules={{ required: "Client name in French is required" }}
            render={({ field }) => (
              <input
                {...field}
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            )}
          />
          {errors.clientNameFr && (
            <p className="text-red-500 text-sm mt-1">
              {errors.clientNameFr.message}
            </p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t("Client Name (Arabic)")}
          </label>
          <Controller
            name="clientNameAr"
            control={control}
            rules={{ required: "Client name in Arabic is required" }}
            render={({ field }) => (
              <input
                {...field}
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                dir="rtl"
              />
            )}
          />
          {errors.clientNameAr && (
            <p className="text-red-500 text-sm mt-1">
              {errors.clientNameAr.message}
            </p>
          )}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {t("Passport Number")}
        </label>
        <Controller
          name="passportNumber"
          control={control}
          rules={{ required: "Passport number is required" }}
          render={({ field }) => (
            <input
              {...field}
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          )}
        />
        {errors.passportNumber && (
          <p className="text-red-500 text-sm mt-1">
            {errors.passportNumber.message}
          </p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {t("Phone Number")}
        </label>
        <Controller
          name="phoneNumber"
          control={control}
          rules={{ required: "Phone number is required" }}
          render={({ field }) => (
            <input
              {...field}
              type="tel"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          )}
        />
        {errors.phoneNumber && (
          <p className="text-red-500 text-sm mt-1">
            {errors.phoneNumber.message}
          </p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {t("Related People")}
        </label>
        <div className="relative">
          <input
            type="text"
            value={formState.search}
            onChange={(e) => {
              setFormState((prev) => ({
                ...prev,
                search: e.target.value,
                showDropdown: true,
              }));
            }}
            onFocus={() =>
              setFormState((prev) => ({ ...prev, showDropdown: true }))
            }
            onBlur={() =>
              setTimeout(
                () =>
                  setFormState((prev) => ({ ...prev, showDropdown: false })),
                200
              )
            }
            placeholder="Search for a client to add..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          />
          {formState.showDropdown && availablePeople.length > 0 && (
            <ul className="absolute z-10 w-full bg-white border border-gray-300 rounded-lg mt-1 max-h-60 overflow-y-auto">
              {availablePeople.map((person) => (
                <li
                  key={person.id}
                  onClick={() => addRelatedPerson(person)}
                  className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                >
                  {person.clientNameFr} ({person.passportNumber})
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          {(watchedValues.relatedPersons || []).map((person) => (
            <div
              key={person.ID}
              className="flex items-center bg-blue-100 text-blue-800 text-sm font-medium px-3 py-1 rounded-full"
            >
              <span>{person.clientName}</span>
              <button
                type="button"
                onClick={() => removeRelatedPerson(person.ID)}
                className="ml-2 text-blue-600 hover:text-blue-800"
              >
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t("Travel Program")}
          </label>
          <Controller
            name="tripId"
            control={control}
            rules={{ required: "Travel program is required" }}
            render={({ field }) => (
              <select
                {...field}
                onChange={(e) => {
                  field.onChange(e);
                  handleProgramChange(e.target.value);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="">{t("Select a program")}</option>
                {programs.map((program) => (
                  <option key={program.id} value={program.id}>
                    {program.name} ({program.type})
                  </option>
                ))}
              </select>
            )}
          />
          {errors.tripId && (
            <p className="text-red-500 text-sm mt-1">{errors.tripId.message}</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t("Package")}
          </label>
          <Controller
            name="packageId"
            control={control}
            rules={{ required: "Package is required" }}
            render={({ field }) => (
              <select
                {...field}
                onChange={(e) => {
                  field.onChange(e);
                  handlePackageChange(e.target.value);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                disabled={!formState.selectedProgram}
              >
                <option value="">{t("Select a package")}</option>
                {(formState.selectedProgram?.packages || []).map((pkg) => (
                  <option key={pkg.name} value={pkg.name}>
                    {pkg.name}
                  </option>
                ))}
              </select>
            )}
          />
          {errors.packageId && (
            <p className="text-red-500 text-sm mt-1">
              {errors.packageId.message}
            </p>
          )}
        </div>
      </div>

      {formState.selectedPackage && (
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            {t("Hotel & Room Selection")}
          </h3>
          <div className="space-y-4">
            {(formState.selectedProgram?.cities || []).map(
              (city, cityIndex) => (
                <div key={city.name} className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-3">
                    {city.name} ({city.nights} {t("nights")})
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {t("Select Hotel")}
                      </label>
                      <select
                        value={selectedHotel.hotelNames[cityIndex] || ""}
                        onChange={(e) =>
                          updateHotelSelection(cityIndex, e.target.value)
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        required
                      >
                        <option value="">{t("Select a hotel")}</option>
                        {(
                          formState.selectedPackage?.hotels[city.name] || []
                        ).map((hotel: string) => (
                          <option key={hotel} value={hotel}>
                            {hotel}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {t("Room Type")}
                      </label>
                      <select
                        value={selectedHotel.roomTypes[cityIndex] || ""}
                        onChange={(e) =>
                          updateRoomTypeSelection(cityIndex, e.target.value)
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        required
                        disabled={!formState.selectedPriceStructure}
                      >
                        <option value="">
                          {t(
                            formState.selectedPriceStructure
                              ? "Select a room type"
                              : "Select all hotels first"
                          )}
                        </option>
                        {formState.selectedPriceStructure?.roomTypes.map(
                          (rt) => (
                            <option key={rt.type} value={rt.type}>
                              {rt.type} ({rt.guests} guests)
                            </option>
                          )
                        )}
                      </select>
                    </div>
                  </div>
                </div>
              )
            )}
          </div>
        </div>
      )}

      <div
        className={`grid grid-cols-1 ${
          userRole !== "employee" ? "md:grid-cols-3" : ""
        } gap-4`}
      >
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t("Selling Price")} (MAD)
          </label>
          <Controller
            name="sellingPrice"
            control={control}
            rules={{ required: "Selling price is required", min: 0 }}
            render={({ field }) => (
              <input
                {...field}
                type="number"
                onChange={(e) => {
                  field.onChange(e.target.value);
                  handleSellingPriceChange(Number(e.target.value));
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                min="0"
                step="0.01"
              />
            )}
          />
          {errors.sellingPrice && (
            <p className="text-red-500 text-sm mt-1">
              {errors.sellingPrice.message}
            </p>
          )}
        </div>

        {(userRole === "admin" || userRole === "manager") && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t("Base Price")} (MAD)
              </label>
              <Controller
                name="basePrice"
                control={control}
                render={({ field }) => (
                  <input
                    {...field}
                    type="number"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100"
                    readOnly
                  />
                )}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t("Profit")} (MAD)
              </label>
              <Controller
                name="profit"
                control={control}
                render={({ field }) => (
                  <input
                    {...field}
                    type="number"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100"
                    readOnly
                  />
                )}
              />
            </div>
          </>
        )}
      </div>

      <div className="flex justify-end space-x-3 pt-6 border-t mt-6">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          {t("Cancel")}
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          {booking ? t("Update") : t("Save")}
        </button>
      </div>
    </form>
  );
}
