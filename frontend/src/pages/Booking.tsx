import React, { useState, useEffect } from "react";
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
import BookingForm, { BookingFormData } from "../components/BookingForm";
import PaymentForm from "../components/PaymentForm";
import type { Booking, Payment } from "../context/AppContext";
import * as api from '../services/api';
import { toast } from "react-hot-toast";

export default function BookingPage() {
  const { t } = useTranslation();
  const { state, dispatch } = useAppContext();
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [editingPayment, setEditingPayment] = useState<{
    bookingId: string;
    payment: Payment;
  } | null>(null);
  const [selectedBookingForPayment, setSelectedBookingForPayment] = useState<
    Booking | null
  >(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [programFilter, setProgramFilter] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(false);

  // Effect to refresh bookings when program pricing changes
  useEffect(() => {
    const fetchBookings = async () => {
      try {
        setIsLoading(true);
        const bookings = await api.getBookings();
        dispatch({ type: 'SET_BOOKINGS', payload: bookings });
      } catch (error) {
        console.error('Error fetching bookings:', error);
        toast.error(t('Error fetching bookings'));
      } finally {
        setIsLoading(false);
      }
    };

    // Add programPricing to the dependency array to refresh when it changes
    fetchBookings();
  }, [dispatch, state.programPricing]);

  const filteredBookings = state.bookings.filter((booking) => {
    const matchesSearch =
      booking.clientNameFr.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.clientNameAr.includes(searchTerm) ||
      booking.passportNumber.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'paid' && booking.isFullyPaid) ||
      (statusFilter === 'pending' && !booking.isFullyPaid);

    const matchesProgram =
      programFilter === 'all' || booking.tripId === programFilter;

    return matchesSearch && matchesStatus && matchesProgram;
  });

  const handleAddBooking = () => {
    setEditingBooking(null);
    setIsBookingModalOpen(true);
  };

  const handleEditBooking = (booking: Booking) => {
    setEditingBooking(booking);
    setIsBookingModalOpen(true);
  };

  const handleDeleteBooking = async (bookingId: string) => {
    if (window.confirm("Are you sure you want to delete this booking?")) {
        try {
            await api.deleteBooking(bookingId);
            dispatch({ type: "DELETE_BOOKING", payload: bookingId });
        } catch (error) {
            console.error("Failed to delete booking", error);
        }
    }
  };

  const handleAddPayment = (booking: Booking) => {
    setSelectedBookingForPayment(booking);
    setEditingPayment(null);
    setIsPaymentModalOpen(true);
  };

  const handleEditPayment = (booking: Booking, payment: Payment) => {
    setSelectedBookingForPayment(booking);
    setEditingPayment({ bookingId: booking._id, payment });
    setIsPaymentModalOpen(true);
  };

  const handleDeletePayment = async (bookingId: string, paymentId: string) => {
    if (window.confirm("Are you sure you want to delete this payment?")) {
        try {
            const updatedBooking = await api.deletePayment(bookingId, paymentId);
            dispatch({ type: "DELETE_PAYMENT", payload: { bookingId, updatedBooking } });
        } catch (error) {
            console.error("Failed to delete payment", error);
        }
    }
  };

  const handleSaveBooking = async (bookingData: BookingFormData, initialPayments: Payment[]) => {
    try {
      const bookingToSave = {
        ...bookingData,
        advancePayments: initialPayments,
        remainingBalance: bookingData.sellingPrice - initialPayments.reduce((sum, p) => sum + p.amount, 0),
        isFullyPaid: false
      };

      if (editingBooking) {
        const updatedBooking = await api.updateBooking(editingBooking._id, bookingToSave);
        dispatch({ type: "UPDATE_BOOKING", payload: updatedBooking });
      } else {
        const newBooking = await api.createBooking(bookingToSave);
        dispatch({ type: "ADD_BOOKING", payload: newBooking });
      }
      setIsBookingModalOpen(false);
      setEditingBooking(null);
    } catch(error) {
      console.error("Failed to save booking", error);
      toast.error(t("Failed to save booking"));
    }
  };

  const handleSavePayment = async (payment: Omit<Payment, '_id' | 'id'>) => {
    if (selectedBookingForPayment) {
        try {
            let updatedBooking;
            if (editingPayment) {
                updatedBooking = await api.updatePayment(selectedBookingForPayment._id, editingPayment.payment._id, payment);
                dispatch({ type: "UPDATE_PAYMENT", payload: { bookingId: selectedBookingForPayment._id, updatedBooking } });
            } else {
                updatedBooking = await api.addPayment(selectedBookingForPayment._id, payment);
                dispatch({ type: "ADD_PAYMENT", payload: { bookingId: selectedBookingForPayment._id, updatedBooking } });
            }
        } catch(error) {
            console.error("Failed to save payment", error);
        }
    }
    setIsPaymentModalOpen(false);
    setSelectedBookingForPayment(null);
    setEditingPayment(null);
  };

  const getStatusColor = (isFullyPaid: boolean) => {
    return isFullyPaid
      ? "bg-emerald-100 text-emerald-700"
      : "bg-orange-100 text-orange-700";
  };

  const getStatusText = (isFullyPaid: boolean) => {
    return isFullyPaid ? "Fully Paid" : "Pending Payment";
  };

  if (state.loading) {
    return <div>Loading...</div>;
  }

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
          <select
            value={programFilter}
            onChange={(e) => setProgramFilter(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">{t("allPrograms")}</option>
            {state.programs.map((program) => (
              <option key={program._id} value={program._id}>
                {program.name}
              </option>
            ))}
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
                  (p) => p._id === booking.tripId
                );
                const totalPaid = booking.advancePayments.reduce(
                  (sum, payment) => sum + payment.amount,
                  0
                );

                return (
                  <tr
                    key={booking._id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                          <User className="w-5 h-5 text-white" />
                        </div>
                        <div className="ml-4">
                          {" "}
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
                        </span>{" "}
                        <div className="text-sm font-medium text-gray-900">
                          Paid: {totalPaid.toLocaleString()} MAD
                        </div>
                        <div className="text-sm text-gray-500">
                          Remaining: {booking.remainingBalance.toLocaleString()}{" "}
                          MAD
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col space-y-2">

                        <button
                          onClick={() => setSelectedBookingForPayment(booking)}
                          className="inline-flex items-center px-3 py-1 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          <CreditCard className="w-3 h-3 mr-1" />
                          {t("Manage Payments")}
                        </button>
                        <button
                          onClick={() => handleEditBooking(booking)}
                          className="inline-flex items-center px-3 py-1 text-xs bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                        >
                          <Edit2 className="w-3 h-3 mr-1" />
                          {t("Edit Booking")}
                        </button>
                        <button
                          onClick={() => handleDeleteBooking(booking._id)}
                          className="inline-flex items-center px-3 py-1 text-xs bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                        >
                          <Trash2 className="w-3 h-3 mr-1" />
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
      </Modal>{" "}
      {/* Payment Form Modal */}
      <Modal
        isOpen={isPaymentModalOpen}
        onClose={() => {
          setIsPaymentModalOpen(false);
          setSelectedBookingForPayment(null);
          setEditingPayment(null);
        }}
        title={editingPayment ? t("editPayment") : t("addPayment")}
        size="md"
        level={1}
      >
        {selectedBookingForPayment && (
          <PaymentForm
            payment={editingPayment?.payment}
            onSave={handleSavePayment}
            onCancel={() => {
              setIsPaymentModalOpen(false);
              setSelectedBookingForPayment(null);
              setEditingPayment(null);
            }}
            remainingBalance={
              selectedBookingForPayment.remainingBalance || 0
            }
          />
        )}
      </Modal>{" "}
      {/* Payment Management Modal */}
      <Modal
        isOpen={!!selectedBookingForPayment}
        onClose={() => {
            setSelectedBookingForPayment(null);
        }}
        title={t("managePayments")}
        size="xl"
        level={0}
      >
        {selectedBookingForPayment && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900">
                {selectedBookingForPayment.clientNameFr}
              </h3>
              <button
                onClick={() => handleAddPayment(selectedBookingForPayment)}
                className="inline-flex items-center px-3 py-1 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
              >
                <CreditCard className="w-4 h-4 mr-2" />
                {t("addPayment")}
              </button>
            </div>

            <div className="space-y-3" key={selectedBookingForPayment.advancePayments.length}>
              {selectedBookingForPayment.advancePayments.map((payment) => (
                <div
                  key={`<span class="math-inline">\{payment\.\_id\}\-</span>{payment.amount}`}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div>
                    <div className="flex items-center">
                      <span className="text-sm text-gray-900">
                        {payment.amount.toLocaleString()} MAD
                      </span>
                      <span className="mx-2 text-gray-400">•</span>
                      <span className="text-sm text-gray-600 capitalize">
                        {payment.method}
                      </span>
                      <span className="mx-2 text-gray-400">•</span>
                      <span className="text-sm text-gray-600">
                        {payment.date}
                      </span>
                    </div>
                    {payment.method === "cheque" && payment.chequeNumber && (
                      <div className="text-sm text-gray-500 mt-1">
                        <span className="font-medium">
                          Check #{payment.chequeNumber}
                        </span>
                        {payment.bankName && <span> • {payment.bankName}</span>}
                        {payment.chequeCashingDate && (
                          <span> • Cashing: {payment.chequeCashingDate}</span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() =>
                        handleEditPayment(selectedBookingForPayment, payment)
                      }
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() =>
                        handleDeletePayment(selectedBookingForPayment._id, payment._id)
                      }
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}

              {selectedBookingForPayment.advancePayments.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No payments recorded yet
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}