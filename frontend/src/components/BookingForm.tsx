import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useAppContext } from "../context/AppContext";
import type { Booking, Program, Package, Payment } from "../context/AppContext";

export type BookingFormData = Omit<Booking, 'id' | 'isFullyPaid' | 'remainingBalance' | 'advancePayments'>;

interface BookingFormProps {
  booking?: Booking | null;
  programs: Program[];
  onSave: (bookingData: BookingFormData, initialPayments: Payment[]) => void;
  onCancel: () => void;
}

export default function BookingForm({ booking, programs, onSave, onCancel }: BookingFormProps) {
  const { t } = useTranslation();
  const { state } = useAppContext();

  const [formData, setFormData] = useState<BookingFormData>({
    clientNameAr: "",
    clientNameFr: "",
    phoneNumber: "",
    passportNumber: "",
    tripId: "",
    packageId: "",
    selectedHotel: { cities: [], hotelNames: [], roomType: "Double" },
    sellingPrice: 0,
    basePrice: 0,
    profit: 0,
    createdAt: new Date().toISOString().split("T")[0],
  });

  const [selectedProgram, setSelectedProgram] = useState<Program | null>(null);
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);
  const [availableRoomTypes] = useState(["Double", "Triple", "Quad", "Quintuple"]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (booking) {
      const program = programs.find((p) => p.id.toString() === (booking.tripId || '').toString());
      if(program){
        const pkg = (program.packages || []).find(p => p.name === booking.packageId);
        setSelectedProgram(program);
        if(pkg) setSelectedPackage(pkg);
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
      });
    }
  }, [booking, programs]);

  useEffect(() => {
    const getGuestsPerRoom = (roomType: string): number => {
        if (!roomType) return 2;
        switch (roomType.toLowerCase()) {
          case "double": return 2;
          case "triple": return 3;
          case "quad": return 4;
          case "quintuple": return 5;
          default: return 2;
        }
    };
    const calculateHotelCosts = (): number => {
        if (!selectedProgram || !formData.selectedHotel.cities) return 0;
        const pricing = state.programPricing.find((p) => p.programId === selectedProgram.id);
        if (!pricing || !pricing.allHotels) return 0;

        return formData.selectedHotel.cities.reduce((total, city, index) => {
          const hotelName = formData.selectedHotel.hotelNames[index];
          const roomType = formData.selectedHotel.roomType.toLowerCase();
          const hotel = pricing.allHotels.find((h) => h.name === hotelName && h.city === city);

          if (hotel && hotel.PricePerNights) {
            const pricePerNight = Number(hotel.PricePerNights[roomType as keyof typeof hotel.PricePerNights] || 0);
            const nights = Number((selectedProgram.cities || []).find((c) => c.name === city)?.nights || 0);
            if(!isNaN(pricePerNight) && !isNaN(nights) && nights > 0) {
                return total + (pricePerNight * nights) / getGuestsPerRoom(roomType);
            }
          }
          return total;
        }, 0);
    };

    const calculateTotalBasePrice = (): number => {
        if (!selectedProgram) return 0;
        const pricing = state.programPricing.find((p) => p.programId === selectedProgram.id);
        if (!pricing) return 0;
        const hotelCosts = calculateHotelCosts();
        const ticketAirline = Number(pricing.ticketAirline || 0);
        const visaFees = Number(pricing.visaFees || 0);
        const guideFees = Number(pricing.guideFees || 0);
        
        if(isNaN(ticketAirline) || isNaN(visaFees) || isNaN(guideFees) || isNaN(hotelCosts)) {
            return 0;
        }
        
        return Math.round(ticketAirline + visaFees + guideFees + hotelCosts);
    };

    if(selectedProgram && formData.selectedHotel.hotelNames.every(name => name)){
        const newBasePrice = calculateTotalBasePrice();
        setFormData(prev => ({ ...prev, basePrice: newBasePrice, profit: prev.sellingPrice - newBasePrice }));
    }
  }, [formData.tripId, formData.selectedHotel, selectedProgram, state.programPricing, formData.sellingPrice]);

  const handleSellingPriceChange = (price: number) => {
    setFormData(prev => ({ ...prev, sellingPrice: price, profit: price - prev.basePrice }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProgram || !selectedPackage) {
      setError("Program and package must be selected");
      return;
    }
    onSave(formData, booking?.advancePayments || []);
  };

    const handleProgramChange = (programIdStr: string) => {
        const programId = parseInt(programIdStr, 10);
        const program = programs.find((p) => p.id === programId);
        setSelectedProgram(program || null);
        setSelectedPackage(null);
        setFormData((prev) => ({
          ...prev,
          tripId: programIdStr,
          packageId: "",
          selectedHotel: { cities: [], hotelNames: [], roomType: "Double" },
        }));
        setError(null);
      };

      const handlePackageChange = (packageName: string) => {
        if (!selectedProgram) return;
        const pkg = (selectedProgram.packages || []).find((p) => p.name === packageName);
        if (pkg) {
          setSelectedPackage(pkg);
          setFormData((prev) => ({
            ...prev,
            packageId: packageName,
            selectedHotel: {
              ...prev.selectedHotel,
              cities: (selectedProgram.cities || []).map(c => c.name),
              hotelNames: (selectedProgram.cities || []).map(() => "")
            },
          }));
        }
      };

      const updateHotelSelection = (cityIndex: number, hotelName: string) => {
        setFormData((prev) => ({
          ...prev,
          selectedHotel: {
            ...prev.selectedHotel,
            hotelNames: prev.selectedHotel.hotelNames.map((name, i) => i === cityIndex ? hotelName : name)
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
          <label className="block text-sm font-medium text-gray-700 mb-2">{t("Client Name (French)")}</label>
          <input type="text" value={formData.clientNameFr} onChange={(e) => setFormData((prev) => ({ ...prev, clientNameFr: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">{t("Client Name (Arabic)")}</label>
          <input type="text" value={formData.clientNameAr} onChange={(e) => setFormData((prev) => ({ ...prev, clientNameAr: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg" dir="rtl" required />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">{t("Passport Number")}</label>
        <input type="text" value={formData.passportNumber} onChange={(e) => setFormData((prev) => ({ ...prev, passportNumber: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg" required />
      </div>
       <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">{t("Phone Number")}</label>
        <input type="tel" value={formData.phoneNumber} onChange={(e) => setFormData((prev) => ({ ...prev, phoneNumber: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg" required />
      </div>

      {/* Program Selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">{t("Travel Program")}</label>
          <select value={formData.tripId} onChange={(e) => handleProgramChange(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg" required>
            <option value="">{t("Select a program")}</option>
            {programs.map((program) => ( <option key={program.id} value={program.id}>{program.name} ({program.type})</option> ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">{t("Package")}</label>
          <select value={formData.packageId || ""} onChange={(e) => handlePackageChange(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg" disabled={!selectedProgram} required>
            <option value="">{t("Select a package")}</option>
            {(selectedProgram?.packages || []).map((pkg) => ( <option key={pkg.name} value={pkg.name}>{pkg.name}</option> ))}
          </select>
        </div>
      </div>

      {/* Hotel Selection by City */}
      {selectedPackage && !error && (
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">{t("Hotel Selection")}</h3>
          <div className="space-y-4">
            {(selectedProgram?.cities || []).map((city, cityIndex) => (
              <div key={city.name} className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="font-medium text-gray-900">{city.name}</h4>
                    <p className="text-sm text-gray-600">{city.nights} {t("nights")}</p>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t("Select Hotel")}</label>
                  <select
                    value={formData.selectedHotel.hotelNames[cityIndex] || ""}
                    onChange={(e) => updateHotelSelection(cityIndex, e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    required
                  >
                    <option value="">{t("Select a hotel")}</option>
                    {(selectedPackage.hotels[city.name] || []).map((hotel: string) => ( <option key={hotel} value={hotel}>{hotel}</option> ))}
                  </select>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Room Type */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">{t("Room Type")}</label>
        <select value={formData.selectedHotel.roomType} onChange={(e) => setFormData((prev) => ({ ...prev, selectedHotel: { ...prev.selectedHotel, roomType: e.target.value } }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg" required>
          {availableRoomTypes.map((type) => ( <option key={type} value={type}>{type}</option> ))}
        </select>
      </div>

      {/* Pricing */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">{t("Base Price")} (MAD)</label>
          <input type="number" value={formData.basePrice} className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50" readOnly />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">{t("Selling Price")} (MAD)</label>
          <input type="number" value={formData.sellingPrice} onChange={(e) => handleSellingPriceChange(Number(e.target.value))} className="w-full px-3 py-2 border border-gray-300 rounded-lg" min="0" step="0.01" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">{t("Profit")} (MAD)</label>
          <input type="number" value={formData.profit} className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50" readOnly />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end space-x-3 pt-6 border-t mt-6">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">{t("Cancel")}</button>
        <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">{booking ? t("Update") : t("Save")}</button>
      </div>
    </form>
  );
}
