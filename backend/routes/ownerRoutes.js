// backend/routes/ownerRoutes.js
const express = require("express");
const router = express.Router();
const {
  authorizeOwner,
  getAdminUsers,
  createAdminUser,
  updateAdminUser,
  deleteAdminUser,
  toggleUserStatus,
  updateAdminTier,
  updateAdminUserLimits,
} = require("../controllers/ownerController");
const agencyReportController = require("../controllers/agencyReportController");
const { protect } = require("../middleware/authMiddleware");
const {
  idValidation,
  handleValidationErrors,
} = require("../middleware/validationMiddleware");
const { param, query } = require("express-validator");

// All owner routes are protected and require the 'owner' role
router.use(protect, authorizeOwner);

// --- Admin User (Agency) Management Routes ---
router.get("/admins", getAdminUsers);
router.post("/admins", createAdminUser);
router.put(
  "/admins/:id",
  idValidation,
  handleValidationErrors,
  updateAdminUser
);
router.put(
  "/admins/:id/status",
  idValidation,
  handleValidationErrors,
  toggleUserStatus
);
router.put(
  "/admins/:id/tier",
  idValidation,
  handleValidationErrors,
  updateAdminTier
);
router.put(
  "/admins/:id/limits",
  idValidation,
  handleValidationErrors,
  updateAdminUserLimits
);
router.delete(
  "/admins/:id",
  idValidation,
  handleValidationErrors,
  deleteAdminUser
);

// --- Agency Reporting Routes (New Feature) ---
router.get("/reports/summary", agencyReportController.getAgenciesSummaryReport);
router.get(
  "/reports/detailed/:adminId",
  [
    param("adminId").isInt().withMessage("Admin ID must be an integer."),
    query("startDate").optional().isISO8601().toDate(),
    query("endDate").optional().isISO8601().toDate(),
    handleValidationErrors,
  ],
  agencyReportController.getAgencyDetailedReport
);

module.exports = router;
