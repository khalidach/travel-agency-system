// backend/controllers/branchController.js
const AppError = require("../utils/appError");
const logger = require("../utils/logger");

exports.getAllBranches = async (req, res, next) => {
  try {
    const adminId = req.user.role === "admin" || req.user.role === "owner" ? req.user.id : req.user.adminId;
    const { rows } = await req.db.query(
      'SELECT * FROM branches WHERE "userId" = $1 ORDER BY name ASC',
      [adminId]
    );
    res.status(200).json(rows);
  } catch (error) {
    logger.error("Get Branches Error:", error);
    next(new AppError("Failed to fetch branches", 500));
  }
};

exports.createBranch = async (req, res, next) => {
  try {
    if (req.user.role !== "admin" && req.user.role !== "owner") {
      return next(new AppError("Unauthorized: Only admins can manage branches.", 403));
    }
    const { name, address, phone, email } = req.body;
    if (!name) {
      return next(new AppError("Branch name is required.", 400));
    }
    const adminId = req.user.id;
    const { rows } = await req.db.query(
      'INSERT INTO branches (name, address, phone, email, "userId") VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [name, address || "", phone || "", email || "", adminId]
    );
    res.status(201).json(rows[0]);
  } catch (error) {
    logger.error("Create Branch Error:", error);
    next(new AppError("Failed to create branch", 500));
  }
};

exports.updateBranch = async (req, res, next) => {
  try {
    if (req.user.role !== "admin" && req.user.role !== "owner") {
      return next(new AppError("Unauthorized: Only admins can manage branches.", 403));
    }
    const { id } = req.params;
    const { name, address, phone, email } = req.body;
    if (!name) {
      return next(new AppError("Branch name is required.", 400));
    }
    const { rows } = await req.db.query(
      'UPDATE branches SET name = $1, address = $2, phone = $3, email = $4 WHERE id = $5 AND "userId" = $6 RETURNING *',
      [name, address || "", phone || "", email || "", id, req.user.id]
    );
    if (rows.length === 0) {
      return next(new AppError("Branch not found or unauthorized.", 404));
    }
    res.status(200).json(rows[0]);
  } catch (error) {
    logger.error("Update Branch Error:", error);
    next(new AppError("Failed to update branch", 500));
  }
};

exports.deleteBranch = async (req, res, next) => {
  try {
    if (req.user.role !== "admin" && req.user.role !== "owner") {
      return next(new AppError("Unauthorized: Only admins can manage branches.", 403));
    }
    const { id } = req.params;
    const result = await req.db.query(
      'DELETE FROM branches WHERE id = $1 AND "userId" = $2 RETURNING id',
      [id, req.user.id]
    );
    if (result.rowCount === 0) {
      return next(new AppError("Branch not found or unauthorized.", 404));
    }
    res.status(200).json({ message: "Branch deleted successfully" });
  } catch (error) {
    logger.error("Delete Branch Error:", error);
    next(new AppError("Failed to delete branch", 500));
  }
};
