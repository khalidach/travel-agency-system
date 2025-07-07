// backend/routes/employeeRoutes.js
const express = require("express");
const router = express.Router();
const employeeController = require("../controllers/employeeController");
const { protect } = require("../middleware/authMiddleware");
const { checkEmployeeLimit } = require("../middleware/tierMiddleware");

// All employee routes are protected and can only be accessed by an admin
router.use(protect);

router.post("/", checkEmployeeLimit, employeeController.createEmployee);
router.get("/", employeeController.getEmployees);
router.get("/:username/analysis", employeeController.getEmployeeAnalysis);
router.get(
  "/:username/program-performance",
  employeeController.getEmployeeProgramPerformance
);
router.get(
  "/:username/service-performance",
  employeeController.getEmployeeServicePerformance
);
router.put("/:id", employeeController.updateEmployee);
router.delete("/:id", employeeController.deleteEmployee);

module.exports = router;
