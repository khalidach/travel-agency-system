// backend/controllers/employeeController.js
const bcrypt = require("bcryptjs");
const AppError = require("../utils/appError");
const logger = require("../utils/logger");

exports.createEmployee = async (req, res, next) => {
  try {
    if (req.user.role !== "admin") {
      return next(
        new AppError("You are not authorized to perform this action.", 403)
      );
    }
    const { username, password, role } = req.body;
    const adminId = req.user.id;

    if (!username || !password || !role) {
      return next(new AppError("Please provide all required fields.", 400));
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const { rows } = await req.db.query(
      'INSERT INTO employees (username, password, role, "adminId") VALUES ($1, $2, $3, $4) RETURNING id, username, role, "adminId"',
      [username, hashedPassword, role, adminId]
    );
    res.status(201).json(rows[0]);
  } catch (error) {
    logger.error("Create Employee Error:", {
      message: error.message,
      stack: error.stack,
      body: req.body,
    });
    if (error.code === "23505") {
      return next(new AppError("Username already exists.", 409));
    }
    next(new AppError("Failed to create employee.", 500));
  }
};

exports.getEmployees = async (req, res, next) => {
  try {
    if (req.user.role !== "admin" && req.user.role !== "manager") {
      return next(
        new AppError("You are not authorized to view employees.", 403)
      );
    }
    const employeesQuery = `
      SELECT e.id, e.username, e.role, e.active, COUNT(b.id) as "bookingCount"
      FROM employees e
      LEFT JOIN bookings b ON e.id = b."employeeId"
      WHERE e."adminId" = $1
      GROUP BY e.id
      ORDER BY e.username;
    `;
    const employeesResult = await req.db.query(employeesQuery, [
      req.user.adminId,
    ]);

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

    res.status(200).json({
      employees: employeesResult.rows.map((emp) => ({
        ...emp,
        bookingCount: parseInt(emp.bookingCount, 10),
      })),
      limit: employeeLimit,
    });
  } catch (error) {
    logger.error("Get Employees Error:", {
      message: error.message,
      stack: error.stack,
    });
    next(new AppError("Failed to retrieve employees.", 500));
  }
};

exports.getEmployeeAnalysis = async (req, res, next) => {
  try {
    const { username } = req.params;
    const { adminId } = req.user;

    const employeeRes = await req.db.query(
      'SELECT * FROM employees WHERE username = $1 AND "adminId" = $2',
      [username, adminId]
    );
    if (employeeRes.rows.length === 0) {
      return next(new AppError("Employee not found.", 404));
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

    res.status(200).json({
      employee,
      programsCreatedCount: parseInt(programsCreatedResult.rows[0].count, 10),
      bookingsMadeCount: parseInt(bookingsMadeResult.rows[0].count, 10),
      dailyServicesMadeCount: parseInt(
        dailyServicesMadeResult.rows[0].count,
        10
      ),
    });
  } catch (error) {
    logger.error("Employee Analysis Error:", {
      message: error.message,
      stack: error.stack,
      username: req.params.username,
    });
    next(new AppError("Failed to retrieve employee analysis.", 500));
  }
};

exports.getEmployeeProgramPerformance = async (req, res, next) => {
  try {
    const { username } = req.params;
    const { adminId } = req.user;
    const { startDate, endDate } = req.query;

    const isValidDate = (dateString) =>
      dateString && !isNaN(new Date(dateString));

    const employeeRes = await req.db.query(
      'SELECT id FROM employees WHERE username = $1 AND "adminId" = $2',
      [username, adminId]
    );
    if (employeeRes.rows.length === 0) {
      return next(new AppError("Employee not found.", 404));
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
            p.id as "programId",
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

    res.status(200).json({
      programPerformance: performanceResult.rows.map((r) => ({
        ...r,
        programId: parseInt(r.programId, 10),
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
    logger.error("Employee Program Performance Error:", {
      message: error.message,
      stack: error.stack,
      username: req.params.username,
    });
    next(new AppError("Failed to retrieve employee program performance.", 500));
  }
};

/**
 * UPDATED: Retrieves a paginated list of detailed bookings for a specific program
 * made by a specific employee, applying optional date filtering.
 */
exports.getEmployeeProgramBookings = async (req, res, next) => {
  try {
    const { username, programId } = req.params;
    const { page = 1, limit = 10, startDate, endDate } = req.query; // Extract pagination params
    const { adminId } = req.user;

    const limitInt = parseInt(limit, 10);
    const offset = (parseInt(page, 10) - 1) * limitInt;

    const isValidDate = (dateString) =>
      dateString && !isNaN(new Date(dateString));

    const employeeRes = await req.db.query(
      'SELECT id FROM employees WHERE username = $1 AND "adminId" = $2',
      [username, adminId]
    );
    if (employeeRes.rows.length === 0) {
      return next(new AppError("Employee not found.", 404));
    }
    const employee = employeeRes.rows[0];

    // Base conditions
    let queryConditions = [
      `b."employeeId" = $1`,
      `b."tripId" = $2`,
      `b."userId" = $3`,
    ];
    const queryParams = [employee.id, programId, adminId];
    let paramIndex = 4;

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

    // 1. Get Total Count
    const countQuery = `
      SELECT COUNT(b.id) AS "totalCount"
      FROM bookings b
      ${whereClause};
    `;
    const countResult = await req.db.query(countQuery, queryParams);
    const totalCount = parseInt(countResult.rows[0].totalCount, 10);

    // 2. Get Paginated Data
    const bookingsQuery = `
        SELECT
            b.id,
            b."clientNameFr" ->> 'lastName' as "lastName",
            b."clientNameFr" ->> 'firstName' as "firstName",
            b."sellingPrice",
            b."createdAt"
        FROM bookings b
        ${whereClause}
        ORDER BY b."createdAt" DESC
        LIMIT $${paramIndex++} OFFSET $${paramIndex++};
    `;

    // Add LIMIT and OFFSET to params
    queryParams.push(limitInt, offset);

    const { rows } = await req.db.query(bookingsQuery, queryParams);

    const bookings = rows.map((row) => ({
      ...row,
      sellingPrice: parseFloat(row.sellingPrice),
      fullName: `${row.lastName} ${row.firstName}`.trim(),
    }));

    res.status(200).json({
      bookings,
      totalCount,
      currentPage: parseInt(page, 10),
      limit: limitInt,
      totalPages: Math.ceil(totalCount / limitInt),
    });
  } catch (error) {
    logger.error("Employee Program Bookings Error:", {
      message: error.message,
      stack: error.stack,
      username: req.params.username,
    });
    next(
      new AppError("Failed to retrieve program bookings for employee.", 500)
    );
  }
};

exports.getEmployeeServicePerformance = async (req, res, next) => {
  try {
    const { username } = req.params;
    const { adminId } = req.user;
    const { startDate, endDate } = req.query;

    const isValidDate = (dateString) =>
      dateString && !isNaN(new Date(dateString));

    const employeeRes = await req.db.query(
      'SELECT id FROM employees WHERE username = $1 AND "adminId" = $2',
      [username, adminId]
    );
    if (employeeRes.rows.length === 0) {
      return next(new AppError("Employee not found.", 404));
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

    res.status(200).json({
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
    logger.error("Employee Service Performance Error:", {
      message: error.message,
      stack: error.stack,
      username: req.params.username,
    });
    next(new AppError("Failed to retrieve employee service performance.", 500));
  }
};
// --- Original functions below, left in place for completeness of other updates ---
exports.updateEmployee = async (req, res, next) => {
  try {
    if (req.user.role !== "admin") {
      return next(
        new AppError("You are not authorized to update employees.", 403)
      );
    }
    const { id } = req.params;
    const { username, password, role } = req.body;

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
      return next(new AppError("Employee not found.", 404));
    }
    res.status(200).json(rows[0]);
  } catch (error) {
    logger.error("Update Employee Error:", {
      message: error.message,
      stack: error.stack,
      employeeId: req.params.id,
    });
    next(new AppError("Failed to update employee.", 500));
  }
};

exports.deleteEmployee = async (req, res, next) => {
  if (req.user.role !== "admin") {
    return next(
      new AppError("You are not authorized to delete employees.", 403)
    );
  }
  const { id } = req.params;
  const client = await req.db.connect();

  try {
    await client.query("BEGIN");

    const employeeCheck = await client.query(
      'SELECT id FROM employees WHERE id = $1 AND "adminId" = $2',
      [id, req.user.id]
    );

    if (employeeCheck.rows.length === 0) {
      await client.query("ROLLBACK");
      return next(new AppError("Employee not found or not authorized.", 404));
    }

    await client.query(
      'UPDATE programs SET "employeeId" = NULL WHERE "employeeId" = $1',
      [id]
    );
    await client.query(
      'UPDATE program_pricing SET "employeeId" = NULL WHERE "employeeId" = $1',
      [id]
    );
    await client.query(
      'UPDATE bookings SET "employeeId" = NULL WHERE "employeeId" = $1',
      [id]
    );
    await client.query(
      'UPDATE daily_services SET "employeeId" = NULL WHERE "employeeId" = $1',
      [id]
    );
    await client.query(
      'UPDATE factures SET "employeeId" = NULL WHERE "employeeId" = $1',
      [id]
    );

    await client.query("DELETE FROM employees WHERE id = $1", [id]);

    await client.query("COMMIT");
    res.status(200).json({ message: "Employee deleted successfully" });
  } catch (error) {
    await client.query("ROLLBACK");
    logger.error("Delete Employee Error:", {
      message: error.message,
      stack: error.stack,
      employeeId: id,
    });
    next(new AppError("Failed to delete employee.", 500));
  } finally {
    client.release();
  }
};

exports.toggleEmployeeStatus = async (req, res, next) => {
  try {
    if (req.user.role !== "admin") {
      return next(
        new AppError("You are not authorized to perform this action.", 403)
      );
    }
    const { id } = req.params;
    const { active } = req.body;

    if (typeof active !== "boolean") {
      return next(
        new AppError("Invalid 'active' value. Must be a boolean.", 400)
      );
    }

    const { rows } = await req.db.query(
      `UPDATE employees SET active = $1 WHERE id = $2 AND "adminId" = $3 RETURNING id, username, role, active`,
      [active, id, req.user.id]
    );

    if (rows.length === 0) {
      return next(new AppError("Employee not found or not authorized.", 404));
    }
    res.status(200).json(rows[0]);
  } catch (error) {
    logger.error("Toggle Employee Status Error:", {
      message: error.message,
      stack: error.stack,
      userId: req.params.id,
    });
    next(new AppError("Failed to update employee status.", 500));
  }
};
