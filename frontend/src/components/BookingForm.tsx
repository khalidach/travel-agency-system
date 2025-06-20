import React, { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
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
import { X } from "lucide-react";

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

export default function BookingForm({
  booking,
  programs,
  onSave,
  onCancel,
}: BookingFormProps) {
  const { t } = useTranslation();

  const { data: allBookings = [] } = useQuery<Booking[]>({
    queryKey: ["bookings"],
    queryFn: api.getBookings,
  });

  const { data: programPricing = [] } = useQuery<ProgramPricing[]>({
    queryKey: ["programPricing"],
    queryFn: api.getProgramPricing,
  });

  const [search, setSearch] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    control,
    register,
    handleSubmit,
    watch,
    reset,
    setValue,
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

  const formData = watch();
  const selectedProgram = useMemo(
    () => programs.find((p) => p.id.toString() === formData.tripId),
    [formData.tripId, programs]
  );
  const selectedPackage = useMemo(
    () => selectedProgram?.packages.find((p) => p.name === formData.packageId),
    [formData.packageId, selectedProgram]
  );

  const selectedPriceStructure = useMemo(() => {
    if (
      !selectedPackage ||
      !formData.selectedHotel.hotelNames ||
      formData.selectedHotel.hotelNames.some((h) => !h)
    )
      return null;
    const hotelCombination = formData.selectedHotel.hotelNames.join("_");
    return (
      selectedPackage.prices.find(
        (p) => p.hotelCombination === hotelCombination
      ) || null
    );
  }, [formData.selectedHotel.hotelNames, selectedPackage]);

  useEffect(() => {
    if (booking) {
      reset({
        ...booking,
        createdAt: new Date(booking.createdAt).toISOString().split("T")[0],
      });
    }
  }, [booking, reset]);

  // Calculate base price and profit
  useEffect(() => {
    const calculateTotalBasePrice = (): number => {
      if (!selectedProgram || !selectedPriceStructure) return 0;
      const pricing = programPricing.find(
        (p) => p.programId === selectedProgram.id
      );
      if (!pricing || !pricing.allHotels) return 0;

      const hotelCosts = formData.selectedHotel.cities.reduce(
        (total, city, index) => {
          const hotelName = formData.selectedHotel.hotelNames[index];
          const roomTypeName = formData.selectedHotel.roomTypes[index];
          if (!roomTypeName) return total;

          const roomDef = selectedPriceStructure.roomTypes.find(
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
            const cityInfo = selectedProgram.cities.find(
              (c) => c.name === city
            );
            const nights = cityInfo ? cityInfo.nights : 0;
            if (pricePerNight > 0 && nights > 0 && guests > 0) {
              return total + (pricePerNight * nights) / guests;
            }
          }
          return total;
        },
        0
      );

      const ticketAirline = Number(pricing.ticketAirline || 0);
      const visaFees = Number(pricing.visaFees || 0);
      const guideFees = Number(pricing.guideFees || 0);
      return Math.round(ticketAirline + visaFees + guideFees + hotelCosts);
    };

    if (selectedProgram && selectedPriceStructure) {
      const newBasePrice = calculateTotalBasePrice();
      setValue("basePrice", newBasePrice);
      setValue("profit", formData.sellingPrice - newBasePrice);
    }
  }, [
    formData.selectedHotel,
    formData.sellingPrice,
    selectedProgram,
    selectedPriceStructure,
    programPricing,
    setValue,
  ]);

  const onSubmit = (data: BookingFormData) => {
    if (!selectedProgram || !selectedPackage || !selectedPriceStructure) {
      setError(
        "A valid program, package, and hotel combination must be selected."
      );
      return;
    }
    setError(null);
    onSave(data, booking?.advancePayments || []);
  };

  const availablePeople = useMemo(() => {
    const selectedIDs = new Set(
      (formData.relatedPersons || []).map((p) => p.ID)
    );
    if (booking) selectedIDs.add(booking.id);
    return allBookings.filter(
      (b) =>
        !selectedIDs.has(b.id) &&
        b.clientNameFr.toLowerCase().includes(search.toLowerCase())
    );
  }, [allBookings, formData.relatedPersons, search, booking]);

  const addRelatedPerson = (person: Booking) => {
    const newPerson: RelatedPerson = {
      ID: person.id,
      clientName: person.clientNameFr,
    };
    const currentRelated = formData.relatedPersons || [];
    setValue("relatedPersons", [...currentRelated, newPerson]);
    setSearch("");
    setShowDropdown(false);
  };

  const removeRelatedPerson = (personId: number) => {
    const currentRelated = formData.relatedPersons || [];
    setValue(
      "relatedPersons",
      currentRelated.filter((p) => p.ID !== personId)
    );
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-600 rounded-lg">
          {error}
        </div>
      )}

      {/* Client Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t("Client Name (French)")}
          </label>
          <input
            {...register("clientNameFr", { required: true })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t("Client Name (Arabic)")}
          </label>
          <input
            {...register("clientNameAr", { required: true })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            dir="rtl"
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {t("Passport Number")}
        </label>
        <input
          {...register("passportNumber", { required: true })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {t("Phone Number")}
        </label>
        <input
          type="tel"
          {...register("phoneNumber", { required: true })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
        />
      </div>

      {/* Related People */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {t("Related People")}
        </label>
        <div className="relative">
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setShowDropdown(true);
            }}
            onFocus={() => setShowDropdown(true)}
            onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
            placeholder="Search for a client to add..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          />
          {showDropdown && availablePeople.length > 0 && (
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
          {(formData.relatedPersons || []).map((person) => (
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

      {/* Program and Package Selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t("Travel Program")}
          </label>
          <select
            {...register("tripId", { required: true })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            onChange={(e) => {
              setValue("tripId", e.target.value);
              setValue("packageId", "");
              setValue("selectedHotel", {
                cities: [],
                hotelNames: [],
                roomTypes: [],
              });
            }}
          >
            <option value="">{t("Select a program")}</option>
            {programs.map((program) => (
              <option key={program.id} value={program.id}>
                {program.name} ({program.type})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t("Package")}
          </label>
          <select
            {...register("packageId", { required: true })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            disabled={!selectedProgram}
            onChange={(e) => {
              const newPackageName = e.target.value;
              setValue("packageId", newPackageName);
              const program = programs.find(
                (p) => p.id.toString() === formData.tripId
              );
              if (program) {
                const cities = (program.cities || []).map((c) => c.name);
                setValue("selectedHotel", {
                  cities,
                  hotelNames: Array(cities.length).fill(""),
                  roomTypes: Array(cities.length).fill(""),
                });
              }
            }}
          >
            <option value="">{t("Select a package")}</option>
            {(selectedProgram?.packages || []).map((pkg) => (
              <option key={pkg.name} value={pkg.name}>
                {pkg.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Hotel & Room Selection */}
      {selectedPackage && (
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            {t("Hotel & Room Selection")}
          </h3>
          <div className="space-y-4">
            {(selectedProgram?.cities || []).map((city, cityIndex) => (
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
                      {...register(`selectedHotel.hotelNames.${cityIndex}`, {
                        required: true,
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="">{t("Select a hotel")}</option>
                      {(selectedPackage.hotels[city.name] || []).map(
                        (hotel: string) => (
                          <option key={hotel} value={hotel}>
                            {hotel}
                          </option>
                        )
                      )}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t("Room Type")}
                    </label>
                    <select
                      {...register(`selectedHotel.roomTypes.${cityIndex}`, {
                        required: true,
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      disabled={!selectedPriceStructure}
                    >
                      <option value="">
                        {t(
                          selectedPriceStructure
                            ? "Select a room type"
                            : "Select all hotels first"
                        )}
                      </option>
                      {selectedPriceStructure?.roomTypes.map((rt) => (
                        <option key={rt.type} value={rt.type}>
                          {rt.type} ({rt.guests} guests)
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pricing */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t("Base Price")} (MAD)
          </label>
          <input
            type="number"
            {...register("basePrice")}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100"
            readOnly
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t("Selling Price")} (MAD)
          </label>
          <input
            type="number"
            {...register("sellingPrice", { valueAsNumber: true, min: 0 })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t("Profit")} (MAD)
          </label>
          <input
            type="number"
            {...register("profit")}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100"
            readOnly
          />
        </div>
      </div>

      {/* Created At Date */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Booking Date
        </label>
        <input
          type="date"
          {...register("createdAt", { required: true })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
        />
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
