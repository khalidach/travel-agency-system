// frontend/src/components/employee/ProgramBookingsModal.tsx
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import Modal from "../Modal";
import { useQuery } from "@tanstack/react-query";
import * as api from "../../services/api";
import LoadingSpinner from "../ui/LoadingSpinner";
import PaginationControls from "../ui/PaginationControls"; // NEW IMPORT
import { DollarSign, Calendar, User } from "lucide-react";

const ITEMS_PER_PAGE = 10; // Set the limit for pagination

interface ProgramBookingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  username: string;
  programId: number;
  programName: string;
  startDate?: string;
  endDate?: string;
}

interface BookingDetail {
  id: number;
  fullName: string;
  sellingPrice: number;
  createdAt: string;
}

interface PaginatedBookingsResponse {
  bookings: BookingDetail[];
  totalCount: number;
  currentPage: number;
  limit: number;
  totalPages: number;
}

export default function ProgramBookingsModal({
  isOpen,
  onClose,
  username,
  programId,
  programName,
  startDate,
  endDate,
}: ProgramBookingsModalProps) {
  const { t } = useTranslation();
  const [currentPage, setCurrentPage] = useState(1); // NEW State for pagination

  // Reset page when modal opens/closes or filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [isOpen, programId, startDate, endDate]);

  const { data: bookingData, isLoading } = useQuery<PaginatedBookingsResponse>({
    queryKey: [
      "employeeProgramBookings",
      username,
      programId,
      currentPage, // Add page to query key
      ITEMS_PER_PAGE,
      startDate,
      endDate,
    ],
    queryFn: () =>
      api.getEmployeeProgramBookings(
        username,
        programId,
        currentPage,
        ITEMS_PER_PAGE,
        startDate,
        endDate,
      ),
    enabled: isOpen && !!username && !!programId,
  });

  if (!isOpen) return null;

  const bookings = bookingData?.bookings || [];
  const totalCount = bookingData?.totalCount || 0;
  const totalPages = bookingData?.totalPages || 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`${t("bookings")} for ${programName} by ${username}`}
      size="lg"
    >
      <div className="space-y-4">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center p-8">
            <LoadingSpinner className="w-8 h-8 text-blue-500" />
            <span className="ml-3 mt-2 text-gray-600 dark:text-gray-400">
              Loading bookings...
            </span>
          </div>
        ) : (
          <>
            <div className="bg-white dark:bg-gray-800 rounded-lg overflow-hidden border dark:border-gray-700">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      <User className="w-4 h-4 inline mr-2" />
                      {t("clientName")}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      <Calendar className="w-4 h-4 inline mr-2" />
                      {t("dateOfBooking")}
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      <DollarSign className="w-4 h-4 inline mr-2" />
                      {t("sellingPrice")}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {bookings.map((booking) => (
                    <tr
                      key={booking.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700/50"
                    >
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                        {booking.fullName}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                        {new Date(booking.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-right text-blue-600 dark:text-blue-400">
                        {booking.sellingPrice.toLocaleString()} {t("mad")}
                      </td>
                    </tr>
                  ))}
                  {bookings.length === 0 && (
                    <tr>
                      <td
                        colSpan={3}
                        className="text-center py-8 text-gray-500 dark:text-gray-400"
                      >
                        No bookings found for this program in the selected date
                        range.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <PaginationControls
              currentPage={currentPage}
              totalPages={totalPages}
              totalCount={totalCount}
              limit={ITEMS_PER_PAGE}
              onPageChange={setCurrentPage}
            />
          </>
        )}
      </div>
    </Modal>
  );
}
