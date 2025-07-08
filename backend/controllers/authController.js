// backend/controllers/authController.js
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

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
      // Return null or an empty object if parsing fails
      return null;
    }
  }
  // Return data as is if it's already an object (or null/undefined)
  return data;
};

const loginUser = async (req, res) => {
  const { username, password } = req.body;
  const trimmedUsername = username.trim(); // Trim whitespace from username
  try {
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

      // Check if user is active
      if (user.activeUser === false) {
        return res.status(401).json({ message: "Account is deactivated." });
      }

      if (await bcrypt.compare(password, user.password)) {
        return res.json({
          id: user.id,
          username: user.username,
          agencyName: user.agencyName,
          role: user.role,
          activeUser: user.activeUser,
          tierId: user.tierId,
          // FIX: Ensure limits are always parsed to objects
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

      // Check if the admin of the employee is active
      if (adminData.activeUser === false) {
        return res
          .status(401)
          .json({ message: "Agency account is deactivated." });
      }

      if (await bcrypt.compare(password, employee.password)) {
        return res.json({
          id: employee.id,
          username: employee.username,
          agencyName: adminData.agencyName || "Agency",
          role: employee.role,
          adminId: employee.adminId,
          activeUser: true, // Employees inherit active status from their admin
          tierId: adminData.tierId,
          // FIX: Ensure limits are always parsed to objects
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

    // If no user found in either table
    res.status(401).json({ message: "Invalid username or password" });
  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

const refreshToken = async (req, res) => {
  // The user object is already fully populated by the 'protect' middleware
  const { id, role, adminId, agencyName, tierId, limits, tierLimits } =
    req.user;
  res.json({
    id,
    username: req.user.username,
    agencyName,
    role,
    adminId,
    tierId,
    // FIX: Ensure limits are always parsed to objects, even on refresh
    limits: safeJsonParse(limits),
    tierLimits: safeJsonParse(tierLimits),
    token: generateToken(id, role, adminId, tierId),
  });
};

module.exports = { loginUser, refreshToken };
