// backend/routes/employeeRoutes.js
const express = require("express");
const router = express.Router();
const employeeController = require("../controllers/employeeController");
const { protect } = require("../middleware/authMiddleware");
const {
  checkEmployeeLimit,
  checkEmployeeAnalysisAccess,
} = require("../middleware/tierMiddleware");
const {
  idValidation,
  usernameValidation,
  handleValidationErrors,
} = require("../middleware/validationMiddleware");
const { param, query } = require("express-validator"); // Import query for date validation

// All employee routes are protected and can only be accessed by an admin
router.use(protect);

router.post("/", checkEmployeeLimit, employeeController.createEmployee);
router.get("/", employeeController.getEmployees);

// Route for overall employee analysis
router.get(
  "/:username/analysis",
  usernameValidation,
  handleValidationErrors,
  checkEmployeeAnalysisAccess, // This middleware is now correctly placed
  employeeController.getEmployeeAnalysis
);

// Route for program performance (summary table)
router.get(
  "/:username/program-performance",
  usernameValidation,
  [
    query("startDate").optional().isISO8601().toDate(),
    query("endDate").optional().isISO8601().toDate(),
  ],
  handleValidationErrors,
  employeeController.getEmployeeProgramPerformance
);

// NEW Route for detailed bookings list for a specific program
router.get(
  "/:username/programs/:programId/bookings",
  [
    param("username").notEmpty().withMessage("Username is required."),
    param("programId").isInt().withMessage("Program ID must be an integer."),
    query("startDate").optional().isISO8601().toDate(),
    query("endDate").optional().isISO8601().toDate(),
  ],
  handleValidationErrors,
  employeeController.getEmployeeProgramBookings
);

// Route for service performance (summary table)
router.get(
  "/:username/service-performance",
  usernameValidation,
  handleValidationErrors,
  employeeController.getEmployeeServicePerformance
);
router.put(
  "/:id",
  idValidation,
  handleValidationErrors,
  employeeController.updateEmployee
);
router.put(
  "/:id/status",
  idValidation,
  handleValidationErrors,
  employeeController.toggleEmployeeStatus
);
router.delete(
  "/:id",
  idValidation,
  handleValidationErrors,
  employeeController.deleteEmployee
);

module.exports = router;
