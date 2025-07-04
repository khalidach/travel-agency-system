// backend/controllers/authController.js
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

const generateToken = (id, role, adminId, tierId) => {
  return jwt.sign({ id, role, adminId, tierId }, process.env.JWT_SECRET, {
    expiresIn: "1h",
  });
};

const loginUser = async (req, res) => {
  const { username, password } = req.body;
  try {
    // Check users table (admins and owners)
    let userResult = await req.db.query(
      "SELECT * FROM users WHERE username = $1",
      [username]
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
          token: generateToken(user.id, user.role, user.id, user.tierId),
        });
      }
    }

    // If not an admin/owner, check employees table
    let employeeResult = await req.db.query(
      "SELECT * FROM employees WHERE username = $1",
      [username]
    );

    if (employeeResult.rows.length > 0) {
      const employee = employeeResult.rows[0];
      const adminResult = await req.db.query(
        'SELECT "agencyName", "activeUser", "tierId" FROM users WHERE id = $1',
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
  const { id, role, adminId, agencyName, tierId } = req.user;
  res.json({
    id,
    username: req.user.username,
    agencyName,
    role,
    adminId,
    tierId,
    token: generateToken(id, role, adminId, tierId),
  });
};

module.exports = { loginUser, refreshToken };
