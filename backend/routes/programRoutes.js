const express = require('express');
const router = express.Router();
const {
  getAllPrograms,
  createProgram,
  updateProgram,
  deleteProgram
} = require('../controllers/programController');

router.get('/', getAllPrograms);
router.post('/', createProgram);
router.put('/:id', updateProgram);
router.delete('/:id', deleteProgram);

module.exports = router; 