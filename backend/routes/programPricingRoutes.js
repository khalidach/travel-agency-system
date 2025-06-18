const express = require("express");
const router = express.Router();
const {
  getAllProgramPricing,
  createProgramPricing,
  updateProgramPricing,
  deleteProgramPricing,
} = require("../controllers/programPricingController");
const {
  programPricingValidation,
  handleValidationErrors,
} = require("../middleware/validationMiddleware");

router.get("/", getAllProgramPricing);
router.post(
  "/",
  programPricingValidation,
  handleValidationErrors,
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
