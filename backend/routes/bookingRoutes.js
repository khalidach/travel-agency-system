const express = require('express');
const router = express.Router();
const {
  getAllBookings,
  createBooking,
  updateBooking,
  deleteBooking,
  addPayment,
  updatePayment,
  deletePayment
} = require('../controllers/bookingController');

// Booking routes
router.get('/', getAllBookings);
router.post('/', createBooking);
router.put('/:id', updateBooking);
router.delete('/:id', deleteBooking);

// Payment routes (nested under bookings)
router.post('/:bookingId/payments', addPayment);
router.put('/:bookingId/payments/:paymentId', updatePayment);
router.delete('/:bookingId/payments/:paymentId', deletePayment);

module.exports = router; 