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
    // The check for employee limit is now handled by the tierMiddleware
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
    const employeesResult = await req.db.query(employeesQuery, [
      req.user.adminId,
    ]);

    // Get the effective limits (custom or tier-based)
    const getLimits = async (req) => {
      if (req.user.limits && Object.keys(req.user.limits).length > 0) {
        return req.user.limits;
      }
      let { tierId } = req.user;
      if (!tierId) tierId = 1;
      const { rows } = await req.db.query(
        "SELECT limits FROM tiers WHERE id = $1",
        [tierId]
      );
      return rows.length > 0 ? rows[0].limits : {};
    };
    const limits = await getLimits(req);
    const employeeLimit = limits.employees ?? 2;

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

// This now only fetches lifetime stats and basic info
exports.getEmployeeAnalysis = async (req, res) => {
  const { username } = req.params;
  const { adminId } = req.user;

  try {
    const employeeRes = await req.db.query(
      'SELECT * FROM employees WHERE username = $1 AND "adminId" = $2',
      [username, adminId]
    );
    if (employeeRes.rows.length === 0) {
      return res.status(404).json({ message: "Employee not found" });
    }
    const employee = employeeRes.rows[0];

    const programsCreatedPromise = req.db.query(
      'SELECT COUNT(*) FROM programs WHERE "employeeId" = $1',
      [employee.id]
    );
    const bookingsMadePromise = req.db.query(
      'SELECT COUNT(*) FROM bookings WHERE "employeeId" = $1',
      [employee.id]
    );
    const dailyServicesMadePromise = req.db.query(
      'SELECT COUNT(*) FROM daily_services WHERE "employeeId" = $1',
      [employee.id]
    );

    const [programsCreatedResult, bookingsMadeResult, dailyServicesMadeResult] =
      await Promise.all([
        programsCreatedPromise,
        bookingsMadePromise,
        dailyServicesMadePromise,
      ]);

    res.json({
      employee,
      programsCreatedCount: parseInt(programsCreatedResult.rows[0].count, 10),
      bookingsMadeCount: parseInt(bookingsMadeResult.rows[0].count, 10),
      dailyServicesMadeCount: parseInt(
        dailyServicesMadeResult.rows[0].count,
        10
      ),
    });
  } catch (error) {
    console.error("Employee Analysis Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// New function for program performance
exports.getEmployeeProgramPerformance = async (req, res) => {
  const { username } = req.params;
  const { adminId } = req.user;
  const { startDate, endDate } = req.query;

  const isValidDate = (dateString) =>
    dateString && !isNaN(new Date(dateString));

  try {
    const employeeRes = await req.db.query(
      'SELECT id FROM employees WHERE username = $1 AND "adminId" = $2',
      [username, adminId]
    );
    if (employeeRes.rows.length === 0) {
      return res.status(404).json({ message: "Employee not found" });
    }
    const employee = employeeRes.rows[0];

    let queryConditions = [`b."employeeId" = $1`];
    const queryParams = [employee.id];
    let paramIndex = 2;

    if (isValidDate(startDate) && isValidDate(endDate)) {
      queryConditions.push(
        `b."createdAt"::date BETWEEN $${paramIndex++} AND $${paramIndex++}`
      );
      queryParams.push(startDate, endDate);
    }

    const whereClause =
      queryConditions.length > 0
        ? `WHERE ${queryConditions.join(" AND ")}`
        : "";

    const performanceQuery = `
        SELECT
            p.name as "programName",
            p.type,
            COUNT(b.id) as "bookingCount",
            COALESCE(SUM(b."sellingPrice"), 0) as "totalSales",
            COALESCE(SUM(b."basePrice"), 0) as "totalCost",
            COALESCE(SUM(b.profit), 0) as "totalProfit"
        FROM programs p
        JOIN bookings b ON p.id::text = b."tripId"
        ${whereClause}
        GROUP BY p.id, p.name, p.type
        ORDER BY "totalProfit" DESC;
    `;

    const summaryQuery = `
        SELECT
            COUNT(*) as totalBookings,
            COALESCE(SUM(b."sellingPrice"), 0) as totalRevenue,
            COALESCE(SUM(b."basePrice"), 0) as totalCost,
            COALESCE(SUM(b.profit), 0) as totalProfit
        FROM bookings b
        LEFT JOIN programs p ON b."tripId" = p.id::text
        ${whereClause}
    `;

    const [performanceResult, summaryResult] = await Promise.all([
      req.db.query(performanceQuery, queryParams),
      req.db.query(summaryQuery, queryParams),
    ]);

    const summary = summaryResult.rows[0] || {};

    res.json({
      programPerformance: performanceResult.rows.map((r) => ({
        ...r,
        bookingCount: parseInt(r.bookingCount, 10),
        totalSales: parseFloat(r.totalSales),
        totalCost: parseFloat(r.totalCost),
        totalProfit: parseFloat(r.totalProfit),
      })),
      programSummary: {
        totalBookings: parseInt(summary.totalbookings || 0, 10),
        totalRevenue: parseFloat(summary.totalrevenue || 0),
        totalCost: parseFloat(summary.totalcost || 0),
        totalProfit: parseFloat(summary.totalprofit || 0),
      },
    });
  } catch (error) {
    console.error("Employee Program Performance Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// New function for service performance
exports.getEmployeeServicePerformance = async (req, res) => {
  const { username } = req.params;
  const { adminId } = req.user;
  const { startDate, endDate } = req.query;

  const isValidDate = (dateString) =>
    dateString && !isNaN(new Date(dateString));

  try {
    const employeeRes = await req.db.query(
      'SELECT id FROM employees WHERE username = $1 AND "adminId" = $2',
      [username, adminId]
    );
    if (employeeRes.rows.length === 0) {
      return res.status(404).json({ message: "Employee not found" });
    }
    const employee = employeeRes.rows[0];

    let queryConditions = [`"employeeId" = $1`];
    const queryParams = [employee.id];
    let paramIndex = 2;

    if (isValidDate(startDate) && isValidDate(endDate)) {
      queryConditions.push(
        `date::date BETWEEN $${paramIndex++} AND $${paramIndex++}`
      );
      queryParams.push(startDate, endDate);
    }

    const whereClause =
      queryConditions.length > 0
        ? `WHERE ${queryConditions.join(" AND ")}`
        : "";

    const performanceQuery = `
        SELECT
            type,
            COUNT(*) as "serviceCount",
            COALESCE(SUM("totalPrice"), 0) as "totalSales",
            COALESCE(SUM("originalPrice"), 0) as "totalCost",
            COALESCE(SUM(profit), 0) as "totalProfit"
        FROM daily_services
        ${whereClause}
        GROUP BY type
        ORDER BY "totalProfit" DESC;
    `;

    const summaryQuery = `
        SELECT
            COUNT(*) as totalServices,
            COALESCE(SUM("totalPrice"), 0) as totalRevenue,
            COALESCE(SUM("originalPrice"), 0) as totalCost,
            COALESCE(SUM(profit), 0) as totalProfit
        FROM daily_services
        ${whereClause}
    `;

    const [performanceResult, summaryResult] = await Promise.all([
      req.db.query(performanceQuery, queryParams),
      req.db.query(summaryQuery, queryParams),
    ]);

    const summary = summaryResult.rows[0] || {};

    res.json({
      dailyServicePerformance: performanceResult.rows.map((r) => ({
        ...r,
        serviceCount: parseInt(r.serviceCount, 10),
        totalSales: parseFloat(r.totalSales),
        totalCost: parseFloat(r.totalCost),
        totalProfit: parseFloat(r.totalProfit),
      })),
      serviceSummary: {
        totalServices: parseInt(summary.totalservices || 0, 10),
        totalRevenue: parseFloat(summary.totalrevenue || 0),
        totalCost: parseFloat(summary.totalcost || 0),
        totalProfit: parseFloat(summary.totalprofit || 0),
      },
    });
  } catch (error) {
    console.error("Employee Service Performance Error:", error);
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
