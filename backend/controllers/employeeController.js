// backend/controllers/employeeController.js
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
    const adminUser = await req.db.query(
      'SELECT "totalEmployees" FROM users WHERE id = $1',
      [adminId]
    );
    const employeeLimit = adminUser.rows[0]?.totalEmployees ?? 2;

    const countResult = await req.db.query(
      'SELECT COUNT(*) FROM employees WHERE "adminId" = $1',
      [adminId]
    );
    const employeeCount = parseInt(countResult.rows[0].count, 10);

    if (employeeCount >= employeeLimit) {
      return res.status(403).json({
        message: `You can only create up to ${employeeLimit} employees.`,
      });
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
      return res.status(400).json({ message: "Username already exists." });
    }
    res.status(500).json({ message: "Server error" });
  }
};

// Get all employees for the logged-in admin or manager, now including booking counts
exports.getEmployees = async (req, res) => {
  if (req.user.role !== "admin" && req.user.role !== "manager") {
    return res.status(403).json({ message: "Not authorized" });
  }
  try {
    const employeesQuery = `
      SELECT e.id, e.username, e.role, COUNT(b.id) as "bookingCount"
      FROM employees e
      LEFT JOIN bookings b ON e.id = b."employeeId"
      WHERE e."adminId" = $1
      GROUP BY e.id
      ORDER BY e.username;
    `;
    const employeesPromise = req.db.query(employeesQuery, [req.user.adminId]);

    const limitPromise = req.db.query(
      'SELECT "totalEmployees" FROM users WHERE id = $1',
      [req.user.adminId]
    );

    const [employeesResult, limitResult] = await Promise.all([
      employeesPromise,
      limitPromise,
    ]);

    const employeeLimit = limitResult.rows[0]?.totalEmployees ?? 2;

    res.json({
      employees: employeesResult.rows.map((emp) => ({
        ...emp,
        bookingCount: parseInt(emp.bookingCount, 10),
      })),
      limit: employeeLimit,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get all analysis data for a single employee
exports.getEmployeeAnalysis = async (req, res) => {
  const { username } = req.params;
  const { adminId } = req.user;
  const { startDate, endDate } = req.query;

  const isValidDate = (dateString) =>
    dateString && !isNaN(new Date(dateString));

  try {
    const employeeRes = await req.db.query(
      'SELECT * FROM employees WHERE username = $1 AND "adminId" = $2',
      [username, adminId]
    );
    if (employeeRes.rows.length === 0) {
      return res.status(404).json({ message: "Employee not found" });
    }
    const employee = employeeRes.rows[0];

    // 1. Lifetime Stats
    const programsCreatedPromise = req.db.query(
      'SELECT COUNT(*) FROM programs WHERE "employeeId" = $1',
      [employee.id]
    );
    const bookingsMadePromise = req.db.query(
      'SELECT COUNT(*) FROM bookings WHERE "employeeId" = $1',
      [employee.id]
    );

    // 2. Program Performance
    const programPerformanceQuery = `
            SELECT
                p.name as "programName",
                p.type,
                COUNT(b.id) as "bookingCount",
                COALESCE(SUM(b."sellingPrice"), 0) as "totalSales",
                COALESCE(SUM(b."basePrice"), 0) as "totalCost",
                COALESCE(SUM(b.profit), 0) as "totalProfit"
            FROM programs p
            JOIN bookings b ON p.id::text = b."tripId"
            WHERE b."employeeId" = $1
            GROUP BY p.id, p.name, p.type
            ORDER BY "totalProfit" DESC;
        `;
    const programPerformancePromise = req.db.query(programPerformanceQuery, [
      employee.id,
    ]);

    // 3. Date-Filtered Stats
    let dateFilterCondition = "";
    const dateFilterParams = [employee.id];
    if (isValidDate(startDate) && isValidDate(endDate)) {
      dateFilterCondition = `AND "createdAt"::date BETWEEN $2 AND $3`;
      dateFilterParams.push(startDate, endDate);
    }

    const dateFilteredQuery = `
            SELECT
                COUNT(*) as totalbookings,
                COALESCE(SUM("sellingPrice"), 0) as totalrevenue,
                COALESCE(SUM("basePrice"), 0) as totalcost,
                COALESCE(SUM(profit), 0) as totalprofit
            FROM bookings
            WHERE "employeeId" = $1 ${dateFilterCondition}
        `;
    const dateFilteredPromise = req.db.query(
      dateFilteredQuery,
      dateFilterParams
    );

    const [
      programsCreatedResult,
      bookingsMadeResult,
      programPerformanceResult,
      dateFilteredResult,
    ] = await Promise.all([
      programsCreatedPromise,
      bookingsMadePromise,
      programPerformancePromise,
      dateFilteredPromise,
    ]);

    const dateFilteredStats = dateFilteredResult.rows[0] || {};

    res.json({
      employee,
      programsCreatedCount: parseInt(programsCreatedResult.rows[0].count, 10),
      bookingsMadeCount: parseInt(bookingsMadeResult.rows[0].count, 10),
      programPerformance: programPerformanceResult.rows.map((r) => ({
        ...r,
        bookingCount: parseInt(r.bookingCount, 10),
        totalSales: parseFloat(r.totalSales),
        totalCost: parseFloat(r.totalCost),
        totalProfit: parseFloat(r.totalProfit),
      })),
      dateFilteredStats: {
        totalBookings: parseInt(dateFilteredStats.totalbookings || 0, 10),
        totalRevenue: parseFloat(dateFilteredStats.totalrevenue || 0),
        totalCost: parseFloat(dateFilteredStats.totalcost || 0),
        totalProfit: parseFloat(dateFilteredStats.totalprofit || 0),
      },
    });
  } catch (error) {
    console.error("Employee Analysis Error:", error);
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
