// backend/controllers/tierController.js
const { tierLimitsCache } = require("../middleware/tierMiddleware");
const AppError = require("../utils/appError");
const logger = require("../utils/logger");

exports.getTiers = async (req, res, next) => {
  try {
    const { rows } = await req.db.query("SELECT * FROM tiers ORDER BY id ASC");
    res.status(200).json(rows);
  } catch (error) {
    logger.error("Get Tiers Error:", {
      message: error.message,
      stack: error.stack,
    });
    next(new AppError("Failed to retrieve tiers.", 500));
  }
};

exports.createTier = async (req, res, next) => {
  try {
    const { name, limits } = req.body;

    if (!name || !limits) {
      return next(new AppError("Tier name and limits are required.", 400));
    }

    const existingTier = await req.db.query(
      "SELECT id FROM tiers WHERE LOWER(name) = LOWER($1)",
      [name.trim()]
    );

    if (existingTier.rows.length > 0) {
      return next(
        new AppError(`A tier with the name "${name}" already exists.`, 409)
      );
    }

    const { rows } = await req.db.query(
      "INSERT INTO tiers (name, limits) VALUES ($1, $2) RETURNING *",
      [name.trim(), JSON.stringify(limits)]
    );
    res.status(201).json(rows[0]);
  } catch (error) {
    logger.error("Create Tier Error:", {
      message: error.message,
      stack: error.stack,
      body: req.body,
    });
    if (error.code === "23505") {
      return next(
        new AppError(
          `A tier with the name "${req.body.name}" already exists.`,
          409
        )
      );
    }
    next(new AppError("Failed to create tier.", 500));
  }
};

exports.updateTier = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, limits } = req.body;

    if (!name || !limits) {
      return next(new AppError("Tier name and limits are required.", 400));
    }

    const existingTier = await req.db.query(
      "SELECT id FROM tiers WHERE LOWER(name) = LOWER($1) AND id != $2",
      [name.trim(), id]
    );

    if (existingTier.rows.length > 0) {
      return next(
        new AppError(`A tier with the name "${name}" already exists.`, 409)
      );
    }

    const { rows } = await req.db.query(
      "UPDATE tiers SET name = $1, limits = $2 WHERE id = $3 RETURNING *",
      [name.trim(), JSON.stringify(limits), id]
    );

    if (rows.length === 0) {
      return next(new AppError("Tier not found.", 404));
    }

    tierLimitsCache.delete(parseInt(id, 10));

    res.status(200).json(rows[0]);
  } catch (error) {
    logger.error("Update Tier Error:", {
      message: error.message,
      stack: error.stack,
      tierId: req.params.id,
    });
    if (error.code === "23505") {
      return next(
        new AppError(
          `A tier with the name "${req.body.name}" already exists.`,
          409
        )
      );
    }
    next(new AppError("Failed to update tier.", 500));
  }
};

exports.deleteTier = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (id <= 3) {
      return next(new AppError("Cannot delete default tiers.", 400));
    }

    const userCheck = await req.db.query(
      'SELECT COUNT(*) FROM users WHERE "tierId" = $1',
      [id]
    );
    if (parseInt(userCheck.rows[0].count, 10) > 0) {
      return next(
        new AppError("Cannot delete tier as it is assigned to users.", 400)
      );
    }

    const { rowCount } = await req.db.query("DELETE FROM tiers WHERE id = $1", [
      id,
    ]);

    if (rowCount === 0) {
      return next(new AppError("Tier not found.", 404));
    }

    tierLimitsCache.delete(parseInt(id, 10));

    res.status(204).send();
  } catch (error) {
    logger.error("Delete Tier Error:", {
      message: error.message,
      stack: error.stack,
      tierId: req.params.id,
    });
    next(new AppError("Failed to delete tier.", 500));
  }
};
