// backend/routes/programCostsRoutes.js
const express = require("express");
const router = express.Router();
const programCostsController = require("../controllers/programCostsController");
const { param } = require("express-validator");
const {
  handleValidationErrors,
} = require("../middleware/validationMiddleware");
const { checkProgramCostAccess } = require("../middleware/tierMiddleware"); // تم التغيير

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
  checkProgramCostAccess, // تم التغيير
  programCostsController.saveProgramCosts
);

module.exports = router;
