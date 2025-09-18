// backend/routes/programCostsRoutes.js
const express = require("express");
const router = express.Router();
const programCostsController = require("../controllers/programCostsController");
const { param } = require("express-validator");
const {
  handleValidationErrors,
} = require("../middleware/validationMiddleware");

const programIdValidation = [
  param("programId").isInt().withMessage("Program ID must be an integer."),
];

router.get(
  "/:programId",
  programIdValidation,
  handleValidationErrors,
  programCostsController.getProgramCosts
);
router.put(
  "/:programId",
  programIdValidation,
  handleValidationErrors,
  programCostsController.saveProgramCosts
);

module.exports = router;
