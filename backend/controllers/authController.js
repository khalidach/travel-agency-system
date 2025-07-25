// backend/controllers/authController.js
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const AppError = require("../utils/appError");
const logger = require("../utils/logger");

const generateToken = (id, role, adminId, tierId) => {
  return jwt.sign({ id, role, adminId, tierId }, process.env.JWT_SECRET, {
    expiresIn: "1h",
  });
};

// Helper to safely parse JSON that might already be an object or a string
const safeJsonParse = (data) => {
  if (typeof data === "string") {
    try {
      return JSON.parse(data);
    } catch (e) {
      logger.warn("Failed to parse JSON data in auth controller", { data });
      return null;
    }
  }
  return data;
};

const loginUser = async (req, res, next) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return next(new AppError("Please provide username and password.", 400));
    }
    const trimmedUsername = username.trim();

    // Check users table (admins and owners)
    let userResult = await req.db.query(
      `SELECT u.*, t.limits as "tierLimits"
       FROM users u
       LEFT JOIN tiers t ON u."tierId" = t.id
       WHERE u.username = $1`,
      [trimmedUsername]
    );

    if (userResult.rows.length > 0) {
      const user = userResult.rows[0];
      if (user.activeUser === false) {
        return next(new AppError("This account has been deactivated.", 401));
      }
      if (await bcrypt.compare(password, user.password)) {
        logger.info(`User login successful: ${user.username}`);
        return res.status(200).json({
          id: user.id,
          username: user.username,
          agencyName: user.agencyName,
          role: user.role,
          activeUser: user.activeUser,
          tierId: user.tierId,
          limits: safeJsonParse(user.limits),
          tierLimits: safeJsonParse(user.tierLimits),
          token: generateToken(user.id, user.role, user.id, user.tierId),
        });
      }
    }

    // If not an admin/owner, check employees table
    let employeeResult = await req.db.query(
      "SELECT * FROM employees WHERE username = $1",
      [trimmedUsername]
    );

    if (employeeResult.rows.length > 0) {
      const employee = employeeResult.rows[0];
      const adminResult = await req.db.query(
        `SELECT u."agencyName", u."activeUser", u."tierId", u.limits, t.limits as "tierLimits"
         FROM users u
         LEFT JOIN tiers t ON u."tierId" = t.id
         WHERE u.id = $1`,
        [employee.adminId]
      );

      const adminData = adminResult.rows[0] || {};
      if (adminData.activeUser === false) {
        return next(
          new AppError("The agency for this account has been deactivated.", 401)
        );
      }

      if (await bcrypt.compare(password, employee.password)) {
        logger.info(`Employee login successful: ${employee.username}`);
        return res.status(200).json({
          id: employee.id,
          username: employee.username,
          agencyName: adminData.agencyName || "Agency",
          role: employee.role,
          adminId: employee.adminId,
          activeUser: true,
          tierId: adminData.tierId,
          limits: safeJsonParse(adminData.limits),
          tierLimits: safeJsonParse(adminData.tierLimits),
          token: generateToken(
            employee.id,
            employee.role,
            employee.adminId,
            adminData.tierId
          ),
        });
      }
    }

    // If no user found or password incorrect
    return next(new AppError("Invalid username or password.", 401));
  } catch (error) {
    logger.error("Login Error:", {
      message: error.message,
      stack: error.stack,
    });
    return next(
      new AppError("An error occurred during login. Please try again.", 500)
    );
  }
};

const refreshToken = async (req, res, next) => {
  try {
    const {
      id,
      role,
      adminId,
      agencyName,
      tierId,
      limits,
      tierLimits,
      username,
    } = req.user;
    logger.info(`Token refreshed for user: ${username}`);
    res.status(200).json({
      id,
      username: username,
      agencyName,
      role,
      adminId,
      tierId,
      limits: safeJsonParse(limits),
      tierLimits: safeJsonParse(tierLimits),
      token: generateToken(id, role, adminId, tierId),
    });
  } catch (error) {
    logger.error("Token Refresh Error:", {
      message: error.message,
      stack: error.stack,
    });
    return next(
      new AppError("Could not refresh token. Please log in again.", 500)
    );
  }
};

module.exports = { loginUser, refreshToken };
