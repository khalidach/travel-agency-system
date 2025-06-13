const ProgramPricing = require('../models/programPricingModel');

// Get all program pricing
exports.getAllProgramPricing = async (req, res) => {
  try {
    const programPricing = await ProgramPricing.find().populate('programId');
    res.json(programPricing);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Create a new program pricing
exports.createProgramPricing = async (req, res) => {
  try {
    const programPricing = new ProgramPricing(req.body);
    const newProgramPricing = await programPricing.save();
    res.status(201).json(newProgramPricing);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Update a program pricing
exports.updateProgramPricing = async (req, res) => {
  try {
    const programPricing = await ProgramPricing.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!programPricing) {
      return res.status(404).json({ message: 'Program pricing not found' });
    }
    res.json(programPricing);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Delete a program pricing
exports.deleteProgramPricing = async (req, res) => {
  try {
    const programPricing = await ProgramPricing.findByIdAndDelete(req.params.id);
    if (!programPricing) {
      return res.status(404).json({ message: 'Program pricing not found' });
    }
    res.json({ message: 'Program pricing deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}; 