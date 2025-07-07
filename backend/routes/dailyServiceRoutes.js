// backend/routes/dailyServiceRoutes.js
const express = require("express");
const router = express.Router();
const {
  getDailyServices,
  createDailyService,
  updateDailyService,
  deleteDailyService,
  getDailyServiceReport,
} = require("../controllers/dailyServiceController");
const {
  dailyServiceValidation,
  handleValidationErrors,
} = require("../middleware/validationMiddleware");

// Note: The 'protect' middleware is applied in index.js for this route group

router.get("/", getDailyServices);
router.post(
  "/",
  dailyServiceValidation,
  handleValidationErrors,
  createDailyService
);
router.put(
  "/:id",
  dailyServiceValidation,
  handleValidationErrors,
  updateDailyService
);
router.delete("/:id", deleteDailyService);
router.get("/report", getDailyServiceReport);

module.exports = router;
