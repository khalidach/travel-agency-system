// backend/routes/programRoutes.js
const express = require("express");
const router = express.Router();
const {
  getAllPrograms,
  getProgramById,
  createProgram,
  updateProgram,
  deleteProgram,
} = require("../controllers/programController");
const {
  programValidation,
  handleValidationErrors,
  idValidation,
  paginationValidation,
} = require("../middleware/validationMiddleware");
const { checkProgramLimit } = require("../middleware/tierMiddleware");

router.get("/", paginationValidation, handleValidationErrors, getAllPrograms);
router.get("/:id", idValidation, handleValidationErrors, getProgramById);
router.post(
  "/",
  programValidation,
  handleValidationErrors,
  checkProgramLimit,
  createProgram
);
router.put(
  "/:id",
  idValidation,
  programValidation,
  handleValidationErrors,
  updateProgram
);
router.delete("/:id", idValidation, handleValidationErrors, deleteProgram);

module.exports = router;
