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
} = require("../controllers/ownerController");
const { protect } = require("../middleware/authMiddleware");

// All owner routes are protected and require the 'owner' role
router.use(protect, authorizeOwner);

router.get("/admins", getAdminUsers);
router.post("/admins", createAdminUser);
router.put("/admins/:id", updateAdminUser);
router.put("/admins/:id/status", toggleUserStatus);
router.delete("/admins/:id", deleteAdminUser);

module.exports = router;
