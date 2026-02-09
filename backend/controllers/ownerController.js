// backend/controllers/ownerController.js
const bcrypt = require("bcryptjs");
const AppError = require("../utils/appError");
const logger = require("../utils/logger");

const authorizeOwner = (req, res, next) => {
  if (req.user.role !== "owner") {
    return next(
      new AppError("You are not authorized to perform this action.", 403),
    );
  }
  next();
};

const getAdminUsers = async (req, res, next) => {
  try {
    const { rows } = await req.db.query(
      `SELECT u.id, u.username, u."agencyName", u.role, u."activeUser", u."tierId", u.limits, t.limits as "tierLimits", u."ownerName", u.phone, u.email 
       FROM users u 
       LEFT JOIN tiers t ON u."tierId" = t.id 
       WHERE u.role = 'admin' ORDER BY u.id ASC`,
    );
    res.status(200).json(rows);
  } catch (error) {
    logger.error("Get Admin Users Error:", {
      message: error.message,
      stack: error.stack,
    });
    next(new AppError("Failed to retrieve admin users.", 500));
  }
};

const createAdminUser = async (req, res, next) => {
  try {
    const { username, password, agencyName, tierId, ownerName, phone, email } =
      req.body;

    if (
      !username ||
      !password ||
      !agencyName ||
      !ownerName ||
      !phone ||
      !email
    ) {
      return next(new AppError("Please provide all required fields.", 400));
    }

    // FIX: Explicitly trim username
    const cleanUsername = username.trim();

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const finalTierId = tierId || 1;

    const { rows } = await req.db.query(
      'INSERT INTO users (username, password, "agencyName", role, "activeUser", "tierId", "ownerName", phone, email) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id, username, "agencyName", role, "activeUser", "tierId", "ownerName", phone, email',
      [
        cleanUsername,
        hashedPassword,
        agencyName,
        "admin",
        true,
        finalTierId,
        ownerName,
        phone,
        email,
      ],
    );
    res.status(201).json(rows[0]);
  } catch (error) {
    logger.error("Create Admin User Error:", {
      message: error.message,
      stack: error.stack,
      body: req.body,
    });
    if (error.code === "23505") {
      return next(new AppError("Username already exists.", 409));
    }
    next(new AppError("Failed to create admin user.", 500));
  }
};

const updateAdminUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { username, password, agencyName, ownerName, phone, email } =
      req.body;

    let hashedPassword;
    if (password) {
      const salt = await bcrypt.genSalt(10);
      hashedPassword = await bcrypt.hash(password, salt);
    }

    // FIX: Trim username if provided
    const cleanUsername = username ? username.trim() : undefined;

    const { rows } = await req.db.query(
      `UPDATE users SET 
        username = COALESCE($1, username), 
        password = COALESCE($2, password), 
        "agencyName" = COALESCE($3, "agencyName"),
        "ownerName" = COALESCE($4, "ownerName"),
        phone = COALESCE($5, phone),
        email = COALESCE($6, email)
       WHERE id = $7 AND role = 'admin' RETURNING id, username, "agencyName", role, "activeUser", "tierId", "ownerName", phone, email`,
      [cleanUsername, hashedPassword, agencyName, ownerName, phone, email, id],
    );

    if (rows.length === 0) {
      return next(new AppError("Admin user not found.", 404));
    }
    res.status(200).json(rows[0]);
  } catch (error) {
    logger.error("Update Admin User Error:", {
      message: error.message,
      stack: error.stack,
      userId: req.params.id,
    });
    next(new AppError("Failed to update admin user.", 500));
  }
};

const toggleUserStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { activeUser } = req.body;

    if (typeof activeUser !== "boolean") {
      return next(
        new AppError("Invalid 'activeUser' value. Must be a boolean.", 400),
      );
    }

    const { rows } = await req.db.query(
      `UPDATE users SET "activeUser" = $1 WHERE id = $2 AND role = 'admin' RETURNING id, username, "agencyName", role, "activeUser", "tierId", "ownerName", phone, email`,
      [activeUser, id],
    );

    if (rows.length === 0) {
      return next(new AppError("Admin user not found.", 404));
    }
    res.status(200).json(rows[0]);
  } catch (error) {
    logger.error("Toggle User Status Error:", {
      message: error.message,
      stack: error.stack,
      userId: req.params.id,
    });
    next(new AppError("Failed to update user status.", 500));
  }
};

const deleteAdminUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { rowCount } = await req.db.query(
      "DELETE FROM users WHERE id = $1 AND role = 'admin'",
      [id],
    );
    if (rowCount === 0) {
      return next(new AppError("Admin user not found.", 404));
    }
    res.status(200).json({ message: "Admin user deleted successfully" });
  } catch (error) {
    logger.error("Delete Admin User Error:", {
      message: error.message,
      stack: error.stack,
      userId: req.params.id,
    });
    next(new AppError("Failed to delete admin user.", 500));
  }
};

const updateAdminTier = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { tierId } = req.body;

    const tierCheck = await req.db.query("SELECT id FROM tiers WHERE id = $1", [
      tierId,
    ]);

    if (tierCheck.rows.length === 0) {
      return next(new AppError("Invalid Tier ID provided.", 400));
    }

    const { rows } = await req.db.query(
      `UPDATE users SET "tierId" = $1 WHERE id = $2 AND role = 'admin' RETURNING id, username, "agencyName", role, "activeUser", "tierId", "ownerName", phone, email`,
      [tierId, id],
    );

    if (rows.length === 0) {
      return next(new AppError("Admin user not found.", 404));
    }
    res.status(200).json(rows[0]);
  } catch (error) {
    logger.error("Update Admin Tier Error:", {
      message: error.message,
      stack: error.stack,
      userId: req.params.id,
    });
    next(new AppError("Failed to update user tier.", 500));
  }
};

const updateAdminUserLimits = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { limits } = req.body;

    if (!limits || typeof limits !== "object") {
      return next(new AppError("Invalid limits data provided.", 400));
    }

    const { rows } = await req.db.query(
      `UPDATE users SET "limits" = $1 WHERE id = $2 AND role = 'admin' RETURNING id, username, "agencyName", role, "activeUser", "tierId", limits, "ownerName", phone, email`,
      [JSON.stringify(limits), id],
    );

    if (rows.length === 0) {
      return next(new AppError("Admin user not found.", 404));
    }
    res.status(200).json(rows[0]);
  } catch (error) {
    logger.error("Update Admin User Limits Error:", {
      message: error.message,
      stack: error.stack,
      userId: req.params.id,
    });
    next(new AppError("Failed to update user limits.", 500));
  }
};

module.exports = {
  authorizeOwner,
  getAdminUsers,
  createAdminUser,
  updateAdminUser,
  deleteAdminUser,
  toggleUserStatus,
  updateAdminTier,
  updateAdminUserLimits,
};
