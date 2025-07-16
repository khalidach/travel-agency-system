// backend/routes/programPricingRoutes.js
const express = require("express");
const router = express.Router();
const {
  getAllProgramPricing,
  getProgramPricingByProgramId,
  createProgramPricing,
  updateProgramPricing,
  deleteProgramPricing,
} = require("../controllers/programPricingController");
const {
  programPricingValidation,
  handleValidationErrors,
  idValidation,
  paginationValidation,
} = require("../middleware/validationMiddleware");
const { checkProgramPricingLimit } = require("../middleware/tierMiddleware");
const { param } = require("express-validator");

router.get(
  "/",
  paginationValidation,
  handleValidationErrors,
  getAllProgramPricing
);
router.get(
  "/program/:programId",
  param("programId").isInt().withMessage("Program ID must be an integer."),
  handleValidationErrors,
  getProgramPricingByProgramId
);
router.post(
  "/",
  programPricingValidation,
  handleValidationErrors,
  checkProgramPricingLimit,
  createProgramPricing
);
router.put(
  "/:id",
  idValidation,
  programPricingValidation,
  handleValidationErrors,
  updateProgramPricing
);
router.delete(
  "/:id",
  idValidation,
  handleValidationErrors,
  deleteProgramPricing
);

module.exports = router;
