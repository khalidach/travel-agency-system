// backend/routes/dashboardRoutes.js
const express = require("express");
const router = express.Router();
const {
  getDashboardStats,
  getProfitReport,
  exportProfitReportExcel,
} = require("../controllers/dashboardController");
const { checkProfitReportAccess } = require("../middleware/tierMiddleware");

// This route will be protected by the middleware applied in index.js
router.get("/stats", getDashboardStats);
router.get("/profit-report", checkProfitReportAccess, getProfitReport);
router.get("/profit-report/export", checkProfitReportAccess, exportProfitReportExcel);

module.exports = router;
