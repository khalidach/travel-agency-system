// backend/routes/supplierRoutes.js
const express = require("express");
const router = express.Router();
const supplierController = require("../controllers/supplierController");

router.get("/", supplierController.getAllSuppliers);
router.post("/", supplierController.createSupplier);
router.get("/:id", supplierController.getSupplier);
router.put("/:id", supplierController.updateSupplier);
router.delete("/:id", supplierController.deleteSupplier);

module.exports = router;
