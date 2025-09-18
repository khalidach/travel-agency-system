// backend/controllers/programCostsController.js
const AppError = require("../utils/appError");
const logger = require("../utils/logger");
const ProgramCostingService = require("../services/ProgramCostingService");

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
        isEnabled: false,
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
  const client = await req.db.connect();
  try {
    await client.query("BEGIN");

    const { programId } = req.params;
    const { adminId } = req.user;
    const { costs, totalCost, isEnabled } = req.body;

    // Check if the program exists and belongs to the user
    const programRes = await client.query(
      'SELECT id FROM programs WHERE id = $1 AND "userId" = $2',
      [programId, adminId]
    );
    if (programRes.rows.length === 0) {
      throw new AppError("Program not found or you are not authorized.", 404);
    }

    const { rows } = await client.query(
      `INSERT INTO program_costs ("programId", "userId", costs, "totalCost", "isEnabled")
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT ("programId") 
             DO UPDATE SET costs = $3, "totalCost" = $4, "isEnabled" = $5, "updatedAt" = NOW()
             RETURNING *`,
      [programId, adminId, JSON.stringify(costs), totalCost, isEnabled]
    );

    if (isEnabled) {
      await ProgramCostingService.applyFinalCostToBookings(
        client,
        adminId,
        programId,
        totalCost
      );
    } else {
      await ProgramCostingService.revertToDetailedPricing(
        client,
        adminId,
        programId
      );
    }

    await client.query("COMMIT");
    res.status(200).json(rows[0]);
  } catch (error) {
    await client.query("ROLLBACK");
    logger.error("Save Program Costs Error:", {
      message: error.message,
      stack: error.stack,
    });
    next(new AppError("Failed to save program costs.", 500));
  } finally {
    client.release();
  }
};
