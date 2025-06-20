const express = require("express");
const router = express.Router();
const {
  getAllPrograms,
  createProgram,
  updateProgram,
  deleteProgram,
} = require("../controllers/programController");
const {
  programValidation,
  handleValidationErrors,
} = require("../middleware/validationMiddleware");

router.get("/", getAllPrograms);
router.post("/", programValidation, handleValidationErrors, createProgram);
router.put("/:id", programValidation, handleValidationErrors, updateProgram);
router.delete("/:id", deleteProgram);

module.exports = router;
