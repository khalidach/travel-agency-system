// backend/routes/incomeRoutes.js
const express = require('express');
const router = express.Router();
const incomeController = require('../controllers/incomeController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.route('/')
    .get(incomeController.getAllIncomes)
    .post(incomeController.createIncome)
    .delete(incomeController.bulkDeleteIncomes);

router.route('/:id')
    .put(incomeController.updateIncome)
    .delete(incomeController.deleteIncome);

router.route('/:id/payments')
    .post(incomeController.addPayment);

router.route('/:id/payments/:paymentId')
    .put(incomeController.updatePayment)
    .delete(incomeController.deletePayment);

router.route('/:id/convert-to-facture')
    .post(incomeController.convertToFacture);

module.exports = router;
