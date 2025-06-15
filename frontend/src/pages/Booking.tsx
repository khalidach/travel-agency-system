import React, { useState, useEffect, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useParams, useNavigate } from "react-router-dom";
import { useAppContext } from "../context/AppContext";
import {
  Plus,
  Edit2,
  Trash2,
  CreditCard,
  User,
  Calendar,
  Download,
  Upload,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Hotel
} from "lucide-react";
import Modal from "../components/Modal";
import BookingForm, { BookingFormData } from "../components/BookingForm";
import PaymentForm from "../components/PaymentForm";
import type { Booking, Payment } from "../context/AppContext";
import * as api from '../services/api';
import { toast } from "react-hot-toast";

// Helper hook for advanced pagination logic
const usePagination = ({
  totalCount,
  pageSize,
  siblingCount = 1,
  currentPage
}: {
  totalCount: number;
  pageSize: number;
  siblingCount?: number;
  currentPage: number;
}) => {
  const paginationRange = useMemo(() => {
    const totalPageCount = Math.ceil(totalCount / pageSize);

    const totalPageNumbers = siblingCount + 5;

    if (totalPageNumbers >= totalPageCount) {
      return Array.from({ length: totalPageCount }, (_, i) => i + 1);
    }

    const leftSiblingIndex = Math.max(currentPage - siblingCount, 1);
    const rightSiblingIndex = Math.min(
      currentPage + siblingCount,
      totalPageCount
    );

    const shouldShowLeftDots = leftSiblingIndex > 2;
    const shouldShowRightDots = rightSiblingIndex < totalPageCount - 2;

    const firstPageIndex = 1;
    const lastPageIndex = totalPageCount;

    if (!shouldShowLeftDots && shouldShowRightDots) {
      let leftItemCount = 3 + 2 * siblingCount;
      let leftRange = Array.from({ length: leftItemCount }, (_, i) => i + 1);
      return [...leftRange, '...', totalPageCount];
    }

    if (shouldShowLeftDots && !shouldShowRightDots) {
      let rightItemCount = 3 + 2 * siblingCount;
      let rightRange = Array.from({ length: rightItemCount }, (_, i) => totalPageCount - rightItemCount + i + 1);
      return [firstPageIndex, '...', ...rightRange];
    }

    if (shouldShowLeftDots && shouldShowRightDots) {
      let middleRange = Array.from({ length: rightSiblingIndex - leftSiblingIndex + 1 }, (_, i) => leftSiblingIndex + i);
      return [firstPageIndex, '...', ...middleRange, '...', lastPageIndex];
    }
    
    return []; // Default empty array
  }, [totalCount, pageSize, siblingCount, currentPage]);

  return paginationRange;
};


export default function BookingPage() {
  const { t } = useTranslation();
  const { state, dispatch } = useAppContext();
  const { programId } = useParams<{ programId?: string }>();
  const navigate = useNavigate();
  
  // State for managing modals and UI
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [editingPayment, setEditingPayment] = useState<{
    bookingId: number; // Changed from string to number
    payment: Payment;
  } | null>(null);
  const [selectedBookingForPayment, setSelectedBookingForPayment] = useState<
    Booking | null
  >(null);
  
  // State for filtering and searching
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [programFilter, setProgramFilter] = useState<string>(programId || "all");
  
  // State for async operations
  const [isExporting, setIsExporting] = useState(false);

  // State for pagination
  const [currentPage, setCurrentPage] = useState(1);
  const bookingsPerPage = 10;
  
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);


  useEffect(() => {
    setProgramFilter(programId || 'all');
  }, [programId]);
  
  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, programFilter]);

  const handleProgramFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newProgramId = e.target.value;
    setProgramFilter(newProgramId);
    navigate(newProgramId === 'all' ? '/booking' : `/booking/program/${newProgramId}`);
  };

  const filteredBookings = state.bookings.filter((booking) => {
    const lowerSearchTerm = searchTerm.toLowerCase();
    const matchesSearch =
      booking.clientNameFr.toLowerCase().includes(lowerSearchTerm) ||
      (booking.clientNameAr || '').includes(searchTerm) || // Added null check
      booking.passportNumber.toLowerCase().includes(lowerSearchTerm);

    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'paid' && booking.isFullyPaid) ||
      (statusFilter === 'pending' && !booking.isFullyPaid);

    const matchesProgram =
      programFilter === 'all' || (booking.tripId || '').toString() === programFilter; // Added null check and toString()

    return matchesSearch && matchesStatus && matchesProgram;
  });

  // Calculate summary stats for the filtered bookings
  const summaryStats = useMemo(() => {
    const stats = {
      totalBookings: filteredBookings.length,
      totalRevenue: 0,
      totalCost: 0,
      totalPaid: 0,
    };

    for (const booking of filteredBookings) {
      stats.totalRevenue += Number(booking.sellingPrice); // Ensured number conversion
      stats.totalCost += Number(booking.basePrice); // Ensured number conversion
      stats.totalPaid += (booking.advancePayments || []).reduce((sum, p) => sum + Number(p.amount), 0); // Ensured number conversion and null check
    }

    return {
      ...stats,
      totalProfit: stats.totalRevenue - stats.totalCost,
      totalRemaining: stats.totalRevenue - stats.totalPaid,
    };
  }, [filteredBookings]);

  // Pagination Logic
  const reversedBookings = useMemo(() => [...filteredBookings].reverse(), [filteredBookings]);
  const indexOfLastBooking = currentPage * bookingsPerPage;
  const indexOfFirstBooking = indexOfLastBooking - bookingsPerPage;
  const currentBookings = useMemo(() => 
    reversedBookings.slice(indexOfFirstBooking, indexOfLastBooking),
    [reversedBookings, indexOfFirstBooking, indexOfLastBooking]
  );
  const totalPages = Math.ceil(filteredBookings.length / bookingsPerPage);

  const paginationRange = usePagination({
    currentPage,
    totalCount: filteredBookings.length,
    pageSize: bookingsPerPage
  });

  const paginate = (pageNumber: number) => {
    if (pageNumber > 0 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber);
    }
  };

  const selectedProgram = programId ? state.programs.find(p => p.id.toString() === programId) : null; // Changed _id to id and added toString()
  const pageTitle = selectedProgram
    ? `${t("booking")} for ${selectedProgram.name}`
    : t("booking");
  const pageDescription = selectedProgram
    ? `View all bookings, payments, and financial details for ${selectedProgram.name}.`
    : "Manage all customer bookings and payments";

  const handleAddBooking = () => {
    setEditingBooking(null);
    setIsBookingModalOpen(true);
  };

  const handleEditBooking = (booking: Booking) => {
    setEditingBooking(booking);
    setIsBookingModalOpen(true);
  };

  const handleDeleteBooking = async (bookingId: number) => { // Changed to number
    if (window.confirm("Are you sure you want to delete this booking?")) {
      try {
        await api.deleteBooking(bookingId);
        dispatch({ type: "DELETE_BOOKING", payload: bookingId });
        toast.success('Booking deleted!');
      } catch (error) {
        toast.error('Failed to delete booking.');
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
    setEditingPayment({ bookingId: booking.id, payment }); // Changed _id to id
    setIsPaymentModalOpen(true);
  };

  const handleDeletePayment = async (bookingId: number, paymentId: string) => { // Changed bookingId to number
    if (window.confirm("Are you sure you want to delete this payment?")) {
      try {
        const updatedBooking = await api.deletePayment(bookingId, paymentId);
        dispatch({ type: "DELETE_PAYMENT", payload: { bookingId, updatedBooking } });
        setSelectedBookingForPayment(updatedBooking);
        toast.success('Payment deleted!');
      } catch (error) {
        toast.error('Failed to delete payment.');
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
        isFullyPaid: (bookingData.sellingPrice - initialPayments.reduce((sum, p) => sum + p.amount, 0)) <= 0, // Recalculate isFullyPaid
      };

      if (editingBooking) {
        const updatedBooking = await api.updateBooking(editingBooking.id, bookingToSave); // Changed _id to id
        dispatch({ type: "UPDATE_BOOKING", payload: updatedBooking });
        toast.success('Booking updated!');
      } else {
        const newBooking = await api.createBooking(bookingToSave);
        dispatch({ type: "ADD_BOOKING", payload: newBooking });
        toast.success('Booking created!');
      }
      setIsBookingModalOpen(false);
      setEditingBooking(null);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to save booking";
      toast.error(errorMessage);
      console.error("Failed to save booking", error);
    }
  };

  const handleSavePayment = async (payment: Omit<Payment, '_id' | 'id'>) => {
    if (selectedBookingForPayment) {
      try {
        let updatedBooking;
        if (editingPayment) {
          updatedBooking = await api.updatePayment(selectedBookingForPayment.id, editingPayment.payment._id, payment); // Changed _id to id
          dispatch({ type: "UPDATE_PAYMENT", payload: { bookingId: selectedBookingForPayment.id, updatedBooking } }); // Changed _id to id
        } else {
          updatedBooking = await api.addPayment(selectedBookingForPayment.id, payment); // Changed _id to id
          dispatch({ type: "ADD_PAYMENT", payload: { bookingId: selectedBookingForPayment.id, updatedBooking } }); // Changed _id to id
        }
        setSelectedBookingForPayment(updatedBooking);
        toast.success('Payment saved!');
      } catch (error) {
        toast.error('Failed to save payment.');
        console.error("Failed to save payment", error);
      }
    }
    setIsPaymentModalOpen(false);
    setEditingPayment(null);
  };

  const handleExport = async () => {
    if (programFilter === 'all' || isExporting) {
      toast.error('Please select a specific program to export.');
      return;
    }

    setIsExporting(true);
    toast.loading('Exporting to Excel...');

    try {
      const program = state.programs.find(p => p.id.toString() === programFilter); // Changed _id to id and added toString()
      const blob = await api.exportBookingsToExcel(programFilter);

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const fileName = program ? `${program.name.replace(/\s/g, '_')}_bookings.xlsx` : 'bookings.xlsx';
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      toast.dismiss();
      toast.success('Export successful!');

    } catch (error) {
      toast.dismiss();
      const errorMessage = error instanceof Error ? error.message : 'Failed to export bookings.';
      toast.error(errorMessage);
      console.error("Failed to export bookings", error);
    } finally {
      setIsExporting(false);
    }
  };

  const getStatusColor = (isFullyPaid: boolean) => {
    return isFullyPaid ? "bg-emerald-100 text-emerald-700" : "bg-orange-100 text-orange-700";
  };

  const getStatusText = (isFullyPaid: boolean) => {
    return t(isFullyPaid ? "Fully Paid" : "Pending Payment");
  };
  
  const handleExportTemplate = async () => {
    toast.loading('Generating template...');
    try {
      const blob = await api.exportBookingTemplate();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'Booking_Template.xlsx';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.dismiss();
      toast.success('Template downloaded!');
    } catch (error) {
      toast.dismiss();
      toast.error('Failed to download template.');
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImportFile(e.target.files[0]);
    }
  };

  const handleImport = async () => {
    if (!importFile) {
      toast.error("Please select a file to import.");
      return;
    }
    setIsImporting(true);
    toast.loading('Importing bookings...');
    try {
      const result = await api.importBookings(importFile);
      // Refresh bookings list after import
      const updatedBookings = await api.getBookings();
      dispatch({ type: "SET_BOOKINGS", payload: updatedBookings });

      toast.dismiss();
      toast.success(result.message);
    } catch (error) {
      toast.dismiss();
      const errorMessage = error instanceof Error ? error.message : 'Import failed.';
      toast.error(errorMessage);
    } finally {
      setImportFile(null);
      if(fileInputRef.current) fileInputRef.current.value = "";
      setIsImporting(false);
    }
  };


  return (
    <div className="space-y-6">
      {state.loading ? (
        <div className="flex items-center justify-center h-full">Loading...</div>
      ) : (
        <>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{pageTitle}</h1>
            <p className="text-gray-600 mt-2">{pageDescription}</p>
          </div>
          <div className="mt-4 sm:mt-0 flex items-center gap-x-3">
            <button
              onClick={handleExportTemplate}
              className="inline-flex items-center px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors shadow-sm"
            >
              <Download className="w-5 h-5 mr-2" />
              Template
            </button>
            
            <input type="file" accept=".xlsx" ref={fileInputRef} onChange={handleFileSelect} style={{ display: 'none' }} />
            
            {importFile ? (
                <button
                  onClick={handleImport}
                  disabled={isImporting}
                  className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors shadow-sm disabled:bg-gray-400"
                >
                  <Upload className="w-5 h-5 mr-2"/>
                  {isImporting ? 'Uploading...' : 'Upload File'}
                </button>
            ) : (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors shadow-sm"
              >
                <Upload className="w-5 h-5 mr-2"/>
                Import
              </button>
            )}

            <button
              onClick={handleAddBooking}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors shadow-sm"
            >
              <Plus className="w-5 h-5 mr-2" />
              {t("addBooking")}
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        {filteredBookings.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 text-center">
            <div className="bg-white p-4 rounded-xl shadow-sm border">
                <p className="text-sm font-medium text-gray-500">Total Bookings</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{summaryStats.totalBookings}</p>
            </div>
            <div className="bg-white p-4 rounded-xl shadow-sm border">
                <p className="text-sm font-medium text-gray-500">Total Revenue</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{summaryStats.totalRevenue.toLocaleString()} <span className="text-sm">MAD</span></p>
            </div>
            <div className="bg-white p-4 rounded-xl shadow-sm border">
                <p className="text-sm font-medium text-gray-500">Total Cost</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{summaryStats.totalCost.toLocaleString()} <span className="text-sm">MAD</span></p>
            </div>
            <div className="bg-white p-4 rounded-xl shadow-sm border">
                <p className="text-sm font-medium text-gray-500">Total Profit</p>
                <p className="text-2xl font-bold text-emerald-600 mt-1">{summaryStats.totalProfit.toLocaleString()} <span className="text-sm">MAD</span></p>
            </div>
            <div className="bg-white p-4 rounded-xl shadow-sm border">
                <p className="text-sm font-medium text-gray-500">Total Paid</p>
                <p className="text-2xl font-bold text-blue-600 mt-1">{summaryStats.totalPaid.toLocaleString()} <span className="text-sm">MAD</span></p>
            </div>
            <div className="bg-white p-4 rounded-xl shadow-sm border">
                <p className="text-sm font-medium text-gray-500">Total Remaining</p>
                <p className="text-2xl font-bold text-orange-600 mt-1">{summaryStats.totalRemaining.toLocaleString()} <span className="text-sm">MAD</span></p>
            </div>
        </div>
        )}

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
              onChange={handleProgramFilterChange}
              className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">{t("allPrograms")}</option>
              {state.programs.map((program) => (
                <option key={program.id} value={program.id}> {/* Changed _id to id */}
                  {program.name}
                </option>
              ))}
            </select>
            <button
              onClick={handleExport}
              disabled={programFilter === 'all' || isExporting}
              className="inline-flex items-center px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors shadow-sm disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              <Download className="w-4 h-4 mr-2"/>
              {isExporting ? 'Exporting...' : 'Export to Excel'}
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Program & Hotels</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price Details</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment Status</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {currentBookings.map((booking) => {
                  const program = state.programs.find((p) => p.id.toString() === (booking.tripId || '').toString()); // Changed _id to id and added toString()
                  const totalPaid = (booking.advancePayments || []).reduce((sum, payment) => sum + Number(payment.amount), 0); // Added null check and ensured number conversion
                  return (
                    <tr key={booking.id} className="hover:bg-gray-50 transition-colors"> {/* Changed _id to id */}
                      <td className="px-6 py-4 align-top">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                            <User className="w-5 h-5 text-white" />
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{booking.clientNameFr}</div>
                            <div className="text-sm text-gray-500">{booking.clientNameAr}</div>
                            <div className="text-xs text-gray-400">{booking.passportNumber}</div>
                            <div className="text-xs text-gray-400 mt-1"><span className="font-medium">Tel:</span> {booking.phoneNumber}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 align-top">
                        <div className="space-y-2">
                          <div className="text-sm font-medium text-gray-900">{program?.name || "Unknown Program"}</div>
                          <div className="text-sm text-gray-500">{booking.packageId} Package</div>
                          <div className="space-y-1 mt-2">
                            {(booking.selectedHotel.cities || []).map((city, index) => { // Added null check
                              const hotelName = (booking.selectedHotel.hotelNames || [])[index]; // Added null check
                              const roomType = (booking.selectedHotel.roomTypes || [])[index];
                              if (!city || !hotelName) return null;
                              return (
                                <div key={index} className="flex items-center text-xs text-gray-600">
                                  <MapPin className="w-3 h-3 mr-1 text-gray-400" />
                                  <span className="font-medium">{city}:</span>
                                  <Hotel className="w-3 h-3 ml-2 mr-1 text-gray-400" />
                                  <span>{hotelName} ({roomType})</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 align-top">
                        <div className="text-sm text-gray-900">Selling: {Number(booking.sellingPrice).toLocaleString()} MAD</div>
                        <div className="text-sm text-gray-500">Base: {Number(booking.basePrice).toLocaleString()} MAD</div>
                        <div className="text-sm text-emerald-600 font-medium">Profit: {Number(booking.profit).toLocaleString()} MAD</div>
                      </td>
                      <td className="px-6 py-4 align-top">
                        <div className="space-y-2">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(booking.isFullyPaid)}`}>
                            {getStatusText(booking.isFullyPaid)}
                          </span>
                          <div className="text-sm font-medium text-gray-900">Paid: {totalPaid.toLocaleString()} MAD</div>
                          <div className="text-sm text-gray-500">Remaining: {Number(booking.remainingBalance).toLocaleString()} MAD</div> {/* Ensured number conversion */}
                        </div>
                      </td>
                      <td className="px-6 py-4 align-top">
                        <div className="flex flex-col space-y-2">
                          <button onClick={() => setSelectedBookingForPayment(booking)} className="inline-flex items-center justify-center px-3 py-1 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                            <CreditCard className="w-3 h-3 mr-1" /> {t("Manage Payments")}
                          </button>
                          <button onClick={() => handleEditBooking(booking)} className="inline-flex items-center justify-center px-3 py-1 text-xs bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors">
                            <Edit2 className="w-3 h-3 mr-1" /> {t("Edit Booking")}
                          </button>
                          <button onClick={() => handleDeleteBooking(booking.id)} className="inline-flex items-center justify-center px-3 py-1 text-xs bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
                            <Trash2 className="w-3 h-3 mr-1" /> {t("Delete Booking")}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex justify-between items-center py-3 px-6 border-t border-gray-200">
              <button 
                onClick={() => paginate(currentPage - 1)} 
                disabled={currentPage === 1} 
                className="inline-flex items-center px-3 py-1 text-sm bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4 mr-1"/>
                Previous
              </button>
              
              <div className="flex items-center space-x-1">
                {paginationRange.map((pageNumber, index) => {
                  if (typeof pageNumber === 'string') {
                    return <span key={index} className="px-3 py-1 text-sm text-gray-400">...</span>;
                  }
                  return (
                    <button
                      key={index}
                      onClick={() => paginate(pageNumber)}
                      className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                        currentPage === pageNumber
                          ? 'bg-blue-600 text-white font-bold shadow-sm'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {pageNumber}
                    </button>
                  );
                })}
              </div>

              <button 
                onClick={() => paginate(currentPage + 1)} 
                disabled={currentPage === totalPages} 
                className="inline-flex items-center px-3 py-1 text-sm bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
                <ChevronRight className="w-4 h-4 ml-1"/>
              </button>
            </div>
          )}
        </div>

        {filteredBookings.length === 0 && (
          <div className="text-center py-12">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Calendar className="w-12 h-12 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No bookings found</h3>
            <p className="text-gray-500 mb-6">Get started by creating your first booking.</p>
            <button onClick={handleAddBooking} className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors">
              <Plus className="w-5 h-5 mr-2" />
              {t("addBooking")}
            </button>
          </div>
        )}
        </>
        )}

        <Modal isOpen={isBookingModalOpen} onClose={() => { setIsBookingModalOpen(false); setEditingBooking(null); }} title={editingBooking ? "Edit Booking" : t("addBooking")} size="xl">
          <BookingForm booking={editingBooking} programs={state.programs} onSave={handleSaveBooking} onCancel={() => { setIsBookingModalOpen(false); setEditingBooking(null); }} />
        </Modal>

        <Modal isOpen={isPaymentModalOpen} onClose={() => { setIsPaymentModalOpen(false); setEditingPayment(null); }} title={editingPayment ? t("editPayment") : t("addPayment")} size="md" level={1}>
          {selectedBookingForPayment && (
            <PaymentForm
              payment={editingPayment?.payment}
              onSave={handleSavePayment}
              onCancel={() => { setIsPaymentModalOpen(false); setEditingPayment(null); }}
              remainingBalance={selectedBookingForPayment.remainingBalance || 0}
            />
          )}
        </Modal>

        <Modal isOpen={!!selectedBookingForPayment} onClose={() => { setSelectedBookingForPayment(null); }} title={t("managePayments")} size="xl" level={0}>
          {selectedBookingForPayment && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900">{selectedBookingForPayment.clientNameFr}</h3>
                <button onClick={() => handleAddPayment(selectedBookingForPayment)} className="inline-flex items-center px-3 py-1 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors">
                  <CreditCard className="w-4 h-4 mr-2" />
                  {t("addPayment")}
                </button>
              </div>
              <div className="space-y-3" key={(selectedBookingForPayment.advancePayments || []).length}> {/* Added null check */}
                {(selectedBookingForPayment.advancePayments || []).map((payment) => ( // Added null check
                  <div key={`${payment._id}-${payment.amount}`} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <div className="flex items-center">
                        <span className="text-sm text-gray-900">{Number(payment.amount).toLocaleString()} MAD</span> {/* Ensured number conversion */}
                        <span className="mx-2 text-gray-400">•</span>
                        <span className="text-sm text-gray-600 capitalize">{payment.method}</span>
                        <span className="mx-2 text-gray-400">•</span>
                        <span className="text-sm text-gray-600">{new Date(payment.date).toLocaleDateString()}</span>
                      </div>
                      {payment.method === "cheque" && payment.chequeNumber && (
                        <div className="text-sm text-gray-500 mt-1">
                          <span className="font-medium">Check #{payment.chequeNumber}</span>
                          {payment.bankName && <span> • {payment.bankName}</span>}
                          {payment.chequeCashingDate && (
                            <span> • Cashing: {new Date(payment.chequeCashingDate).toLocaleDateString()}</span>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex space-x-2">
                      <button onClick={() => handleEditPayment(selectedBookingForPayment, payment)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDeletePayment(selectedBookingForPayment.id, payment._id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"> {/* Changed _id to id */}
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
                {(!selectedBookingForPayment.advancePayments || selectedBookingForPayment.advancePayments.length === 0) && ( // Added null check
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