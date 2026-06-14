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

exports.exportProgramCostsList = async (req, res, next) => {
  try {
    const { adminId } = req.user;
    const { searchTerm, filterType } = req.query;

    let baseQuery = "FROM programs p";
    let whereConditions = ['p."userId" = $1', 'p."isCommissionBased" = FALSE'];
    const queryParams = [adminId];
    let paramIndex = 2;

    if (searchTerm) {
      whereConditions.push(`p.name ILIKE $${paramIndex++}`);
      queryParams.push(`%${searchTerm}%`);
    }

    if (filterType && filterType !== "all") {
      whereConditions.push(`p.type = $${paramIndex++}`);
      queryParams.push(filterType);
    }

    // Scoping programs visibility by branch (non-admin, non-owner, branchId is set)
    if (req.user.role !== "admin" && req.user.role !== "owner" && req.user.branchId) {
      whereConditions.push(`(p."allowedBranchIds" IS NULL OR coalesce(cardinality(p."allowedBranchIds"), 0) = 0 OR $${paramIndex++} = ANY(p."allowedBranchIds"))`);
      queryParams.push(req.user.branchId);
    }

    const whereClause = `WHERE ${whereConditions.join(" AND ")}`;

    const query = `
      SELECT p.*,
        (SELECT row_to_json(pc) FROM program_costs pc WHERE pc."programId" = p.id LIMIT 1) as costs
      ${baseQuery}
      ${whereClause}
      ORDER BY p."createdAt" DESC
    `;

    const { rows: programs } = await req.db.query(query, queryParams);

    const ProgramCostsExcelService = require("../services/ProgramCostsExcelService");
    const workbook = await ProgramCostsExcelService.generateProgramCostsListExcel(programs);

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=program_costs_list.xlsx"
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    logger.error("Export Program Costs List Error:", {
      message: error.message,
      stack: error.stack,
    });
    next(new AppError("Failed to export program costs list.", 500));
  }
};

exports.exportSingleProgramCosts = async (req, res, next) => {
  try {
    const { programId } = req.params;
    const { adminId } = req.user;

    // Get the program details
    const programRes = await req.db.query(
      'SELECT * FROM programs WHERE id = $1 AND "userId" = $2',
      [programId, adminId]
    );
    if (programRes.rows.length === 0) {
      throw new AppError("Program not found or you are not authorized.", 404);
    }
    const program = programRes.rows[0];

    // Get the program costs
    const costRes = await req.db.query(
      'SELECT * FROM program_costs WHERE "programId" = $1 AND "userId" = $2',
      [programId, adminId]
    );

    let existingCosts;
    if (costRes.rows.length > 0) {
      existingCosts = costRes.rows[0];
    } else {
      existingCosts = {
        programId: parseInt(programId),
        costs: { hotels: [], custom: [] },
        totalCost: 0,
      };
    }

    // Get total revenue from confirmed bookings
    const revRes = await req.db.query(
      `SELECT COALESCE(SUM("sellingPrice"), 0) as "totalRevenue"
       FROM bookings
       WHERE "userId" = $1 AND "tripId" = $2 AND status = 'confirmed'`,
      [adminId, programId]
    );
    const totalRevenue = parseFloat(revRes.rows[0].totalRevenue || 0);

    const ProgramCostsExcelService = require("../services/ProgramCostsExcelService");
    const workbook = await ProgramCostsExcelService.generateSingleProgramCostsExcel(
      program,
      existingCosts,
      totalRevenue
    );

    const sanitizedProgramName = program.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=program_cost_${sanitizedProgramName}.xlsx`
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    logger.error("Export Single Program Costs Error:", {
      message: error.message,
      stack: error.stack,
    });
    next(new AppError("Failed to export program costs.", 500));
  }
};

