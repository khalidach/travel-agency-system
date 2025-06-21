const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

const generateToken = (id, role, adminId) => {
  return jwt.sign({ id, role, adminId }, process.env.JWT_SECRET, {
    expiresIn: "1h",
  });
};

const loginUser = async (req, res) => {
  const { username, password } = req.body;
  try {
    // Check users table (admins)
    let userResult = await req.db.query(
      "SELECT * FROM users WHERE username = $1",
      [username]
    );
    if (userResult.rows.length > 0) {
      const user = userResult.rows[0];
      if (await bcrypt.compare(password, user.password)) {
        return res.json({
          id: user.id,
          username: user.username,
          agencyName: user.agencyName,
          role: "admin", // Admins are in the users table
          token: generateToken(user.id, "admin", user.id),
        });
      }
    }

    // If not an admin, check employees table
    let employeeResult = await req.db.query(
      "SELECT * FROM employees WHERE username = $1",
      [username]
    );

    if (employeeResult.rows.length > 0) {
      const employee = employeeResult.rows[0];
      const adminResult = await req.db.query(
        'SELECT "agencyName" FROM users WHERE id = $1',
        [employee.adminId]
      );

      if (await bcrypt.compare(password, employee.password)) {
        return res.json({
          id: employee.id,
          username: employee.username,
          agencyName: adminResult.rows[0]?.agencyName || "Agency",
          role: employee.role,
          adminId: employee.adminId,
          token: generateToken(employee.id, employee.role, employee.adminId),
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
  const { id, role, adminId, agencyName } = req.user;
  res.json({
    id,
    username: req.user.username,
    agencyName,
    role,
    adminId,
    token: generateToken(id, role, adminId),
  });
};

module.exports = { loginUser, refreshToken };
