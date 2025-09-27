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
const { protect } = require("../middleware/authMiddleware");
const {
  idValidation,
  handleValidationErrors,
} = require("../middleware/validationMiddleware");

// All owner routes are protected and require the 'owner' role
router.use(protect, authorizeOwner);

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
