import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useAppContext } from "../context/AppContext";
import type {
  Booking,
  Program,
  Package,
  Payment,
  CityData,
} from "../context/AppContext";

interface BookingFormProps {
  booking?: Booking | null;
  programs: Program[];
  onSave: (booking: Booking) => void;
  onCancel: () => void;
}

interface FormData extends Omit<Booking, "id"> {
  id?: string;
}

export default function BookingForm({
  booking,
  programs,
  onSave,
  onCancel,
}: BookingFormProps) {
  const { t } = useTranslation();
  const { state } = useAppContext();
  const initialFormData: FormData = {
    clientNameAr: "",
    clientNameFr: "",
    phoneNumber: "",
    passportNumber: "",
    tripId: "",
    packageId: "",
    selectedHotel: {
      cities: [],
      hotelNames: [],
      roomType: "Double",
    },
    sellingPrice: 0,
    basePrice: 0,
    advancePayments: [],
    remainingBalance: 0,
    isFullyPaid: false,
    profit: 0,
    createdAt: new Date().toISOString().split("T")[0],
  };

  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [selectedProgram, setSelectedProgram] = useState<Program | null>(null);
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);
  const [availableRoomTypes] = useState([
    "Double",
    "Triple",
    "Quad",
    "Quintuple",
  ]);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (booking) {
      // First set the form data
      setFormData(booking);

      // Find and set the program
      const program = programs.find((p) => p.id === booking.tripId);
      if (program) {
        setSelectedProgram(program);

        // Find the package by name
        const pkg = program.packages.find((p) => p.name === booking.packageId);
        if (pkg) {
          setSelectedPackage(pkg);
          // Ensure the packageId is set correctly
          setFormData((prev) => ({
            ...prev,
            packageId: pkg.name,
          }));
        } else {
          setError("Selected package not found");
        }
      } else {
        setError("Selected program not found");
      }
    }
  }, [booking, programs]);

  useEffect(() => {
    if (formData.tripId) {
      const program = programs.find((p) => p.id === formData.tripId);
      setSelectedProgram(program || null);
      setSelectedPackage(null);
      setFormData((prev) => ({ ...prev, packageId: "" }));
      setError(null);
    }
  }, [formData.tripId, programs]);
  useEffect(() => {
    if (selectedProgram && formData.packageId) {
      const pkg = selectedProgram.packages.find(
        (p) => p.name === formData.packageId
      );
      if (pkg) {
        setSelectedPackage(pkg);
        setError(null);
        // Make sure formData reflects the current package
        setFormData((prev) => ({
          ...prev,
          packageId: pkg.name,
        }));
      } else {
        setSelectedPackage(null);
        setError("Selected package not found");
      }
    }
  }, [selectedProgram, formData.packageId]);
  useEffect(() => {
    if (formData.tripId) {
      const program = programs.find((p) => p.id === formData.tripId);
      setSelectedProgram(program || null);
      // Only clear package if this isn't the initial load (if there's no booking.packageId)
      if (!booking?.packageId) {
        setSelectedPackage(null);
        setFormData((prev) => ({ ...prev, packageId: "" }));
      }
    }
  }, [formData.tripId, programs, booking?.packageId]);

  useEffect(() => {
    const profit = formData.sellingPrice - formData.basePrice;
    const totalPaid = formData.advancePayments.reduce(
      (sum: number, payment: any) => sum + payment.amount,
      0
    );
    const remaining = Math.max(0, formData.sellingPrice - totalPaid);

    setFormData((prev) => ({
      ...prev,
      profit,
      remainingBalance: remaining,
      isFullyPaid: remaining === 0,
    }));
  }, [formData.sellingPrice, formData.basePrice, formData.advancePayments]);

  // Get the number of guests based on room type
  const getGuestsPerRoom = (roomType: string): number => {
    switch (roomType.toLowerCase()) {
      case "double":
        return 2;
      case "triple":
        return 3;
      case "quad":
        return 4;
      case "quintuple":
        return 5;
      default:
        return 2;
    }
  };

  // Calculate hotel costs per city
  const calculateHotelCosts = (): number => {
    if (!selectedProgram || !formData.selectedHotel.cities.length) return 0;

    const pricing = state.programPricing.find(
      (p) => p.programId === formData.tripId
    );
    if (!pricing) return 0;

    return formData.selectedHotel.cities.reduce((total, city, index) => {
      const hotelName = formData.selectedHotel.hotelNames[index];
      const roomType = formData.selectedHotel.roomType.toLowerCase();
      const hotel = pricing.allHotels.find(
        (h) => h.name === hotelName && h.city === city
      );

      if (hotel) {
        const pricePerNight =
          hotel.PricePerNights[roomType as keyof typeof hotel.PricePerNights];
        const nights = selectedProgram.cities.find(
          (c) => c.name === city
        )?.nights;
        const guestsPerRoom = getGuestsPerRoom(roomType);
        return total + (pricePerNight * nights!) / guestsPerRoom;
      }
      return total;
    }, 0);
  };

  // Calculate total base price including all components
  const calculateTotalBasePrice = (): number => {
    if (!selectedProgram) return 0;

    const pricing = state.programPricing.find(
      (p) => p.programId === formData.tripId
    );
    if (!pricing) return 0;

    // Calculate base price from program pricing components
    const hotelCosts = calculateHotelCosts();
    const basePrice = pricing.ticketAirline + pricing.visaFees + pricing.guideFees + hotelCosts;
    
    // Update form data with the calculated base price
    setFormData(prev => ({
      ...prev,
      basePrice,
      profit: prev.sellingPrice - basePrice,
      remainingBalance: prev.sellingPrice - prev.advancePayments.reduce((sum, p) => sum + p.amount, 0)
    }));

    return basePrice;
  };

  // Add effect to update base price when relevant fields change
  useEffect(() => {
    if (selectedProgram) {
      const newBasePrice = calculateTotalBasePrice();
      setFormData((prev) => ({
        ...prev,
        basePrice: newBasePrice,
        profit: prev.sellingPrice - newBasePrice,
      }));
    }
  }, [
    formData.tripId,
    formData.selectedHotel.cities,
    formData.selectedHotel.hotelNames,
    formData.selectedHotel.roomType,
    selectedProgram,
  ]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedProgram || !selectedPackage) {
      setError("Program and package must be selected");
      return;
    }

    const bookingData: Booking = {
      id: booking?.id || crypto.randomUUID(),
      ...formData,
      isFullyPaid: formData.remainingBalance === 0,
      profit: formData.sellingPrice - formData.basePrice,
    };

    onSave(bookingData);
  };

  const handleProgramChange = (programId: string) => {
    const program = programs.find((p) => p.id === programId);
    if (program) {
      setSelectedProgram(program);
      setError(null);
    } else {
      setError("Selected program not found");
    }

    setFormData((prev) => ({
      ...prev,
      tripId: programId,
      packageId: "",
      selectedHotel: {
        cities: [],
        hotelNames: [],
        roomType: "Double",
      },
    }));
  };
  const handlePackageChange = (packageName: string) => {
    if (!selectedProgram) {
      setError("No program selected");
      return;
    }

    const pkg = selectedProgram.packages.find((p) => p.name === packageName);
    if (pkg) {
      setSelectedPackage(pkg);
      setError(null);
      // Initialize hotel selection for all cities
      setFormData((prev) => ({
        ...prev,
        packageId: packageName,
        selectedHotel: {
          cities: selectedProgram.cities.map((city) => city.name),
          hotelNames: selectedProgram.cities.map(() => ""),
          roomType: prev.selectedHotel.roomType,
        },
      }));
    } else {
      setError("Selected package not found");
      setSelectedPackage(null);
    }
  };

  const updateHotelSelection = (cityIndex: number, hotelName: string) => {
    setFormData((prev) => ({
      ...prev,
      selectedHotel: {
        ...prev.selectedHotel,
        hotelNames: prev.selectedHotel.hotelNames.map((name, i) =>
          i === cityIndex ? hotelName : name
        ),
      },
    }));
  };
  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-600 rounded-lg">
          {error}
        </div>
      )}

      {/* Client Information */}
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
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          required
        />
      </div>

      {/* Program Selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t("Travel Program")}
          </label>
          <select
            value={formData.tripId}
            onChange={(e) => handleProgramChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
          </label>{" "}
          <select
            value={formData.packageId || ""}
            onChange={(e) => handlePackageChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={!selectedProgram}
            required
          >
            <option value="">{t("Select a package")}</option>
            {selectedProgram?.packages.map((pkg) => (
              <option key={pkg.name} value={pkg.name}>
                {pkg.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Hotel Selection by City */}
      {selectedPackage && !error && (
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            {t("Hotel Selection")}
          </h3>

          <div className="space-y-4">
            {selectedProgram?.cities.map((city, cityIndex) => (
              <div key={city.name} className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="font-medium text-gray-900">{city.name}</h4>
                    <p className="text-sm text-gray-600">
                      {city.nights} {t("nights")}
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t("Select Hotel")}
                  </label>
                  <select
                    value={formData.selectedHotel.hotelNames[cityIndex] || ""}
                    onChange={(e) =>
                      updateHotelSelection(cityIndex, e.target.value)
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="">{t("Select a hotel")}</option>
                    {selectedPackage.hotels[city.name]?.map((hotel: string) => (
                      <option key={hotel} value={hotel}>
                        {hotel}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Room Type */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {t("Room Type")}
        </label>
        <select
          value={formData.selectedHotel.roomType}
          onChange={(e) =>
            setFormData((prev) => ({
              ...prev,
              selectedHotel: {
                ...prev.selectedHotel,
                roomType: e.target.value,
              },
            }))
          }
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          required
        >
          {availableRoomTypes.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </div>

      {/* Pricing */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t("Base Price")} (MAD)
          </label>{" "}
          <input
            type="number"
            value={formData.basePrice}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
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
            onChange={(e) => {
              const sellingPrice = parseFloat(e.target.value) || 0;
              const profit = sellingPrice - formData.basePrice;
              setFormData((prev) => ({
                ...prev,
                sellingPrice,
                profit,
                remainingBalance:
                  sellingPrice -
                  prev.advancePayments.reduce((sum, p) => sum + p.amount, 0),
              }));
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
            disabled
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          {t("Cancel")}
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          {booking ? t("Update") : t("Save")}
        </button>
      </div>
    </form>
  );
}
