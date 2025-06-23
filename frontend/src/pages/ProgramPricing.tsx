import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  Program,
  ProgramPricing,
  HotelPrice,
  PaginatedResponse,
} from "../context/models";
import {
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Plane,
  CreditCard,
  User,
  Hotel,
  BedDouble,
} from "lucide-react";
import * as api from "../services/api";
import { toast } from "react-hot-toast";
import { usePagination } from "../hooks/usePagination";
import { useAuthContext } from "../context/AuthContext";

const emptyPricing: Omit<ProgramPricing, "id"> = {
  selectProgram: "",
  programId: 0,
  ticketAirline: 0,
  visaFees: 0,
  guideFees: 0,
  allHotels: [],
};

export default function ProgramPricingPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { state: authState } = useAuthContext();
  const currentUser = authState.user;
  const [currentPage, setCurrentPage] = useState(1);
  const pricingPerPage = 6;

  const { data: programs = [], isLoading: isLoadingPrograms } = useQuery<
    Program[]
  >({
    queryKey: ["programs"],
    queryFn: () => api.getPrograms(1, 1000).then((res) => res.data),
  });

  const { data: pricingResponse, isLoading: isLoadingPricing } = useQuery<
    PaginatedResponse<ProgramPricing>
  >({
    queryKey: ["programPricing", currentPage, pricingPerPage],
    queryFn: () => api.getProgramPricing(currentPage, pricingPerPage),
  });

  const programPricing = pricingResponse?.data ?? [];
  const pagination = pricingResponse?.pagination;

  const { mutate: createPricing, isPending: isCreating } = useMutation({
    mutationFn: api.createProgramPricing,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["programPricing"] });
      toast.success("Pricing saved successfully.");
      setCurrentPricing(emptyPricing);
      setSelectedProgram(null);
    },
    onError: () => {
      toast.error("Failed to save pricing.");
    },
  });

  const { mutate: updatePricing, isPending: isUpdating } = useMutation({
    mutationFn: (data: ProgramPricing) =>
      api.updateProgramPricing(data.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["programPricing"] });
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      toast.success("Pricing updated successfully.");
      setCurrentPricing(emptyPricing);
      setSelectedProgram(null);
    },
    onError: () => {
      toast.error("Failed to update pricing.");
    },
  });

  const { mutate: deletePricing } = useMutation({
    mutationFn: api.deleteProgramPricing,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["programPricing"] });
      toast.success("Pricing deleted successfully.");
    },
    onError: () => {
      toast.error("Failed to delete pricing.");
    },
  });

  const [currentPricing, setCurrentPricing] = useState<
    ProgramPricing | Omit<ProgramPricing, "id">
  >(emptyPricing);
  const [selectedProgram, setSelectedProgram] = useState<Program | null>(null);

  const uniqueRoomTypesForProgram = useMemo(() => {
    if (!selectedProgram) return [];
    const allRoomTypeNames = new Set<string>();
    selectedProgram.packages.forEach((pkg) => {
      pkg.prices.forEach((price) => {
        price.roomTypes.forEach((rt) => allRoomTypeNames.add(rt.type));
      });
    });
    return Array.from(allRoomTypeNames);
  }, [selectedProgram]);

  const paginationRange = usePagination({
    currentPage,
    totalCount: pagination?.totalCount ?? 0,
    pageSize: pricingPerPage,
  });

  const handleProgramSelect = (programIdStr: string) => {
    const programId = parseInt(programIdStr, 10);
    const program = programs.find((p) => p.id === programId);
    if (!program) {
      setCurrentPricing(emptyPricing);
      setSelectedProgram(null);
      return;
    }

    const uniqueHotels = new Map<string, { city: string; nights: number }>();
    program.packages.forEach((pkg) => {
      (program.cities || []).forEach((city) => {
        (pkg.hotels[city.name] || []).forEach((hotelName) => {
          const key = `${city.name}-${hotelName}`;
          if (!uniqueHotels.has(key)) {
            uniqueHotels.set(key, { city: city.name, nights: city.nights });
          }
        });
      });
    });

    const hotelsList: HotelPrice[] = Array.from(uniqueHotels.entries()).map(
      ([key, data]) => {
        const [city, name] = key.split("-");
        return { name, city, nights: data.nights, PricePerNights: {} };
      }
    );

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
      toast.error("Associated program not found for this pricing.");
      return;
    }
    setSelectedProgram(program);
    setCurrentPricing({ ...pricing });
  };

  const handleDeletePricing = async (id: number) => {
    if (window.confirm("Are you sure you want to delete this pricing?")) {
      deletePricing(id);
    }
  };

  const handleHotelPriceChange = (
    hotelIndex: number,
    roomType: string,
    value: string
  ) => {
    setCurrentPricing((prev) => {
      const newHotels = [...(prev.allHotels || [])];
      if (!newHotels[hotelIndex].PricePerNights) {
        newHotels[hotelIndex].PricePerNights = {};
      }
      newHotels[hotelIndex].PricePerNights[roomType] =
        value === "" ? 0 : Number(value);
      return { ...prev, allHotels: newHotels };
    });
  };

  const handleSave = () => {
    const isEditing = "id" in currentPricing;
    if (isEditing) {
      updatePricing(currentPricing as ProgramPricing);
    } else {
      createPricing(currentPricing);
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "Hajj":
        return "bg-blue-100 text-blue-700";
      case "Umrah":
        return "bg-emerald-100 text-emerald-700";
      case "Tourism":
        return "bg-orange-100 text-orange-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  if (isLoadingPrograms || isLoadingPricing) {
    return <div>Loading...</div>;
  }

  return (
    <div className="mx-auto p-6 space-y-8">
      <h1 className="text-2xl font-bold mb-6">{t("programPricing")}</h1>
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select Program
        </label>
        <select
          value={selectedProgram?.id || ""}
          onChange={(e) => handleProgramSelect(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
        >
          <option value="">Select a program</option>
          {programs
            .filter(
              (program) =>
                !programPricing.some((p) => p.programId === program.id) ||
                (currentPricing &&
                  "id" in currentPricing &&
                  currentPricing.programId === program.id)
            )
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
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Flight Ticket Price
              </label>
              <input
                type="number"
                value={currentPricing.ticketAirline || ""}
                onChange={(e) =>
                  setCurrentPricing((prev) => ({
                    ...prev,
                    ticketAirline: Number(e.target.value),
                  }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Visa Fees
              </label>
              <input
                type="number"
                value={currentPricing.visaFees || ""}
                onChange={(e) =>
                  setCurrentPricing((prev) => ({
                    ...prev,
                    visaFees: Number(e.target.value),
                  }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Guide Fees
              </label>
              <input
                type="number"
                value={currentPricing.guideFees || ""}
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

          <div className="mt-8">
            <h2 className="text-xl font-semibold mb-4">Hotels</h2>
            {(currentPricing.allHotels || []).map((hotel, index) => (
              <div
                key={`${hotel.city}-${hotel.name}`}
                className="mb-6 p-4 border rounded-lg"
              >
                <div className="flex justify-between items-center mb-3">
                  <div>
                    <h3 className="font-medium">{hotel.name}</h3>
                    <p className="text-sm text-gray-600">
                      {hotel.city} - {hotel.nights} {t("nights")}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {uniqueRoomTypesForProgram.map((roomType) => (
                    <div key={roomType}>
                      <label className="block text-sm font-medium text-gray-700 mb-2 capitalize">
                        {t(roomType)} Price
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={hotel.PricePerNights?.[roomType] || ""}
                        onChange={(e) =>
                          handleHotelPriceChange(
                            index,
                            roomType,
                            e.target.value
                          )
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        placeholder="Price/Night"
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
              disabled={isCreating || isUpdating}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400"
            >
              {isCreating || isUpdating
                ? "Saving..."
                : "id" in currentPricing
                ? "Update Pricing"
                : "Save Pricing"}
            </button>
          </div>
        </>
      )}
      {programPricing.length > 0 && (
        <div className="mt-12">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {programPricing.map((pricing: ProgramPricing) => {
              const program = programs.find((p) => p.id === pricing.programId);
              const canModify =
                currentUser?.role === "admin" ||
                currentUser?.id === pricing.employeeId;
              return (
                <div
                  key={pricing.id}
                  className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col justify-between hover:shadow-md transition-all duration-200"
                >
                  <div>
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {pricing.selectProgram}
                        </h3>
                        {program && (
                          <span
                            className={`inline-block px-3 py-1 text-xs font-medium rounded-full mt-2 ${getTypeColor(
                              program.type
                            )}`}
                          >
                            {program.type}
                          </span>
                        )}
                      </div>
                      {canModify && (
                        <div className="flex space-x-1">
                          <button
                            onClick={() => handleEditPricing(pricing)}
                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeletePricing(pricing.id)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="space-y-3 mb-4">
                      <div className="flex items-center text-sm text-gray-600">
                        <Plane className="w-4 h-4 mr-2 text-gray-400" />
                        <span>
                          Flight Ticket:{" "}
                          <span className="font-medium text-gray-800">
                            {pricing.ticketAirline.toLocaleString()} MAD
                          </span>
                        </span>
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <CreditCard className="w-4 h-4 mr-2 text-gray-400" />
                        <span>
                          Visa Fees:{" "}
                          <span className="font-medium text-gray-800">
                            {pricing.visaFees.toLocaleString()} MAD
                          </span>
                        </span>
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <User className="w-4 h-4 mr-2 text-gray-400" />
                        <span>
                          Guide Fees:{" "}
                          <span className="font-medium text-gray-800">
                            {pricing.guideFees.toLocaleString()} MAD
                          </span>
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-auto pt-4 border-t border-gray-100 space-y-3">
                    <div className="flex items-center text-sm text-gray-600">
                      <Hotel className="w-4 h-4 mr-2 text-gray-400" />
                      <span>
                        Hotels:{" "}
                        <span className="font-medium text-gray-800">
                          {(pricing.allHotels || []).length}
                        </span>
                      </span>
                    </div>
                    {program && (
                      <div className="flex items-center text-sm text-gray-600">
                        <BedDouble className="w-4 h-4 mr-2 text-gray-400" />
                        <span>
                          Room Types:{" "}
                          <span className="font-medium text-gray-800">
                            {(() => {
                              const roomTypes = new Set<string>();
                              (program.packages || []).forEach((pkg) => {
                                (pkg.prices || []).forEach((price) => {
                                  (price.roomTypes || []).forEach((rt) => {
                                    roomTypes.add(rt.type);
                                  });
                                });
                              });
                              return roomTypes.size;
                            })()}
                          </span>
                        </span>
                      </div>
                    )}
                    {pricing.employeeName && (
                      <div className="flex items-center text-sm text-gray-600">
                        <User className="w-4 h-4 mr-2 text-gray-400" />
                        <span>
                          Added by:{" "}
                          <span className="font-medium text-gray-800">
                            {pricing.employeeName}
                          </span>
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          {pagination && pagination.totalPages > 1 && (
            <div className="flex justify-between items-center mt-6">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="inline-flex items-center px-3 py-1 text-sm bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 disabled:opacity-50"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Previous
              </button>
              <div className="flex items-center space-x-1">
                {paginationRange.map((page, i) =>
                  typeof page === "string" ? (
                    <span key={`dots-${i}`} className="px-3 py-1">
                      ...
                    </span>
                  ) : (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`px-3 py-1 text-sm rounded-lg ${
                        currentPage === page
                          ? "bg-blue-600 text-white"
                          : "bg-gray-100"
                      }`}
                    >
                      {page}
                    </button>
                  )
                )}
              </div>
              <button
                onClick={() =>
                  setCurrentPage((prev) =>
                    Math.min(prev + 1, pagination.totalPages)
                  )
                }
                disabled={currentPage === pagination.totalPages}
                className="inline-flex items-center px-3 py-1 text-sm bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 disabled:opacity-50"
              >
                Next
                <ChevronRight className="w-4 h-4 ml-1" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
