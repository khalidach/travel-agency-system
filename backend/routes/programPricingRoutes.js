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
} = require("../middleware/validationMiddleware");
const { checkProgramPricingLimit } = require("../middleware/tierMiddleware");

router.get("/", getAllProgramPricing);
router.get("/program/:programId", getProgramPricingByProgramId);
router.post(
  "/",
  programPricingValidation,
  handleValidationErrors,
  checkProgramPricingLimit,
  createProgramPricing
);
router.put(
  "/:id",
  programPricingValidation,
  handleValidationErrors,
  updateProgramPricing
);
router.delete("/:id", deleteProgramPricing);

module.exports = router;
