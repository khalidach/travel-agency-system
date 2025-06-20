import React from "react";
import { useTranslation } from "react-i18next";
import type { Booking, Program } from "../../context/models";
import {
  CreditCard,
  Edit2,
  Trash2,
  User,
  Users,
  MapPin,
  Hotel,
} from "lucide-react";

interface BookingTableProps {
  bookings: (Booking & { isRelated?: boolean })[];
  programs: Program[];
  onEditBooking: (booking: Booking) => void;
  onDeleteBooking: (bookingId: number) => void;
  onManagePayments: (booking: Booking) => void;
}

export default function BookingTable({
  bookings,
  programs,
  onEditBooking,
  onDeleteBooking,
  onManagePayments,
}: BookingTableProps) {
  const { t } = useTranslation();

  const getStatusColor = (isFullyPaid: boolean) =>
    isFullyPaid
      ? "bg-emerald-100 text-emerald-700"
      : "bg-orange-100 text-orange-700";

  const getStatusText = (isFullyPaid: boolean) =>
    t(isFullyPaid ? "Fully Paid" : "Pending Payment");

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Client
              </th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Program & Hotels
              </th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Price Details
              </th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Payment Status
              </th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {bookings.map((booking) => {
              const program = programs.find(
                (p) => p.id.toString() === (booking.tripId || "").toString()
              );
              const totalPaid = (booking.advancePayments || []).reduce(
                (sum, payment) => sum + Number(payment.amount),
                0
              );
              return (
                <tr
                  key={booking.id}
                  className={`hover:bg-gray-50 transition-colors ${
                    booking.isRelated ? "bg-blue-50" : ""
                  }`}
                >
                  <td
                    className={`px-6 py-4 align-top ${
                      booking.isRelated ? "pl-12" : ""
                    }`}
                  >
                    <div className="flex items-center">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                          booking.relatedPersons &&
                          booking.relatedPersons.length > 0
                            ? "bg-gradient-to-br from-purple-500 to-purple-600"
                            : "bg-gradient-to-br from-blue-500 to-blue-600"
                        }`}
                      >
                        {booking.isRelated ? (
                          <User className="w-5 h-5 text-white" />
                        ) : (
                          <Users className="w-5 h-5 text-white" />
                        )}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {booking.clientNameFr}
                        </div>
                        <div className="text-sm text-gray-500">
                          {booking.clientNameAr}
                        </div>
                        <div className="text-xs text-gray-400">
                          {booking.passportNumber}
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                          <span className="font-medium">Tel:</span>{" "}
                          {booking.phoneNumber}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 align-top">
                    <div className="space-y-2">
                      <div className="text-sm font-medium text-gray-900">
                        {program?.name || "Unknown Program"}
                      </div>
                      <div className="text-sm text-gray-500">
                        {booking.packageId} Package
                      </div>
                      <div className="space-y-1 mt-2">
                        {(booking.selectedHotel.cities || []).map(
                          (city, index) => {
                            const hotelName = (booking.selectedHotel
                              .hotelNames || [])[index];
                            const roomType = (booking.selectedHotel.roomTypes ||
                              [])[index];
                            if (!city || !hotelName) return null;
                            return (
                              <div
                                key={index}
                                className="flex items-center text-xs text-gray-600"
                              >
                                <MapPin className="w-3 h-3 mr-1 text-gray-400" />
                                <span className="font-medium">{city}:</span>
                                <Hotel className="w-3 h-3 ml-2 mr-1 text-gray-400" />
                                <span>
                                  {hotelName} ({roomType})
                                </span>
                              </div>
                            );
                          }
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 align-top">
                    <div className="text-sm text-gray-900">
                      Selling: {Number(booking.sellingPrice).toLocaleString()}{" "}
                      MAD
                    </div>
                    <div className="text-sm text-gray-500">
                      Base: {Number(booking.basePrice).toLocaleString()} MAD
                    </div>
                    <div className="text-sm text-emerald-600 font-medium">
                      Profit: {Number(booking.profit).toLocaleString()} MAD
                    </div>
                  </td>
                  <td className="px-6 py-4 align-top">
                    <div className="space-y-2">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                          booking.isFullyPaid
                        )}`}
                      >
                        {getStatusText(booking.isFullyPaid)}
                      </span>
                      <div className="text-sm font-medium text-gray-900">
                        Paid: {totalPaid.toLocaleString()} MAD
                      </div>
                      <div className="text-sm text-gray-500">
                        Remaining:{" "}
                        {Number(booking.remainingBalance).toLocaleString()} MAD
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 align-top">
                    <div className="flex flex-col space-y-2">
                      <button
                        onClick={() => onManagePayments(booking)}
                        className="inline-flex items-center justify-center px-3 py-1 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <CreditCard className="w-3 h-3 mr-1" />{" "}
                        {t("Manage Payments")}
                      </button>
                      <button
                        onClick={() => onEditBooking(booking)}
                        className="inline-flex items-center justify-center px-3 py-1 text-xs bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
                      >
                        <Edit2 className="w-3 h-3 mr-1" /> {t("Edit Booking")}
                      </button>
                      <button
                        onClick={() => onDeleteBooking(booking.id)}
                        className="inline-flex items-center justify-center px-3 py-1 text-xs bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                      >
                        <Trash2 className="w-3 h-3 mr-1" />{" "}
                        {t("Delete Booking")}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
