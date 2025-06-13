const express = require('express');
const router = express.Router();
const {
  getAllProgramPricing,
  createProgramPricing,
  updateProgramPricing,
  deleteProgramPricing
} = require('../controllers/programPricingController');

router.get('/', getAllProgramPricing);
router.post('/', createProgramPricing);
router.put('/:id', updateProgramPricing);
router.delete('/:id', deleteProgramPricing);

module.exports = router; 