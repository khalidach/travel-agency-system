// backend/controllers/programController.js
const Program = require('../models/programModel');

// Get all programs for the logged-in user
exports.getAllPrograms = async (req, res) => {
  try {
    const programs = await Program.find({ user: req.user.id });
    res.json(programs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Create a new program for the logged-in user
exports.createProgram = async (req, res) => {
  try {
    const program = new Program({
      ...req.body,
      user: req.user.id
    });
    const newProgram = await program.save();
    res.status(201).json(newProgram);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Update a program
exports.updateProgram = async (req, res) => {
  try {
    const program = await Program.findById(req.params.id);

    if (!program) {
      return res.status(404).json({ message: 'Program not found' });
    }

    // Check if the program belongs to the user
    if (program.user.toString() !== req.user.id) {
      return res.status(401).json({ message: 'User not authorized' });
    }

    const updatedProgram = await Program.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    res.json(updatedProgram);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Delete a program
exports.deleteProgram = async (req, res) => {
  try {
    const program = await Program.findById(req.params.id);

    if (!program) {
      return res.status(404).json({ message: 'Program not found' });
    }

    // Check if the program belongs to the user
    if (program.user.toString() !== req.user.id) {
      return res.status(401).json({ message: 'User not authorized' });
    }

    await program.remove();
    res.json({ message: 'Program deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};