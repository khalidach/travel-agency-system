import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useAppContext } from "../context/AppContext";
import type { Program } from "../context/AppContext";
import { Pencil, Trash2 } from "lucide-react";

interface HotelPrice {
  name: string;
  city: string;
  nights: number;
  PricePerNights: {
    double: number;
    triple: number;
    quad: number;
    quintuple: number;
  };
}

interface ProgramCalculation {
  id: string;
  selectProgram: string;
  programId: string;
  ticketAirline: number;
  visaFees: number;
  guideFees: number;
  allHotels: HotelPrice[];
}

export default function ProgramCalculate() {
  const { t } = useTranslation();
  const { state } = useAppContext();
  const { programs } = state;

  const [calculations, setCalculations] = useState<ProgramCalculation[]>([]);
  const [currentCalculation, setCurrentCalculation] =
    useState<ProgramCalculation>({
      id: crypto.randomUUID(),
      selectProgram: "",
      programId: "",
      ticketAirline: 0,
      visaFees: 0,
      guideFees: 0,
      allHotels: [],
    });

  const [selectedProgram, setSelectedProgram] = useState<Program | null>(null);

  // Effect to update hotels when program is selected
  useEffect(() => {
    if (selectedProgram) {
      const hotelsList = selectedProgram.cities.flatMap((city) =>
        Object.values(selectedProgram.packages[0].hotels[city.name] || []).map(
          (hotelName) => ({
            name: hotelName,
            city: city.name,
            nights: city.nights,
            PricePerNights: {
              double: 0,
              triple: 0,
              quad: 0,
              quintuple: 0,
            },
          })
        )
      );

      setCurrentCalculation((prev) => ({
        ...prev,
        selectProgram: selectedProgram.name,
        programId: selectedProgram.id,
        allHotels: hotelsList,
      }));
    }
  }, [selectedProgram]);

  const handleProgramSelect = (programId: string) => {
    const program = programs.find((p) => p.id === programId);
    setSelectedProgram(program || null);
  };

  const handleEditCalculation = (calc: ProgramCalculation) => {
    const program = programs.find((p) => p.id === calc.programId);
    setSelectedProgram(program || null);
    setCurrentCalculation(calc);
  };

  const handleDeleteCalculation = (id: string) => {
    setCalculations((prev) => prev.filter((calc) => calc.id !== id));
  };

  const handleHotelPriceChange = (
    hotelIndex: number,
    roomType: string,
    value: number
  ) => {
    setCurrentCalculation((prev) => ({
      ...prev,
      allHotels: prev.allHotels.map((hotel, idx) =>
        idx === hotelIndex
          ? {
              ...hotel,
              PricePerNights: {
                ...hotel.PricePerNights,
                [roomType]: value,
              },
            }
          : hotel
      ),
    }));
  };

  const handleSave = () => {
    const isEditing = calculations.some((c) => c.id === currentCalculation.id);

    if (isEditing) {
      setCalculations((prev) =>
        prev.map((calc) =>
          calc.id === currentCalculation.id ? currentCalculation : calc
        )
      );
    } else {
      setCalculations((prev) => [
        ...prev,
        { ...currentCalculation, id: crypto.randomUUID() },
      ]);
    }

    // Reset form
    setCurrentCalculation({
      id: crypto.randomUUID(),
      selectProgram: "",
      programId: "",
      ticketAirline: 0,
      visaFees: 0,
      guideFees: 0,
      allHotels: [],
    });
    setSelectedProgram(null);
  };

  const calculatePrice = (roomType: string) => {
    if (!selectedProgram) return 0;

    const totalGuests =
      roomType === "double"
        ? 2
        : roomType === "triple"
        ? 3
        : roomType === "quad"
        ? 4
        : 5;

    const hotelCosts = selectedProgram.cities.reduce((total, city) => {
      const cityHotels = currentCalculation.allHotels.filter((hotel) =>
        selectedProgram.packages[0].hotels[city.name]?.includes(hotel.name)
      );

      const cityHotelCost = cityHotels.reduce(
        (acc, hotel) =>
          acc +
          hotel.PricePerNights[roomType as keyof typeof hotel.PricePerNights] *
            city.nights,
        0
      );

      return total + cityHotelCost;
    }, 0);

    const totalCost =
      currentCalculation.ticketAirline +
      (selectedProgram.type === "Umrah" ? currentCalculation.visaFees : 0) +
      currentCalculation.guideFees +
      hotelCosts;

    return Math.round(totalCost / totalGuests);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <h1 className="text-2xl font-bold mb-6">
        {t("Program Price Calculator")}
      </h1>

      {/* Program Selection */}
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
          {programs.map((program: Program) => (
            <option key={program.id} value={program.id}>
              {program.name}
            </option>
          ))}
        </select>
      </div>

      {selectedProgram && (
        <>
          {/* Basic Costs */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t("Flight Ticket Price")}
              </label>
              <input
                type="number"
                value={currentCalculation.ticketAirline}
                onChange={(e) =>
                  setCurrentCalculation((prev) => ({
                    ...prev,
                    ticketAirline: Number(e.target.value),
                  }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>

            {selectedProgram.type === "Umrah" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t("Visa Fees")}
                </label>
                <input
                  type="number"
                  value={currentCalculation.visaFees}
                  onChange={(e) =>
                    setCurrentCalculation((prev) => ({
                      ...prev,
                      visaFees: Number(e.target.value),
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t("Guide Fees")}
              </label>
              <input
                type="number"
                value={currentCalculation.guideFees}
                onChange={(e) =>
                  setCurrentCalculation((prev) => ({
                    ...prev,
                    guideFees: Number(e.target.value),
                  }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
          </div>

          {/* Hotels */}
          <div className="mt-8">
            <h2 className="text-xl font-semibold mb-4">{t("Hotels")}</h2>
            {currentCalculation.allHotels.map((hotel, index) => (
              <div key={index} className="mb-6 p-4 border rounded-lg">
                <div className="flex justify-between items-center mb-3">
                  <div>
                    <h3 className="font-medium">{hotel.name}</h3>
                    <p className="text-sm text-gray-600">
                      {hotel.city} - {hotel.nights} {t("nights")}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {Object.entries(hotel.PricePerNights).map(([type, price]) => (
                    <div key={type}>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {t(type.charAt(0).toUpperCase() + type.slice(1))}
                      </label>
                      <input
                        type="number"
                        value={price}
                        onChange={(e) =>
                          handleHotelPriceChange(
                            index,
                            type,
                            Number(e.target.value)
                          )
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Calculated Prices */}
          <div className="mt-8 p-4 bg-gray-50 rounded-lg">
            <h2 className="text-xl font-semibold mb-4">
              {t("Calculated Prices Per Person")}
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t("Double Room")}
                </label>
                <div className="text-lg font-semibold">
                  {calculatePrice("double")}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t("Triple Room")}
                </label>
                <div className="text-lg font-semibold">
                  {calculatePrice("triple")}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t("Quad Room")}
                </label>
                <div className="text-lg font-semibold">
                  {calculatePrice("quad")}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t("Quintuple Room")}
                </label>
                <div className="text-lg font-semibold">
                  {calculatePrice("quintuple")}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              {t(
                calculations.some((c) => c.id === currentCalculation.id)
                  ? "Update Calculation"
                  : "Save Calculation"
              )}
            </button>
          </div>
        </>
      )}

      {/* Previous Calculations */}
      {calculations.length > 0 && (
        <div className="mt-12">
          <h2 className="text-xl font-semibold mb-4">
            {t("Previous Calculations")}
          </h2>
          <div className="space-y-4">
            {calculations.map((calc) => (
              <div key={calc.id} className="p-4 border rounded-lg">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-medium mb-2">{calc.selectProgram}</h3>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>Flight Ticket: {calc.ticketAirline}</div>
                      <div>Visa Fees: {calc.visaFees}</div>
                      <div>Guide Fees: {calc.guideFees}</div>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleEditCalculation(calc)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteCalculation(calc.id)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="mt-4">
                  <h4 className="font-medium mb-2 text-sm text-gray-600">
                    Hotels
                  </h4>
                  <div className="grid gap-4">
                    {calc.allHotels.map((hotel, idx) => (
                      <div key={idx} className="text-sm border-t pt-2">
                        <div className="font-medium">
                          {hotel.name} ({hotel.city} - {hotel.nights}{" "}
                          {t("nights")})
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-1 text-gray-600">
                          {Object.entries(hotel.PricePerNights).map(
                            ([type, price]) => (
                              <div key={type}>
                                {type}: {price}
                              </div>
                            )
                          )}
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
