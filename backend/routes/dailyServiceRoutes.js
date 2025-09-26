// backend/routes/dailyServiceRoutes.js
const express = require("express");
const router = express.Router();
const {
  getDailyServices,
  createDailyService,
  updateDailyService,
  deleteDailyService,
  getDailyServiceReport,
  addDailyServicePayment,
  updateDailyServicePayment,
  deleteDailyServicePayment,
} = require("../controllers/dailyServiceController");
const {
  dailyServiceValidation,
  handleValidationErrors,
  idValidation,
  paginationValidation,
  paymentValidation,
} = require("../middleware/validationMiddleware");
const {
  checkDailyServiceLimit,
  checkDailyServiceAccess,
} = require("../middleware/tierMiddleware");

// Note: The 'protect' middleware is applied in index.js for this route group
router.use(checkDailyServiceAccess);

router.get("/", paginationValidation, handleValidationErrors, getDailyServices);
router.post(
  "/",
  checkDailyServiceLimit,
  dailyServiceValidation,
  handleValidationErrors,
  createDailyService
);
router.put(
  "/:id",
  idValidation,
  dailyServiceValidation,
  handleValidationErrors,
  updateDailyService
);
router.delete("/:id", idValidation, handleValidationErrors, deleteDailyService);
router.get("/report", getDailyServiceReport);

// New Payment routes for Daily Services
router.post(
  "/:serviceId/payments",
  paymentValidation,
  handleValidationErrors,
  addDailyServicePayment
);
router.put(
  "/:serviceId/payments/:paymentId",
  paymentValidation,
  handleValidationErrors,
  updateDailyServicePayment
);
router.delete("/:serviceId/payments/:paymentId", deleteDailyServicePayment);

module.exports = router;
