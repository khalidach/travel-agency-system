// backend/routes/factureRoutes.js
const express = require("express");
const router = express.Router();
const {
  getFactures,
  createFacture,
  updateFacture,
  deleteFacture,
} = require("../controllers/factureController");

// Note: The 'protect' middleware is applied in index.js for this route group
router.get("/", getFactures);
router.post("/", createFacture);
router.put("/:id", updateFacture);
router.delete("/:id", deleteFacture);

module.exports = router;
