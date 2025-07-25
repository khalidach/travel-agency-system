// backend/routes/bookingRoutes.js
const express = require("express");
const router = express.Router();
const multer = require("multer");
const {
  getAllBookings,
  getBookingsByProgram,
  getBookingIdsByProgram,
  createBooking,
  updateBooking,
  deleteBooking,
  deleteMultipleBookings,
  addPayment,
  updatePayment,
  deletePayment,
  exportBookingsToExcel,
  exportBookingTemplateForProgram,
  importBookingsFromExcel,
  exportFlightListToExcel, // Import the new controller function
} = require("../controllers/bookingController");
const {
  bookingValidation,
  paymentValidation,
  handleValidationErrors,
  idValidation,
  bookingFilterValidation,
} = require("../middleware/validationMiddleware");
const {
  checkBookingLimit,
  checkBookingExportLimit,
  checkListExportLimit,
} = require("../middleware/tierMiddleware");

const upload = multer({ dest: "/tmp" });

// Booking routes
router.get(
  "/",
  bookingFilterValidation,
  handleValidationErrors,
  getAllBookings
);
router.get(
  "/program/:programId",
  bookingFilterValidation,
  handleValidationErrors,
  getBookingsByProgram
);
router.get(
  "/program/:programId/ids",
  bookingFilterValidation,
  handleValidationErrors,
  getBookingIdsByProgram
);
router.post(
  "/",
  bookingValidation,
  handleValidationErrors,
  checkBookingLimit,
  createBooking
);
router.put(
  "/:id",
  idValidation,
  bookingValidation,
  handleValidationErrors,
  updateBooking
);
router.delete("/", deleteMultipleBookings);
router.delete("/:id", idValidation, handleValidationErrors, deleteBooking);

// Excel and Template routes
router.get(
  "/export-template/program/:programId",
  exportBookingTemplateForProgram
);
router.post(
  "/import-excel/program/:programId",
  upload.single("file"),
  importBookingsFromExcel
);
router.get(
  "/export-excel/program/:programId",
  checkBookingExportLimit,
  exportBookingsToExcel
);
// Add the new route for the flight list
router.get(
  "/export-flight-list/program/:programId",
  checkListExportLimit,
  exportFlightListToExcel
);

// Payment routes (nested under bookings)
router.post(
  "/:bookingId/payments",
  paymentValidation,
  handleValidationErrors,
  addPayment
);
router.put(
  "/:bookingId/payments/:paymentId",
  paymentValidation,
  handleValidationErrors,
  updatePayment
);
router.delete("/:bookingId/payments/:paymentId", deletePayment);

module.exports = router;
