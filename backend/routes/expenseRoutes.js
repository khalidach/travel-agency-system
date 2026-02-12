// backend/routes/expenseRoutes.js
const express = require("express");
const router = express.Router();
const expenseController = require("../controllers/expenseController");

router.get("/", expenseController.getAllExpenses);
router.post("/", expenseController.createExpense);
router.put("/:id", expenseController.updateExpense);
router.delete("/:id", expenseController.deleteExpense);
router.post("/:id/payments", expenseController.addPayment);
router.delete("/:id/payments/:paymentId", expenseController.deletePayment);

module.exports = router;
