// frontend/src/components/booking/BookingTable.tsx
import React from "react";
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
  Check,
  X,
} from "lucide-react";

// Define the shape of the family summary object
interface FamilySummary {
  totalPrice: number;
  totalPaid: number;
  totalRemaining: number;
}

interface BookingTableProps {
  // Replaced 'any' with the explicit 'FamilySummary' interface
  bookings: (Booking & {
    isRelated?: boolean;
    familySummary?: FamilySummary;
  })[];
  programs: Program[];
  selectedIds: number[];
  onSelectionChange: (id: number) => void;
  onSelectAllToggle: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isSelectAllOnPage: boolean;
  onEditBooking: (booking: Booking) => void;
  onDeleteBooking: (bookingId: number) => void;
  onManagePayments: (booking: Booking) => void;
  onUpdateStatus: (id: number, status: "confirmed" | "cancelled") => void;
}

export default function BookingTable({
  bookings,
  programs,
  selectedIds,
  onSelectionChange,
  onSelectAllToggle,
  isSelectAllOnPage,
  onEditBooking,
  onDeleteBooking,
  onManagePayments,
  onUpdateStatus,
}: BookingTableProps) {
  const { t } = useTranslation();
  const { state: authState } = useAuthContext();
  const currentUser = authState.user;

  const getStatusColor = (isFullyPaid: boolean) =>
    isFullyPaid
      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300"
      : "bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300";

  const getStatusText = (isFullyPaid: boolean) =>
    t(isFullyPaid ? "fullyPaid" : "pending");

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-700/50">
            <tr>
              <th className="px-4 py-4">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 bg-gray-100 dark:bg-gray-700"
                  checked={isSelectAllOnPage}
                  onChange={onSelectAllToggle}
                  aria-label="Select all bookings"
                />
              </th>
              <th className="px-6 py-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider text-left">
                {t("client")}
              </th>
              <th className="px-6 py-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider text-left ">
                {t("programAndHotels")}
              </th>
              <th
                className={`px-6 py-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider text-left`}
              >
                {t("priceDetails")}
              </th>
              <th
                className={`px-6 py-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider text-left`}
              >
                {t("paymentStatus")}
              </th>
              <th
                className={`px-6 py-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider text-left`}
              >
                {t("actions")}
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {bookings.map((booking, index) => {
              const program = programs.find(
                (p) => p.id.toString() === (booking.tripId || "").toString(),
              );
              const totalPaid = (booking.advancePayments || []).reduce(
                (sum, payment) => sum + Number(payment.amount),
                0,
              );

              const canModify =
                currentUser?.role === "admin" ||
                (currentUser?.role === "manager" &&
                  booking.employeeId === currentUser?.id) ||
                (currentUser?.role === "employee" &&
                  booking.employeeId === currentUser?.id);

              const canSelect =
                currentUser?.role === "admin" ||
                booking.employeeId === currentUser?.id;

              const nextBooking = bookings[index + 1];
              const isLastInFamilyGroup =
                !nextBooking || !nextBooking.isRelated;

              let familyLeader = null;
              if (isLastInFamilyGroup) {
                if (!booking.isRelated) {
                  familyLeader = booking;
                } else {
                  for (let i = index; i >= 0; i--) {
                    if (!bookings[i].isRelated) {
                      familyLeader = bookings[i];
                      break;
                    }
                  }
                }
              }

              const clientNameFr =
                `${booking.clientNameFr.lastName} ${booking.clientNameFr.firstName}`.trim();

              return (
                <React.Fragment key={booking.id}>
                  <tr
                    className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${booking.isRelated ? "bg-blue-50 dark:bg-blue-900/20" : ""
                      } ${selectedIds.includes(booking.id)
                        ? "bg-blue-100 dark:bg-blue-900/30"
                        : ""
                      }`}
                  >
                    <td className="px-4 py-4">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 disabled:bg-gray-200 dark:disabled:bg-gray-600 disabled:cursor-not-allowed bg-gray-100 dark:bg-gray-700"
                        checked={selectedIds.includes(booking.id)}
                        onChange={() => onSelectionChange(booking.id)}
                        disabled={!canSelect}
                        aria-label={`Select booking for ${clientNameFr}`}
                      />
                    </td>
                    <td
                      className={`px-3 py-4 align-top ${booking.isRelated ? "pl-12" : ""
                        }`}
                    >
                      <div className="flex items-center">
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${booking.relatedPersons &&
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
                          <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {clientNameFr}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {booking.clientNameAr}
                          </div>
                          <div className="text-xs text-gray-400 dark:text-gray-500">
                            {booking.passportNumber}
                          </div>
                          <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                            <span className="font-medium">
                              {t("phoneNumber")}:
                            </span>{" "}
                            {booking.phoneNumber}
                          </div>
                          {(currentUser?.role === "admin" ||
                            currentUser?.role === "manager") &&
                            booking.employeeName && (
                              <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 mt-1">
                                <Briefcase
                                  className={`w-3 h-3 text-gray-400 mr-1`}
                                />
                                <span>
                                  {t("addedBy")} {booking.employeeName}
                                </span>
                              </div>
                            )}
                        </div>
                      </div>
                    </td>
                    <td className="px-2 py-4 align-top">
                      <div className="space-y-2">
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {program?.name || t("unknownProgram")}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {booking.packageId} {t("package")}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {booking.variationName}
                        </div>
                        <div className="space-y-1 mt-2">
                          {(booking.selectedHotel.cities || []).map(
                            (city, index) => {
                              const hotelName = (booking.selectedHotel
                                .hotelNames || [])[index];
                              const roomType = (booking.selectedHotel
                                .roomTypes || [])[index];
                              if (!city || !hotelName) return null;
                              return (
                                <div
                                  key={index}
                                  className="flex items-center text-xs text-gray-600 dark:text-gray-400"
                                >
                                  <MapPin
                                    className={`w-3 h-3 text-gray-400 dark:text-gray-500 mr-1`}
                                  />
                                  <span className="font-medium">{city}:</span>
                                  <Hotel
                                    className={`ml-2 mr-1 w-3 h-3 text-gray-400 dark:text-gray-500`}
                                  />
                                  <span>
                                    {hotelName} ({roomType})
                                  </span>
                                </div>
                              );
                            },
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-2 py-4 align-top">
                      <div className="text-sm text-gray-900 dark:text-gray-100">
                        {t("selling")}:{" "}
                        {Number(booking.sellingPrice).toLocaleString()}{" "}
                        {t("mad")}
                      </div>
                    </td>
                    <td className="px-3 py-4 align-top">
                      <div className="space-y-2">
                        {booking.status === "pending_approval" && (
                          <div className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                            {t("pendingApproval") || "Pending Approval"}
                          </div>
                        )}
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                            booking.isFullyPaid,
                          )}`}
                        >
                          {getStatusText(booking.isFullyPaid)}
                        </span>
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {t("paid")}: {totalPaid.toLocaleString()} {t("mad")}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {t("remainingBalance")}:{" "}
                          {Number(booking.remainingBalance).toLocaleString()}{" "}
                          {t("mad")}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-4 align-top">
                      <div className="flex flex-col space-y-2">
                        {booking.status === "pending_approval" &&
                          (currentUser?.role === "admin" ||
                            currentUser?.role === "manager") && (
                            <div className="flex flex-col gap-1 mb-2 pb-2 border-b border-gray-100 dark:border-gray-700">
                              <button
                                onClick={() =>
                                  onUpdateStatus(booking.id, "confirmed")
                                }
                                className="inline-flex items-center justify-center px-3 py-1 text-xs bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                              >
                                <Check className="w-3 h-3 mr-1" />{" "}
                                {t("approve") || "Approve"}
                              </button>
                              <button
                                onClick={() =>
                                  onUpdateStatus(booking.id, "cancelled")
                                }
                                className="inline-flex items-center justify-center px-3 py-1 text-xs bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                              >
                                <X className="w-3 h-3 mr-1" />{" "}
                                {t("reject") || "Reject"}
                              </button>
                            </div>
                          )}

                        {booking.status !== "pending_approval" && (
                          <>
                            <button
                              onClick={() => onManagePayments(booking)}
                              disabled={!canModify}
                              className="inline-flex items-center justify-center px-3 py-1 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <CreditCard className={`w-3 h-3 mr-1 `} />{" "}
                              {t("managePayments")}
                            </button>
                            <button
                              onClick={() => onEditBooking(booking)}
                              disabled={!canModify}
                              className="inline-flex items-center justify-center px-3 py-1 text-xs bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <Edit2 className={`w-3 h-3 mr-1 `} />{" "}
                              {t("editBooking")}
                            </button>
                            <button
                              onClick={() => onDeleteBooking(booking.id)}
                              disabled={!canModify}
                              className="inline-flex items-center justify-center px-3 py-1 text-xs bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <Trash2 className={`w-3 h-3 mr-1`} />{" "}
                              {t("deleteBooking")}
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                  {isLastInFamilyGroup && familyLeader?.familySummary && (
                    <tr className="bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 font-medium">
                      <td></td>
                      <td
                        className="px-6 py-2 text-right text-sm text-gray-700 dark:text-gray-300"
                        colSpan={2}
                      >
                        {t("familyTotal")}
                      </td>
                      <td className="px-2 py-2 text-sm">
                        <div className="dark:text-gray-100">
                          {t("selling")}:{" "}
                          {familyLeader.familySummary.totalPrice.toLocaleString()}{" "}
                          {t("mad")}
                        </div>
                      </td>
                      <td className="px-3 py-2 align-top">
                        <div className="space-y-1">
                          <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {t("paid")}:{" "}
                            {familyLeader.familySummary.totalPaid.toLocaleString()}{" "}
                            {t("mad")}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {t("remainingBalance")}:{" "}
                            {familyLeader.familySummary.totalRemaining.toLocaleString()}{" "}
                            {t("mad")}
                          </div>
                        </div>
                      </td>
                      <td></td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
