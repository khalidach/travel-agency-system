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
  getAdminUserReport, // تم استيراد الدالة الجديدة
} = require("../controllers/ownerController");
const { protect } = require("../middleware/authMiddleware");
const {
  idValidation,
  handleValidationErrors,
} = require("../middleware/validationMiddleware");
const { query } = require("express-validator"); // استيراد query للتحقق من صحة فلاتر التاريخ

// All owner routes are protected and require the 'owner' role
router.use(protect, authorizeOwner);

// مسار جديد لتقارير الوكالة
router.get(
  "/admins/:id/report",
  [
    idValidation,
    query("startDate").optional().isISO8601().toDate(),
    query("endDate").optional().isISO8601().toDate(),
    handleValidationErrors,
  ],
  getAdminUserReport
);

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

module.exports = router;
