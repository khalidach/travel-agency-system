import { useTranslation } from "react-i18next";
import type { Booking, Program } from "../../context/models";
import { useAuthContext } from "../../context/AuthContext";
import {
  CreditCard,
  Edit2,
  Trash2,
  User,
  Users,
  MapPin,
  Hotel,
  Briefcase,
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
  const { state: authState } = useAuthContext();
  const currentUser = authState.user;

  const getStatusColor = (isFullyPaid: boolean) =>
    isFullyPaid
      ? "bg-emerald-100 text-emerald-700"
      : "bg-orange-100 text-orange-700";

  const getStatusText = (isFullyPaid: boolean) =>
    t(isFullyPaid ? "fullyPaid" : "pending");

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className={`px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider ${document.documentElement.dir === "rtl" ? "text-right" : "text-left"}`}>
                {t("client")}
              </th>
              <th className={`px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider ${document.documentElement.dir === "rtl" ? "text-right" : "text-left"}`}>
                {t("programAndHotels")}
              </th>
              <th className={`px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider ${document.documentElement.dir === "rtl" ? "text-right" : "text-left"}`}>
                {t("priceDetails")}
              </th>
              <th className={`px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider ${document.documentElement.dir === "rtl" ? "text-right" : "text-left"}`}>
                {t("paymentStatus")}
              </th>
              <th className={`px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider ${document.documentElement.dir === "rtl" ? "text-right" : "text-left"}`}>
                {t("actions")}
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

              // Determine if the current user can modify this booking
              const canModify =
                currentUser?.role === "admin" ||
                booking.employeeId === currentUser?.id;

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
                      <div
                        className={
                          document.documentElement.dir === "rtl"
                            ? "mr-4"
                            : "ml-4"
                        }
                      >
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
                          <span className="font-medium">
                            {t("phoneNumber")}:
                          </span>{" "}
                          {booking.phoneNumber}
                        </div>
                        {(currentUser?.role === "admin" ||
                          currentUser?.role === "manager") &&
                          booking.employeeName && (
                            <div className="flex items-center text-xs text-gray-500 mt-1">
                              <Briefcase className={`w-3 h-3 text-gray-400 ${document.documentElement.dir === "rtl" ? "ml-1" : "mr-1"}`} />
                              <span>
                                {t("addedBy")} {booking.employeeName}
                              </span>
                            </div>
                          )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 align-top">
                    <div className="space-y-2">
                      <div className="text-sm font-medium text-gray-900">
                        {program?.name || t("unknownProgram")}
                      </div>
                      <div className="text-sm text-gray-500">
                        {booking.packageId} {t("package")}
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
                                <MapPin className={`w-3 h-3 text-gray-400 ${document.documentElement.dir === "rtl" ? "ml-1" : "mr-1"}`} />
                                <span className="font-medium">{city}:</span>
                                <Hotel
                                  className={`${
                                    document.documentElement.dir === "rtl"
                                      ? "ml-1 mr-2"
                                      : "ml-2 mr-1"
                                  }w-3 h-3 text-gray-400`}
                                />
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
                      {t("selling")}:{" "}
                      {Number(booking.sellingPrice).toLocaleString()} {t("mad")}
                    </div>
                    {(currentUser?.role === "admin" ||
                      currentUser?.role === "manager") && (
                      <>
                        <div className="text-sm text-gray-500">
                          {t("base")}:{" "}
                          {Number(booking.basePrice).toLocaleString()}{" "}
                          {t("mad")}
                        </div>
                        <div className="text-sm text-emerald-600 font-medium">
                          {t("profit")}:{" "}
                          {Number(booking.profit).toLocaleString()} {t("mad")}
                        </div>
                      </>
                    )}
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
                        {t("paid")}: {totalPaid.toLocaleString()} {t("mad")}
                      </div>
                      <div className="text-sm text-gray-500">
                        {t("remainingBalance")}:{" "}
                        {Number(booking.remainingBalance).toLocaleString()}{" "}
                        {t("mad")}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 align-top">
                    <div className="flex flex-col space-y-2">
                      <button
                        onClick={() => onManagePayments(booking)}
                        disabled={!canModify}
                        className="inline-flex items-center justify-center px-3 py-1 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <CreditCard className={`w-3 h-3 ${document.documentElement.dir === "rtl" ? "ml-1" : "mr-1"}`} />{" "}
                        {t("managePayments")}
                      </button>
                      <button
                        onClick={() => onEditBooking(booking)}
                        disabled={!canModify}
                        className="inline-flex items-center justify-center px-3 py-1 text-xs bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Edit2 className={`w-3 h-3 ${document.documentElement.dir === "rtl" ? "ml-1" : "mr-1"}`} /> {t("editBooking")}
                      </button>
                      <button
                        onClick={() => onDeleteBooking(booking.id)}
                        disabled={!canModify}
                        className="inline-flex items-center justify-center px-3 py-1 text-xs bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Trash2 className={`w-3 h-3 ${document.documentElement.dir === "rtl" ? "ml-1" : "mr-1"}`} /> {t("deleteBooking")}
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
