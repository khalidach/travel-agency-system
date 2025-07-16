// backend/controllers/programPricingController.js
const ProgramPricingService = require("../services/ProgramPricingService");
const AppError = require("../utils/appError");
const logger = require("../utils/logger");

exports.getAllProgramPricing = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page || "1", 10);
    const limit = parseInt(req.query.limit || "10", 10);
    const offset = (page - 1) * limit;

    const pricingPromise = req.db.query(
      `SELECT pp.*, e.username as "employeeName"
       FROM program_pricing pp
       LEFT JOIN employees e ON pp."employeeId" = e.id
       WHERE pp."userId" = $1
       ORDER BY pp."createdAt" DESC
       LIMIT $2 OFFSET $3`,
      [req.user.adminId, limit, offset]
    );

    const totalCountPromise = req.db.query(
      'SELECT COUNT(*) FROM program_pricing WHERE "userId" = $1',
      [req.user.adminId]
    );

    const [pricingResult, totalCountResult] = await Promise.all([
      pricingPromise,
      totalCountPromise,
    ]);

    const totalCount = parseInt(totalCountResult.rows[0].count, 10);

    res.status(200).json({
      data: pricingResult.rows,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    logger.error("Get All Pricing Error:", {
      message: error.message,
      stack: error.stack,
    });
    next(new AppError("Failed to retrieve program pricing.", 500));
  }
};

exports.getProgramPricingByProgramId = async (req, res, next) => {
  try {
    const { programId } = req.params;
    const { adminId } = req.user;
    const { rows } = await req.db.query(
      'SELECT * FROM program_pricing WHERE "programId" = $1 AND "userId" = $2',
      [programId, adminId]
    );

    if (rows.length === 0) {
      return res.status(200).json(null);
    }

    res.status(200).json(rows[0]);
  } catch (error) {
    logger.error("Get Program Pricing by Program ID Error:", {
      message: error.message,
      stack: error.stack,
      programId: req.params.programId,
    });
    next(new AppError("Failed to retrieve program pricing.", 500));
  }
};

exports.createProgramPricing = async (req, res, next) => {
  try {
    const newPricing = await ProgramPricingService.createPricingAndBookings(
      req.db,
      req.user,
      req.body
    );
    res.status(201).json(newPricing);
  } catch (error) {
    logger.error("Create Pricing Error:", {
      message: error.message,
      stack: error.stack,
      body: req.body,
    });
    next(new AppError("Failed to create program pricing.", 400));
  }
};

exports.updateProgramPricing = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updatedProgramPricing =
      await ProgramPricingService.updatePricingAndBookings(
        req.db,
        req.user,
        id,
        req.body
      );
    res.status(200).json(updatedProgramPricing);
  } catch (error) {
    logger.error("Update Pricing Error:", {
      message: error.message,
      stack: error.stack,
      pricingId: req.params.id,
    });
    next(new AppError("Failed to update program pricing.", 400));
  }
};

exports.deleteProgramPricing = async (req, res, next) => {
  try {
    const { id } = req.params;
    const pricingRes = await req.db.query(
      'SELECT "employeeId" FROM program_pricing WHERE id = $1 AND "userId" = $2',
      [id, req.user.adminId]
    );

    if (pricingRes.rows.length === 0) {
      return next(
        new AppError("Program pricing not found or not authorized.", 404)
      );
    }

    const pricing = pricingRes.rows[0];
    if (req.user.role !== "admin" && pricing.employeeId !== req.user.id) {
      return next(
        new AppError("You are not authorized to delete this pricing.", 403)
      );
    }

    await req.db.query("DELETE FROM program_pricing WHERE id = $1", [id]);

    res.status(200).json({ message: "Program pricing deleted successfully" });
  } catch (error) {
    logger.error("Delete Pricing Error:", {
      message: error.message,
      stack: error.stack,
      pricingId: req.params.id,
    });
    next(new AppError("Failed to delete program pricing.", 500));
  }
};
