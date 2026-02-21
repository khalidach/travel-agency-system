// backend/controllers/programCostsController.js
const AppError = require("../utils/appError");
const logger = require("../utils/logger");

exports.getProgramCosts = async (req, res, next) => {
  try {
    const { programId } = req.params;
    const { adminId } = req.user;

    const { rows } = await req.db.query(
      'SELECT * FROM program_costs WHERE "programId" = $1 AND "userId" = $2',
      [programId, adminId]
    );

    if (rows.length > 0) {
      res.status(200).json(rows[0]);
    } else {
      // Return a default structure if no costs are saved yet
      res.status(200).json({
        programId: parseInt(programId),
        costs: { hotels: [], custom: [] },
        totalCost: 0,
      });
    }
  } catch (error) {
    logger.error("Get Program Costs Error:", {
      message: error.message,
      stack: error.stack,
    });
    next(new AppError("Failed to retrieve program costs.", 500));
  }
};

exports.saveProgramCosts = async (req, res, next) => {
  try {
    const { programId } = req.params;
    const { adminId } = req.user;
    const { costs, totalCost } = req.body;

    // Check if the program exists and belongs to the user
    const programRes = await req.db.query(
      'SELECT id FROM programs WHERE id = $1 AND "userId" = $2',
      [programId, adminId]
    );
    if (programRes.rows.length === 0) {
      throw new AppError("Program not found or you are not authorized.", 404);
    }

    // Insert/Update the ProgramCost record (isEnabled always true)
    const { rows } = await req.db.query(
      `INSERT INTO program_costs ("programId", "userId", costs, "totalCost", "isEnabled")
             VALUES ($1, $2, $3, $4, TRUE)
             ON CONFLICT ("programId") 
             DO UPDATE SET costs = $3, "totalCost" = $4, "isEnabled" = TRUE, "updatedAt" = NOW()
             RETURNING *`,
      [programId, adminId, JSON.stringify(costs), totalCost]
    );

    res.status(200).json(rows[0]);
  } catch (error) {
    logger.error("Save Program Costs Error:", {
      message: error.message,
      stack: error.stack,
    });
    next(new AppError("Failed to save program costs.", 500));
  }
};
