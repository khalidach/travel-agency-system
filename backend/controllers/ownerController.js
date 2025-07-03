// backend/controllers/ownerController.js
const bcrypt = require("bcryptjs");

// Only owner can perform these actions
const authorizeOwner = (req, res, next) => {
  if (req.user.role !== "owner") {
    return res.status(403).json({ message: "Not authorized" });
  }
  next();
};

const getAdminUsers = async (req, res) => {
  try {
    const { rows } = await req.db.query(
      `SELECT id, username, "agencyName", role, "totalEmployees", "activeUser" FROM users WHERE role = 'admin' ORDER BY id ASC`
    );
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

const createAdminUser = async (req, res) => {
  const { username, password, agencyName, totalEmployees } = req.body;

  if (!username || !password || !agencyName) {
    return res.status(400).json({ message: "Please provide all fields" });
  }

  try {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const { rows } = await req.db.query(
      'INSERT INTO users (username, password, "agencyName", role, "totalEmployees", "activeUser") VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, username, "agencyName", role, "totalEmployees", "activeUser"',
      [username, hashedPassword, agencyName, "admin", totalEmployees || 2, true]
    );
    res.status(201).json(rows[0]);
  } catch (error) {
    console.error(error);
    if (error.code === "23505") {
      // unique_violation
      return res.status(400).json({ message: "Username already exists." });
    }
    res.status(500).json({ message: "Server error" });
  }
};

const updateAdminUser = async (req, res) => {
  const { id } = req.params;
  const { username, password, agencyName, totalEmployees } = req.body;

  try {
    let hashedPassword;
    if (password) {
      const salt = await bcrypt.genSalt(10);
      hashedPassword = await bcrypt.hash(password, salt);
    }

    const { rows } = await req.db.query(
      `UPDATE users SET 
        username = COALESCE($1, username), 
        password = COALESCE($2, password), 
        "agencyName" = COALESCE($3, "agencyName"),
        "totalEmployees" = COALESCE($4, "totalEmployees")
       WHERE id = $5 AND role = 'admin' RETURNING id, username, "agencyName", role, "totalEmployees", "activeUser"`,
      [username, hashedPassword, agencyName, totalEmployees, id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "Admin user not found" });
    }
    res.json(rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

const toggleUserStatus = async (req, res) => {
  const { id } = req.params;
  const { activeUser } = req.body;

  if (typeof activeUser !== "boolean") {
    return res
      .status(400)
      .json({ message: "Invalid 'activeUser' value. Must be a boolean." });
  }

  try {
    const { rows } = await req.db.query(
      `UPDATE users SET "activeUser" = $1 WHERE id = $2 AND role = 'admin' RETURNING id, username, "agencyName", role, "totalEmployees", "activeUser"`,
      [activeUser, id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "Admin user not found" });
    }
    res.json(rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

const deleteAdminUser = async (req, res) => {
  const { id } = req.params;
  try {
    // We should also delete related employees, bookings, etc.
    // For now, we'll just delete the user.
    const { rowCount } = await req.db.query(
      "DELETE FROM users WHERE id = $1 AND role = 'admin'",
      [id]
    );
    if (rowCount === 0) {
      return res.status(404).json({ message: "Admin user not found" });
    }
    res.json({ message: "Admin user deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  authorizeOwner,
  getAdminUsers,
  createAdminUser,
  updateAdminUser,
  deleteAdminUser,
  toggleUserStatus,
};
