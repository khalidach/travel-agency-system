// backend/routes/factureRoutes.js
const express = require("express");
const router = express.Router();
const {
  getFactures,
  createFacture,
  updateFacture,
  deleteFacture,
} = require("../controllers/factureController");
const {
  checkInvoicingAccess,
  checkFactureLimit,
} = require("../middleware/tierMiddleware");

// Note: The 'protect' middleware is applied in index.js for this route group
router.use(checkInvoicingAccess);
router.get("/", getFactures);
router.post("/", checkFactureLimit, createFacture);
router.put("/:id", updateFacture);
router.delete("/:id", deleteFacture);

module.exports = router;
