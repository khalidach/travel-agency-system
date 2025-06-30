// backend/routes/bookingRoutes.js
const express = require("express");
const router = express.Router();
const multer = require("multer");
const {
  getAllBookings,
  getBookingsByProgram,
  getBookingStatsByProgram, // <-- NEW
  createBooking,
  updateBooking,
  deleteBooking,
  addPayment,
  updatePayment,
  deletePayment,
  exportBookingsToExcel,
  exportBookingTemplateForProgram,
  importBookingsFromExcel,
} = require("../controllers/bookingController");
const {
  bookingValidation,
  paymentValidation,
  handleValidationErrors,
} = require("../middleware/validationMiddleware");

const upload = multer({ dest: "/tmp" });

// Booking routes
router.get("/", getAllBookings);
router.get("/program/:programId", getBookingsByProgram);
router.get("/program/:programId/stats", getBookingStatsByProgram); // <-- NEW ROUTE
router.post("/", bookingValidation, handleValidationErrors, createBooking);
router.put("/:id", bookingValidation, handleValidationErrors, updateBooking);
router.delete("/:id", deleteBooking);

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
router.get("/export-excel/program/:programId", exportBookingsToExcel);

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
