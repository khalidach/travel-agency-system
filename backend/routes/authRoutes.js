// backend/routes/authRoutes.js
const express = require("express");
const router = express.Router();
const {
  loginUser,
  refreshToken,
  logoutUser,
  signupUser,
} = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");
const {
  loginValidation,
  signupValidation,
  handleValidationErrors,
} = require("../middleware/validationMiddleware");
const { loginLimiter } = require("../middleware/rateLimitMiddleware");

router.post("/signup", signupValidation, handleValidationErrors, signupUser);

router.post(
  "/login",
  loginLimiter,
  loginValidation,
  handleValidationErrors,
  loginUser
);
router.post("/refresh", protect, refreshToken);
router.post("/logout", logoutUser);

module.exports = router;
