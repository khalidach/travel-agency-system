// backend/routes/tierRoutes.js
const express = require("express");
const router = express.Router();
const {
  getTiers,
  createTier,
  updateTier,
  deleteTier,
} = require("../controllers/tierController");
const { authorizeOwner } = require("../controllers/ownerController");
const {
  idValidation,
  handleValidationErrors,
} = require("../middleware/validationMiddleware");

// All tier routes are protected and require the 'owner' role
// The 'protect' middleware is applied in index.js before this route is used.
router.use(authorizeOwner);

router.get("/", getTiers);
router.post("/", createTier);
router.put("/:id", idValidation, handleValidationErrors, updateTier);
router.delete("/:id", idValidation, handleValidationErrors, deleteTier);

module.exports = router;
