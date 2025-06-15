// backend/routes/bookingRoutes.js
const express = require('express');
const router = express.Router();
const multer = require('multer');

// Configure multer for temporary file storage
const upload = multer({ dest: 'temp/' });

const {
  getAllBookings,
  createBooking,
  updateBooking,
  deleteBooking,
  addPayment,
  updatePayment,
  deletePayment,
  exportBookingsToExcel,
  exportBookingTemplate,     // New function
  importBookingsFromExcel    // New function
} = require('../controllers/bookingController');

// Booking routes
router.get('/', getAllBookings);
router.post('/', createBooking);
router.put('/:id', updateBooking);
router.delete('/:id', deleteBooking);

// New routes for Excel template and import
router.get('/export-template', exportBookingTemplate);
router.post('/import-excel', upload.single('file'), importBookingsFromExcel);


// Existing route for exporting bookings to Excel
router.get('/export-excel/program/:programId', exportBookingsToExcel);

// Payment routes (nested under bookings)
router.post('/:bookingId/payments', addPayment);
router.put('/:bookingId/payments/:paymentId', updatePayment);
router.delete('/:bookingId/payments/:paymentId', deletePayment);

module.exports = router;