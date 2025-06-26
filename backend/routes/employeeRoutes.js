// backend/routes/employeeRoutes.js
const express = require("express");
const router = express.Router();
const employeeController = require("../controllers/employeeController");
const { protect } = require("../middleware/authMiddleware");

// All employee routes are protected and can only be accessed by an admin
router.use(protect);

router.post("/", employeeController.createEmployee);
router.get("/", employeeController.getEmployees);
router.get("/:username/analysis", employeeController.getEmployeeAnalysis); // <-- NEW ROUTE
router.put("/:id", employeeController.updateEmployee);
router.delete("/:id", employeeController.deleteEmployee);

module.exports = router;
