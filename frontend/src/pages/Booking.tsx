import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAppContext } from "../context/AppContext";
import {
  Plus,
  Edit2,
  Trash2,
  CreditCard,
  User,
  Calendar,
  DollarSign,
  MapPin,
  Hotel,
} from "lucide-react";
import Modal from "../components/Modal";
import BookingForm from "../components/BookingForm";
import PaymentForm from "../components/PaymentForm";
import type { Booking } from "../context/AppContext";
import { format } from "date-fns";

export default function BookingPage() {
  const { t } = useTranslation();
  const { state, dispatch } = useAppContext();
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [selectedBookingForPayment, setSelectedBookingForPayment] = useState<
    string | null
  >(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filteredBookings = state.bookings.filter((booking) => {
    const matchesSearch =
      booking.clientNameFr.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.clientNameAr.includes(searchTerm) ||
      booking.passportNumber.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "paid" && booking.isFullyPaid) ||
      (statusFilter === "pending" && !booking.isFullyPaid);

    return matchesSearch && matchesStatus;
  });

  const handleAddBooking = () => {
    setEditingBooking(null);
    setIsBookingModalOpen(true);
  };

  const handleEditBooking = (booking: Booking) => {
    setEditingBooking(booking);
    setIsBookingModalOpen(true);
  };

  const handleDeleteBooking = (bookingId: string) => {
    if (window.confirm("Are you sure you want to delete this booking?")) {
      dispatch({ type: "DELETE_BOOKING", payload: bookingId });
    }
  };

  const handleSaveBooking = (booking: Booking) => {
    if (editingBooking) {
      dispatch({ type: "UPDATE_BOOKING", payload: booking });
    } else {
      dispatch({
        type: "ADD_BOOKING",
        payload: { ...booking, id: Date.now().toString() },
      });
    }
    setIsBookingModalOpen(false);
    setEditingBooking(null);
  };

  const handleAddPayment = (bookingId: string) => {
    setSelectedBookingForPayment(bookingId);
    setIsPaymentModalOpen(true);
  };

  const handleSavePayment = (payment: any) => {
    if (selectedBookingForPayment) {
      dispatch({
        type: "ADD_PAYMENT",
        payload: {
          bookingId: selectedBookingForPayment,
          payment: { ...payment, id: Date.now().toString() },
        },
      });
    }
    setIsPaymentModalOpen(false);
    setSelectedBookingForPayment(null);
  };

  const getStatusColor = (isFullyPaid: boolean) => {
    return isFullyPaid
      ? "bg-emerald-100 text-emerald-700"
      : "bg-orange-100 text-orange-700";
  };

  const getStatusText = (isFullyPaid: boolean) => {
    return isFullyPaid ? "Fully Paid" : "Pending Payment";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t("booking")}</h1>
          <p className="text-gray-600 mt-2">
            Manage all customer bookings and payments
          </p>
        </div>
        <button
          onClick={handleAddBooking}
          className="mt-4 sm:mt-0 inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors shadow-sm"
        >
          <Plus className="w-5 h-5 mr-2" />
          {t("addBooking")}
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder={`${t("search")} bookings...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Status</option>
            <option value="paid">Fully Paid</option>
            <option value="pending">Pending Payment</option>
          </select>
        </div>
      </div>

      {/* Bookings Table */}
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
              {filteredBookings.map((booking) => {
                const program = state.programs.find(
                  (p) => p.id === booking.tripId
                );
                const totalPaid = booking.advancePayments.reduce(
                  (sum, payment) => sum + payment.amount,
                  0
                );

                return (
                  <tr
                    key={booking.id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                          <User className="w-5 h-5 text-white" />
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
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-2">
                        <div className="text-sm font-medium text-gray-900">
                          {program?.name || "Unknown Program"}
                        </div>
                        <div className="text-sm text-gray-500">
                          {booking.selectedHotel.roomType} Room
                        </div>

                        {/* Hotel Details by City */}
                        <div className="space-y-1">
                          {booking.selectedHotel.cities.map((city, index) => {
                            const hotelName =
                              booking.selectedHotel.hotelNames[index];
                            if (!city || !hotelName) return null;

                            return (
                              <div
                                key={index}
                                className="flex items-center text-xs text-gray-600"
                              >
                                <MapPin className="w-3 h-3 mr-1 text-gray-400" />
                                <span className="font-medium">{city}:</span>
                                <Hotel className="w-3 h-3 ml-2 mr-1 text-gray-400" />
                                <span>{hotelName}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        Selling: {booking.sellingPrice.toLocaleString()} MAD
                      </div>
                      <div className="text-sm text-gray-500">
                        Base: {booking.basePrice.toLocaleString()} MAD
                      </div>
                      <div className="text-sm text-emerald-600 font-medium">
                        Profit: {booking.profit.toLocaleString()} MAD
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-2">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                            booking.isFullyPaid
                          )}`}
                        >
                          {getStatusText(booking.isFullyPaid)}
                        </span>
                        <div className="text-xs text-gray-500">
                          Paid: {totalPaid.toLocaleString()} MAD
                        </div>
                        <div className="text-xs text-gray-500">
                          Remaining: {booking.remainingBalance.toLocaleString()}{" "}
                          MAD
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleAddPayment(booking.id)}
                          className="inline-flex items-center px-3 py-1 text-xs bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                        >
                          <CreditCard className="w-3 h-3 mr-1" />
                          {t("addPayment")}
                        </button>
                        <button
                          onClick={() => handleEditBooking(booking)}
                          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteBooking(booking.id)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
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

      {filteredBookings.length === 0 && (
        <div className="text-center py-12">
          <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Calendar className="w-12 h-12 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No bookings found
          </h3>
          <p className="text-gray-500 mb-6">
            Get started by creating your first booking.
          </p>
          <button
            onClick={handleAddBooking}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-5 h-5 mr-2" />
            {t("addBooking")}
          </button>
        </div>
      )}

      {/* Booking Form Modal */}
      <Modal
        isOpen={isBookingModalOpen}
        onClose={() => {
          setIsBookingModalOpen(false);
          setEditingBooking(null);
        }}
        title={editingBooking ? "Edit Booking" : t("addBooking")}
        size="xl"
      >
        <BookingForm
          booking={editingBooking}
          programs={state.programs}
          onSave={handleSaveBooking}
          onCancel={() => {
            setIsBookingModalOpen(false);
            setEditingBooking(null);
          }}
        />
      </Modal>

      {/* Payment Form Modal */}
      <Modal
        isOpen={isPaymentModalOpen}
        onClose={() => {
          setIsPaymentModalOpen(false);
          setSelectedBookingForPayment(null);
        }}
        title={t("addPayment")}
        size="md"
      >
        <PaymentForm
          onSave={handleSavePayment}
          onCancel={() => {
            setIsPaymentModalOpen(false);
            setSelectedBookingForPayment(null);
          }}
        />
      </Modal>
    </div>
  );
}
