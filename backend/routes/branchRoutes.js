// backend/routes/branchRoutes.js
const express = require("express");
const router = express.Router();
const branchController = require("../controllers/branchController");
const { protect } = require("../middleware/authMiddleware");

// Require auth for all branch routes
router.use(protect);

router.get("/", branchController.getAllBranches);
router.post("/", branchController.createBranch);
router.put("/:id", branchController.updateBranch);
router.delete("/:id", branchController.deleteBranch);

module.exports = router;
