const bcrypt = require("bcryptjs");

// Only admins can create employees
exports.createEmployee = async (req, res) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Not authorized" });
  }
  const { username, password, role } = req.body;
  const adminId = req.user.id;

  if (!username || !password || !role) {
    return res.status(400).json({ message: "Please provide all fields" });
  }

  try {
    // Check employee limit by fetching the admin's specific limit from the users table
    const adminUser = await req.db.query(
      'SELECT "totalEmployees" FROM users WHERE id = $1',
      [adminId]
    );
    // Default to 2 if the column is somehow null
    const employeeLimit = adminUser.rows[0]?.totalEmployees ?? 2;

    const countResult = await req.db.query(
      'SELECT COUNT(*) FROM employees WHERE "adminId" = $1',
      [adminId]
    );
    const employeeCount = parseInt(countResult.rows[0].count, 10);

    // Enforce the dynamic limit per admin
    if (employeeCount >= employeeLimit) {
      return res
        .status(403)
        .json({ message: `You can only create ${employeeLimit} employees.` });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const { rows } = await req.db.query(
      'INSERT INTO employees (username, password, role, "adminId") VALUES ($1, $2, $3, $4) RETURNING id, username, role, "adminId"',
      [username, hashedPassword, role, adminId]
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

// Get all employees for the logged-in admin
exports.getEmployees = async (req, res) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Not authorized" });
  }
  try {
    const { rows } = await req.db.query(
      'SELECT id, username, role FROM employees WHERE "adminId" = $1',
      [req.user.id]
    );
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// Update an employee
exports.updateEmployee = async (req, res) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Not authorized" });
  }
  const { id } = req.params;
  const { username, password, role } = req.body;

  try {
    let hashedPassword;
    if (password) {
      const salt = await bcrypt.genSalt(10);
      hashedPassword = await bcrypt.hash(password, salt);
    }

    const { rows } = await req.db.query(
      `UPDATE employees SET 
                username = COALESCE($1, username), 
                password = COALESCE($2, password), 
                role = COALESCE($3, role) 
             WHERE id = $4 AND "adminId" = $5 RETURNING id, username, role`,
      [username, hashedPassword, role, id, req.user.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "Employee not found" });
    }
    res.json(rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// Delete an employee
exports.deleteEmployee = async (req, res) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Not authorized" });
  }
  const { id } = req.params;
  try {
    const { rowCount } = await req.db.query(
      'DELETE FROM employees WHERE id = $1 AND "adminId" = $2',
      [id, req.user.id]
    );
    if (rowCount === 0) {
      return res.status(404).json({ message: "Employee not found" });
    }
    res.json({ message: "Employee deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};
