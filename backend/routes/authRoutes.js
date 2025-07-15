// backend/routes/authRoutes.js
const express = require("express");
const router = express.Router();
const { loginUser, refreshToken } = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");
const {
  loginValidation,
  handleValidationErrors,
} = require("../middleware/validationMiddleware");
const { loginLimiter } = require("../middleware/rateLimitMiddleware");

router.post(
  "/login",
  loginLimiter,
  loginValidation,
  handleValidationErrors,
  loginUser
);
router.post("/refresh", protect, refreshToken);

module.exports = router;
