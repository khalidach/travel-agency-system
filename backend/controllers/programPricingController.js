// backend/controllers/programPricingController.js
const ProgramPricingService = require("../services/ProgramPricingService");

exports.getAllProgramPricing = async (req, res) => {
  try {
    const { rows } = await req.db.query(
      'SELECT * FROM program_pricing WHERE "userId" = $1',
      [req.user.id]
    );
    res.json(rows);
  } catch (error) {
    console.error("Get All Pricing Error:", error);
    res.status(500).json({ message: error.message });
  }
};

exports.createProgramPricing = async (req, res) => {
  const {
    programId,
    selectProgram,
    ticketAirline,
    visaFees,
    guideFees,
    allHotels,
  } = req.body;
  try {
    const { rows } = await req.db.query(
      'INSERT INTO program_pricing ("userId", "programId", "selectProgram", "ticketAirline", "visaFees", "guideFees", "allHotels") VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [
        req.user.id,
        programId,
        selectProgram,
        ticketAirline,
        visaFees,
        guideFees,
        JSON.stringify(allHotels || []),
      ]
    );
    res.status(201).json(rows[0]);
  } catch (error) {
    console.error("Create Pricing Error:", error);
    res.status(400).json({ message: error.message });
  }
};

exports.updateProgramPricing = async (req, res) => {
  const { id } = req.params;
  try {
    const updatedProgramPricing =
      await ProgramPricingService.updatePricingAndBookings(
        req.db,
        req.user.id,
        id,
        req.body
      );
    res.json(updatedProgramPricing);
  } catch (error) {
    console.error("Update Pricing Error:", error);
    res.status(400).json({ message: error.message });
  }
};

exports.deleteProgramPricing = async (req, res) => {
  const { id } = req.params;
  try {
    const { rowCount } = await req.db.query(
      'DELETE FROM program_pricing WHERE id = $1 AND "userId" = $2',
      [id, req.user.id]
    );
    if (rowCount === 0) {
      return res
        .status(404)
        .json({ message: "Program pricing not found or user not authorized" });
    }
    res.json({ message: "Program pricing deleted successfully" });
  } catch (error) {
    console.error("Delete Pricing Error:", error);
    res.status(500).json({ message: error.message });
  }
};
