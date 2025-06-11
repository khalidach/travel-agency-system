import { useState, useEffect } from "react";
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

interface ProgramPricing {
  id: string;
  selectProgram: string;
  programId: string;
  ticketAirline: number;
  visaFees: number;
  guideFees: number;
  allHotels: HotelPrice[];
}

export default function ProgramPricing() {
  const { t } = useTranslation();
  const { state, dispatch } = useAppContext();
  const { programs, programPricing } = state;
  const [currentPricing, setCurrentPricing] = useState<ProgramPricing>({
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

      setCurrentPricing((prev) => ({
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

  const handleEditPricing = (pricing: ProgramPricing) => {
    const program = programs.find((p) => p.id === pricing.programId);
    setSelectedProgram(program || null);
    setCurrentPricing(pricing);
  };
  const handleDeletePricing = (id: string) => {
    dispatch({
      type: "DELETE_PROGRAM_PRICING",
      payload: id,
    });
  };

  const handleHotelPriceChange = (
    hotelIndex: number,
    roomType: string,
    value: number
  ) => {
    setCurrentPricing((prev) => ({
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
    const isEditing = programPricing.some((p) => p.id === currentPricing.id);

    if (isEditing) {
      dispatch({
        type: "UPDATE_PROGRAM_PRICING",
        payload: currentPricing,
      });
    } else {
      dispatch({
        type: "ADD_PROGRAM_PRICING",
        payload: { ...currentPricing, id: crypto.randomUUID() },
      });
    }

    // Reset form
    setCurrentPricing({
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

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <h1 className="text-2xl font-bold mb-6">{t("Program Pricing")}</h1>
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
                value={currentPricing.ticketAirline}
                onChange={(e) =>
                  setCurrentPricing((prev) => ({
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
                  value={currentPricing.visaFees}
                  onChange={(e) =>
                    setCurrentPricing((prev) => ({
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
                value={currentPricing.guideFees}
                onChange={(e) =>
                  setCurrentPricing((prev) => ({
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
            {currentPricing.allHotels.map((hotel, index) => (
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

          <div className="mt-6 flex justify-end">
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              {" "}
              {t(
                programPricing.some(
                  (p: ProgramPricing) => p.id === currentPricing.id
                )
                  ? "Update Pricing"
                  : "Save Pricing"
              )}
            </button>
          </div>
        </>
      )}{" "}
      {/* Previous Calculations */}
      {programPricing.length > 0 && (
        <div className="mt-12">
          <h2 className="text-xl font-semibold mb-4">
            {t("Previous Pricing")}
          </h2>
          <div className="space-y-4">
            {programPricing.map((pricing: ProgramPricing) => (
              <div key={pricing.id} className="p-4 border rounded-lg">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-medium mb-2">
                      {pricing.selectProgram}
                    </h3>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>Flight Ticket: {pricing.ticketAirline}</div>
                      <div>Visa Fees: {pricing.visaFees}</div>
                      <div>Guide Fees: {pricing.guideFees}</div>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleEditPricing(pricing)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeletePricing(pricing.id)}
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
                    {" "}
                    {pricing.allHotels.map((hotel: HotelPrice, idx: number) => (
                      <div key={idx} className="text-sm border-t pt-2">
                        <div className="font-medium">
                          {hotel.name} ({hotel.city} - {hotel.nights}{" "}
                          {t("nights")})
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-1 text-gray-600">
                          {(
                            Object.entries(hotel.PricePerNights) as [
                              string,
                              number
                            ][]
                          ).map(([type, price]) => (
                            <div key={type}>
                              {type}: {price}
                            </div>
                          ))}
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
