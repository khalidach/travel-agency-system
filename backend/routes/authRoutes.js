// backend/routes/authRoutes.js
const express = require("express");
const router = express.Router();
const { loginUser, refreshToken } = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");

router.post("/login", loginUser);
router.post("/refresh", protect, refreshToken); // Add this new route

module.exports = router;
