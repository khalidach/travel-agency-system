// backend/routes/accountRoutes.js
const express = require("express");
const router = express.Router();
const { updateAccountSettings } = require("../controllers/accountController");
const { protect } = require("../middleware/authMiddleware");
const {
  accountSettingsValidation,
  handleValidationErrors,
} = require("../middleware/validationMiddleware");

router.put(
  "/settings",
  protect,
  accountSettingsValidation,
  handleValidationErrors,
  updateAccountSettings
);

module.exports = router;
