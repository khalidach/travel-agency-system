// backend/routes/dashboardRoutes.js
const express = require("express");
const router = express.Router();
const {
  getDashboardStats,
  getProfitReport,
} = require("../controllers/dashboardController");
const { checkProfitReportAccess } = require("../middleware/tierMiddleware");

// This route will be protected by the middleware applied in index.js
router.get("/stats", getDashboardStats);
router.get("/profit-report", checkProfitReportAccess, getProfitReport);

module.exports = router;
