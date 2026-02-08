// backend/services/BookingService.js

const { checkProgramCapacity } = require("./booking/capacity.service");
const {
  calculateBasePrice,
  getProgramConfiguredPrice,
} = require("./booking/pricing.service");
const {
  getAllBookings,
  findBookingForUser,
} = require("./booking/retrieval.service");
const { createBookings } = require("./booking/creation.service");
const { updateBooking } = require("./booking/update.service");
const {
  deleteBooking,
  deleteMultipleBookings,
} = require("./booking/deletion.service");
const {
  addPayment,
  updatePayment,
  deletePayment,
} = require("./booking/payment.service");

module.exports = {
  // Capacity
  checkProgramCapacity,

  // Pricing
  calculateBasePrice,
  getProgramConfiguredPrice,

  // Retrieval
  getAllBookings,
  findBookingForUser,

  // Creation
  createBookings,

  // Update
  updateBooking,

  // Deletion
  deleteBooking,
  deleteMultipleBookings,

  // Payments
  addPayment,
  updatePayment,
  deletePayment,
};
