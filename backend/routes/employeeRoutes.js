// backend/routes/employeeRoutes.js
const express = require("express");
const router = express.Router();
const employeeController = require("../controllers/employeeController");
const { protect } = require("../middleware/authMiddleware");
const { checkEmployeeLimit } = require("../middleware/tierMiddleware");
const {
  idValidation,
  usernameValidation,
  handleValidationErrors,
} = require("../middleware/validationMiddleware");

// All employee routes are protected and can only be accessed by an admin
router.use(protect);

router.post("/", checkEmployeeLimit, employeeController.createEmployee);
router.get("/", employeeController.getEmployees);
router.get(
  "/:username/analysis",
  usernameValidation,
  handleValidationErrors,
  employeeController.getEmployeeAnalysis
);
router.get(
  "/:username/program-performance",
  usernameValidation,
  handleValidationErrors,
  employeeController.getEmployeeProgramPerformance
);
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
