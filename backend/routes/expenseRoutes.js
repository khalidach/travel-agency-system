// backend/routes/expenseRoutes.js
const express = require("express");
const router = express.Router();
const expenseController = require("../controllers/expenseController");

router.get("/", expenseController.getAllExpenses);
router.post("/", expenseController.createExpense);
router.post("/bulk-delete", expenseController.bulkDeleteExpenses);
router.put("/:id", expenseController.updateExpense);
router.delete("/:id", expenseController.deleteExpense);

// Payment Routes
router.post("/:id/payments", expenseController.addPayment);
router.put("/:id/payments/:paymentId", expenseController.updatePayment); // <--- Added Route
router.delete("/:id/payments/:paymentId", expenseController.deletePayment);

module.exports = router;
