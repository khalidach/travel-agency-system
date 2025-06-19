import React, { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useProgramsContext } from "../context/ProgramsContext";
import { useBookingsContext } from "../context/BookingsContext";
import type {
  Booking,
  Program,
  Package,
  Payment,
  RelatedPerson,
  PriceStructure,
} from "../context/models";
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
  const { state: programsState } = useProgramsContext();
  const { state: bookingsState } = useBookingsContext();
  const [search, setSearch] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);

  const [formData, setFormData] = useState<BookingFormData>({
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
  });

  const [selectedProgram, setSelectedProgram] = useState<Program | null>(null);
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);
  const [selectedPriceStructure, setSelectedPriceStructure] =
    useState<PriceStructure | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (booking) {
      const program = programs.find(
        (p) => p.id.toString() === (booking.tripId || "").toString()
      );
      if (program) {
        const pkg = (program.packages || []).find(
          (p) => p.name === booking.packageId
        );
        setSelectedProgram(program);
        if (pkg) setSelectedPackage(pkg);
      }

      setFormData({
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
  }, [booking, programs]);

  useEffect(() => {
    const calculateTotalBasePrice = (): number => {
      if (!selectedProgram || !selectedPriceStructure) return 0;
      const pricing = programsState.programPricing.find(
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
      setFormData((prev) => ({
        ...prev,
        basePrice: newBasePrice,
        profit: prev.sellingPrice - newBasePrice,
      }));
    }
  }, [
    formData.selectedHotel,
    formData.sellingPrice,
    selectedProgram,
    selectedPriceStructure,
    programsState.programPricing,
  ]);

  useEffect(() => {
    if (
      selectedPackage &&
      selectedProgram?.cities.length ===
        formData.selectedHotel.hotelNames.length &&
      formData.selectedHotel.hotelNames.every((h) => h)
    ) {
      const hotelCombination = formData.selectedHotel.hotelNames.join("_");
      const priceStructure = selectedPackage.prices.find(
        (p) => p.hotelCombination === hotelCombination
      );
      setSelectedPriceStructure(priceStructure || null);
    } else {
      setSelectedPriceStructure(null);
    }
  }, [formData.selectedHotel.hotelNames, selectedPackage, selectedProgram]);

  const handleSellingPriceChange = (price: number) => {
    setFormData((prev) => ({
      ...prev,
      sellingPrice: price,
      profit: price - prev.basePrice,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProgram || !selectedPackage || !selectedPriceStructure) {
      setError(
        "A valid program, package, and hotel combination must be selected."
      );
      return;
    }
    onSave(formData, booking?.advancePayments || []);
  };

  const handleProgramChange = (programIdStr: string) => {
    const programId = parseInt(programIdStr, 10);
    const program = programs.find((p) => p.id === programId);
    setSelectedProgram(program || null);
    setSelectedPackage(null);
    setSelectedPriceStructure(null);
    setFormData((prev) => ({
      ...prev,
      tripId: programIdStr,
      packageId: "",
      selectedHotel: { cities: [], hotelNames: [], roomTypes: [] },
    }));
    setError(null);
  };

  const handlePackageChange = (packageName: string) => {
    if (!selectedProgram) return;
    const pkg = (selectedProgram.packages || []).find(
      (p) => p.name === packageName
    );
    setSelectedPackage(pkg || null);
    setSelectedPriceStructure(null);
    if (pkg) {
      const cities = (selectedProgram.cities || []).map((c) => c.name);
      setFormData((prev) => ({
        ...prev,
        packageId: packageName,
        selectedHotel: {
          cities,
          hotelNames: Array(cities.length).fill(""),
          roomTypes: Array(cities.length).fill(""),
        },
      }));
    }
  };

  const updateHotelSelection = (cityIndex: number, hotelName: string) => {
    const newHotelNames = [...formData.selectedHotel.hotelNames];
    newHotelNames[cityIndex] = hotelName;

    setFormData((prev) => ({
      ...prev,
      selectedHotel: {
        ...prev.selectedHotel,
        hotelNames: newHotelNames,
        roomTypes: Array(prev.selectedHotel.cities.length).fill(""),
      },
    }));
  };

  const updateRoomTypeSelection = (cityIndex: number, roomType: string) => {
    const newRoomTypes = [...formData.selectedHotel.roomTypes];
    newRoomTypes[cityIndex] = roomType;
    setFormData((prev) => ({
      ...prev,
      selectedHotel: { ...prev.selectedHotel, roomTypes: newRoomTypes },
    }));
  };

  const availablePeople = useMemo(() => {
    const selectedIDs = new Set(
      (formData.relatedPersons || []).map((p) => p.ID)
    );
    if (booking) selectedIDs.add(booking.id);
    return bookingsState.bookings.filter(
      (b) =>
        !selectedIDs.has(b.id) &&
        b.clientNameFr.toLowerCase().includes(search.toLowerCase())
    );
  }, [bookingsState.bookings, formData.relatedPersons, search, booking]);

  const addRelatedPerson = (person: Booking) => {
    const newPerson: RelatedPerson = {
      ID: person.id,
      clientName: person.clientNameFr,
    };
    setFormData((prev) => ({
      ...prev,
      relatedPersons: [...(prev.relatedPersons || []), newPerson],
    }));
    setSearch("");
    setShowDropdown(false);
  };

  const removeRelatedPerson = (personId: number) => {
    setFormData((prev) => ({
      ...prev,
      relatedPersons: (prev.relatedPersons || []).filter(
        (p) => p.ID !== personId
      ),
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-600 rounded-lg">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t("Client Name (French)")}
          </label>
          <input
            type="text"
            value={formData.clientNameFr}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, clientNameFr: e.target.value }))
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t("Client Name (Arabic)")}
          </label>
          <input
            type="text"
            value={formData.clientNameAr}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, clientNameAr: e.target.value }))
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            dir="rtl"
            required
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {t("Passport Number")}
        </label>
        <input
          type="text"
          value={formData.passportNumber}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, passportNumber: e.target.value }))
          }
          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {t("Phone Number")}
        </label>
        <input
          type="tel"
          value={formData.phoneNumber}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, phoneNumber: e.target.value }))
          }
          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          required
        />
      </div>

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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t("Travel Program")}
          </label>
          <select
            value={formData.tripId}
            onChange={(e) => handleProgramChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            required
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
            value={formData.packageId || ""}
            onChange={(e) => handlePackageChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            disabled={!selectedProgram}
            required
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
                      value={formData.selectedHotel.hotelNames[cityIndex] || ""}
                      onChange={(e) =>
                        updateHotelSelection(cityIndex, e.target.value)
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      required
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
                      value={formData.selectedHotel.roomTypes[cityIndex] || ""}
                      onChange={(e) =>
                        updateRoomTypeSelection(cityIndex, e.target.value)
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      required
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t("Base Price")} (MAD)
          </label>
          <input
            type="number"
            value={formData.basePrice}
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
            value={formData.sellingPrice}
            onChange={(e) => handleSellingPriceChange(Number(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            min="0"
            step="0.01"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t("Profit")} (MAD)
          </label>
          <input
            type="number"
            value={formData.profit}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100"
            readOnly
          />
        </div>
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
