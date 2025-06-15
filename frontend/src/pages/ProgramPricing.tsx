import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useAppContext } from "../context/AppContext";
import type { Program, ProgramPricing, HotelPrice } from "../context/AppContext";
import { Pencil, Trash2 } from "lucide-react";
import * as api from '../services/api';

const emptyPricing: Omit<ProgramPricing, 'id'> = {
    selectProgram: "",
    programId: 0,
    ticketAirline: 0,
    visaFees: 0,
    guideFees: 0,
    allHotels: [],
};


export default function ProgramPricingPage() {
  const { t } = useTranslation();
  const { state, dispatch } = useAppContext();
  const { programs, programPricing } = state;
  const [currentPricing, setCurrentPricing] = useState<ProgramPricing | Omit<ProgramPricing, 'id'>>(emptyPricing);

  const [selectedProgram, setSelectedProgram] = useState<Program | null>(null);

  const handleProgramSelect = (programIdStr: string) => {
    const programId = parseInt(programIdStr, 10);
    const program = programs.find((p) => p.id === programId);
    if (!program) {
      setCurrentPricing(emptyPricing);
      setSelectedProgram(null);
      return;
    }

    const hotelsList = program.cities.flatMap((city) => {
      const cityHotels = new Set<string>();
      program.packages.forEach(pkg => {
        const hotels = pkg.hotels[city.name] || [];
        hotels.forEach(hotel => cityHotels.add(hotel));
      });

      return Array.from(cityHotels).map((hotelName) => ({
        name: hotelName,
        city: city.name,
        nights: city.nights,
        PricePerNights: { double: 0, triple: 0, quad: 0, quintuple: 0 },
      }));
    });

    setSelectedProgram(program);
    setCurrentPricing({
      ...emptyPricing,
      selectProgram: program.name,
      programId: program.id,
      allHotels: hotelsList,
    });
  };

  const handleEditPricing = (pricing: ProgramPricing) => {
    const program = programs.find((p) => p.id === pricing.programId);
    if (!program) {
      console.error('Program not found');
      return;
    }

    setSelectedProgram(program);

    const programHotels = program.cities.flatMap((city) => {
      const cityHotels = new Set<string>();
      program.packages.forEach(pkg => {
        const hotels = pkg.hotels[city.name] || [];
        hotels.forEach(hotel => cityHotels.add(hotel));
      });
      return Array.from(cityHotels).map((hotelName) => ({ name: hotelName, city: city.name, nights: city.nights }));
    });

    const existingPrices = new Map(pricing.allHotels.map((hotel) => [`${hotel.city}-${hotel.name}`, hotel.PricePerNights]));
    const synchronizedHotels = programHotels.map((hotel) => ({
      ...hotel,
      PricePerNights: existingPrices.get(`${hotel.city}-${hotel.name}`) || { double: 0, triple: 0, quad: 0, quintuple: 0 },
    }));

    setCurrentPricing({ ...pricing, allHotels: synchronizedHotels });
  };

  const handleDeletePricing = async (id: number) => {
    if(window.confirm('Are you sure you want to delete this pricing?')){
        try {
            await api.deleteProgramPricing(id);
            dispatch({ type: "DELETE_PROGRAM_PRICING", payload: id });
        } catch (error) {
            console.error("Failed to delete program pricing", error);
        }
    }
  };

  const handleHotelPriceChange = (hotelIndex: number, roomType: string, value: string) => {
    setCurrentPricing((prev) => {
      const newHotels = [...(prev.allHotels || [])];
      newHotels[hotelIndex] = {
        ...newHotels[hotelIndex],
        PricePerNights: { ...newHotels[hotelIndex].PricePerNights, [roomType]: value === '' ? 0 : Number(value) }
      };
      return { ...prev, allHotels: newHotels };
    });
  };

  const handleSave = async () => {
    const isEditing = 'id' in currentPricing;

    try {
        let updatedPricing;
        if (isEditing) {
          updatedPricing = await api.updateProgramPricing(currentPricing.id, currentPricing);
          dispatch({ type: "UPDATE_PROGRAM_PRICING", payload: updatedPricing });
          const updatedBookings = await api.getBookings();
          dispatch({ type: "SET_BOOKINGS", payload: updatedBookings });
        } else {
          updatedPricing = await api.createProgramPricing(currentPricing);
          dispatch({ type: "ADD_PROGRAM_PRICING", payload: updatedPricing });
        }
        setCurrentPricing(emptyPricing);
        setSelectedProgram(null);
    } catch (error) {
        console.error("Failed to save program pricing", error);
    }
  };

  if (state.loading) {
      return <div>Loading...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <h1 className="text-2xl font-bold mb-6">{t("Program Pricing")}</h1>
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {t("Select Program")}
        </label>
        <select
          value={selectedProgram?.id || ""}
          onChange={(e) => handleProgramSelect(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
        >
          <option value="">{t("Select a program")}</option>
          {programs
            .filter(program => !programPricing.some(p => p.programId === program.id) || (currentPricing && 'id' in currentPricing && currentPricing.programId === program.id))
            .map((program: Program) => (
              <option key={program.id} value={program.id}>
                {program.name}
              </option>
            ))}
        </select>
      </div>
      {selectedProgram && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t("Flight Ticket Price")}</label>
              <input type="number" value={currentPricing.ticketAirline} onChange={(e) => setCurrentPricing(prev => ({ ...prev, ticketAirline: Number(e.target.value) }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t("Visa Fees")}</label>
              <input type="number" value={currentPricing.visaFees} onChange={(e) => setCurrentPricing(prev => ({ ...prev, visaFees: Number(e.target.value) }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t("Guide Fees")}</label>
              <input type="number" value={currentPricing.guideFees} onChange={(e) => setCurrentPricing(prev => ({ ...prev, guideFees: Number(e.target.value) }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
            </div>
          </div>

          <div className="mt-8">
            <h2 className="text-xl font-semibold mb-4">{t("Hotels")}</h2>
            {(currentPricing.allHotels || []).map((hotel, index) => (
              <div key={index} className="mb-6 p-4 border rounded-lg">
                <div className="flex justify-between items-center mb-3">
                  <div>
                    <h3 className="font-medium">{hotel.name}</h3>
                    <p className="text-sm text-gray-600">{hotel.city} - {hotel.nights} {t("nights")}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {Object.entries(hotel.PricePerNights).map(([type, price]) => (
                    <div key={type}>
                      <label className="block text-sm font-medium text-gray-700 mb-2">{t(type.charAt(0).toUpperCase() + type.slice(1))}</label>
                      <input type="number" min="0" step="any" value={price === 0 ? '' : price} onChange={(e) => handleHotelPriceChange(index, type, e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 flex justify-end">
            <button type="button" onClick={handleSave} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              {t('id' in currentPricing ? "Update Pricing" : "Save Pricing")}
            </button>
          </div>
        </>
      )}
      {programPricing.length > 0 && (
        <div className="mt-12">
          <h2 className="text-xl font-semibold mb-4">{t("Previous Pricing")}</h2>
          <div className="space-y-4">
            {[...programPricing].reverse().map((pricing: ProgramPricing) => (
              <div key={pricing.id} className="p-4 border rounded-lg">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-medium mb-2">{pricing.selectProgram}</h3>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>Flight Ticket: {pricing.ticketAirline}</div>
                      <div>Visa Fees: {pricing.visaFees}</div>
                      <div>Guide Fees: {pricing.guideFees}</div>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button onClick={() => handleEditPricing(pricing)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Pencil className="w-4 h-4" /></button>
                    <button onClick={() => handleDeletePricing(pricing.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
                <div className="mt-4">
                  <h4 className="font-medium mb-2 text-sm text-gray-600">Hotels</h4>
                  <div className="grid gap-4">
                    {(pricing.allHotels || []).map((hotel: HotelPrice, idx: number) => (
                      <div key={idx} className="text-sm border-t pt-2">
                        <div className="font-medium">{hotel.name} ({hotel.city} - {hotel.nights} {t("nights")})</div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-1 text-gray-600">
                          {(Object.entries(hotel.PricePerNights) as [string, number][]).map(([type, price]) => <div key={type}>{type}: {price}</div>)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
