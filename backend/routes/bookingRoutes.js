const express = require('express');
const router = express.Router();
const {
  getAllBookings,
  createBooking,
  updateBooking,
  deleteBooking,
  addPayment,
  updatePayment,
  deletePayment,
  exportBookingsToExcel // Changed from googleSheets to Excel
} = require('../controllers/bookingController');

// Booking routes
router.get('/', getAllBookings);
router.post('/', createBooking);
router.put('/:id', updateBooking);
router.delete('/:id', deleteBooking);

// New route for exporting bookings to Excel
router.get('/export-excel/program/:programId', exportBookingsToExcel);

// Payment routes (nested under bookings)
router.post('/:bookingId/payments', addPayment);
router.put('/:bookingId/payments/:paymentId', updatePayment);
router.delete('/:bookingId/payments/:paymentId', deletePayment);

module.exports = router;