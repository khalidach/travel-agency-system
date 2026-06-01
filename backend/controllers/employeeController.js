// backend/controllers/employeeController.js
const bcrypt = require("bcryptjs");
const AppError = require("../utils/appError");
const logger = require("../utils/logger");

const getOrCreateHeadquartersBranchId = async (db, adminId) => {
  let result = await db.query(
    'SELECT id FROM branches WHERE "userId" = $1 AND "isHeadquarters" = TRUE LIMIT 1',
    [adminId]
  );
  if (result.rows.length > 0) {
    return result.rows[0].id;
  }
  result = await db.query(
    'SELECT id FROM branches WHERE "userId" = $1 LIMIT 1',
    [adminId]
  );
  if (result.rows.length > 0) {
    return result.rows[0].id;
  }
  const insertResult = await db.query(
    'INSERT INTO branches (name, address, phone, email, "userId", "isHeadquarters") VALUES ($1, $2, $3, $4, $5, TRUE) RETURNING id',
    ["Headquarters", "", "", "", adminId]
  );
  return insertResult.rows[0].id;
};

exports.createEmployee = async (req, res, next) => {
  try {
    if (req.user.role !== "admin") {
      return next(
        new AppError("You are not authorized to perform this action.", 403)
      );
    }
    const { username, password, role, permissions, branchId } = req.body;
    const adminId = req.user.id;

    if (!username || !password || !role) {
      return next(new AppError("Please provide all required fields.", 400));
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    let finalBranchId = branchId;
    if (!finalBranchId) {
      finalBranchId = await getOrCreateHeadquartersBranchId(req.db, adminId);
    }

    const { rows } = await req.db.query(
      'INSERT INTO employees (username, password, role, permissions, "adminId", "branchId") VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, username, role, permissions, "adminId", "branchId"',
      [username, hashedPassword, role, JSON.stringify(permissions || []), adminId, finalBranchId]
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
    const hasViewOthersBookings = req.user.role === "employee" && (req.user.permissions || []).includes("viewOthersBookings");
    if (req.user.role !== "admin" && req.user.role !== "manager" && !hasViewOthersBookings) {
      return next(
        new AppError("You are not authorized to view employees.", 403)
      );
    }
    const employeesQuery = `
      SELECT e.id, e.username, e.role, e.permissions, e.active, e."branchId", br.name as "branchName", COUNT(b.id) as "bookingCount"
      FROM employees e
      LEFT JOIN branches br ON e."branchId" = br.id
      LEFT JOIN bookings b ON e.id = b."employeeId"
      WHERE e."adminId" = $1
      GROUP BY e.id, br.name
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
        permissions: emp.permissions || [],
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
    const facturesCreatedPromise = req.db.query(
      'SELECT COUNT(*) FROM factures WHERE "employeeId" = $1',
      [employee.id]
    );

    const [programsCreatedResult, bookingsMadeResult, dailyServicesMadeResult, facturesCreatedResult] =
      await Promise.all([
        programsCreatedPromise,
        bookingsMadePromise,
        dailyServicesMadePromise,
        facturesCreatedPromise,
      ]);

    res.status(200).json({
      employee,
      programsCreatedCount: parseInt(programsCreatedResult.rows[0].count, 10),
      bookingsMadeCount: parseInt(bookingsMadeResult.rows[0].count, 10),
      dailyServicesMadeCount: parseInt(
        dailyServicesMadeResult.rows[0].count,
        10
      ),
      facturesCreatedCount: parseInt(facturesCreatedResult.rows[0].count, 10),
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
            COALESCE(pc."totalCost", 0) as "totalCost"
        FROM programs p
        JOIN bookings b ON p.id::text = b."tripId"
        LEFT JOIN program_costs pc ON p.id = pc."programId"
        ${whereClause}
        GROUP BY p.id, p.name, p.type, pc."totalCost"
        ORDER BY "totalSales" DESC;
    `;

    const summaryQuery = `
        SELECT
            COUNT(*) as totalBookings,
            COALESCE(SUM(b."sellingPrice"), 0) as totalRevenue
        FROM bookings b
        LEFT JOIN programs p ON b."tripId" = p.id::text
        ${whereClause}
    `;

    // Query total cost from program_costs for this employee's programs
    const costQuery = `
        SELECT COALESCE(SUM(pc."totalCost"), 0) as "totalCost"
        FROM program_costs pc
        JOIN programs p ON pc."programId" = p.id
        JOIN bookings b ON p.id::text = b."tripId"
        ${whereClause}
    `;

    const [performanceResult, summaryResult, costResult] = await Promise.all([
      req.db.query(performanceQuery, queryParams),
      req.db.query(summaryQuery, queryParams),
      req.db.query(costQuery, queryParams),
    ]);

    const summary = summaryResult.rows[0] || {};
    const empTotalCost = parseFloat(costResult.rows[0]?.totalCost || 0);
    const empTotalRevenue = parseFloat(summary.totalrevenue || 0);

    res.status(200).json({
      programPerformance: performanceResult.rows.map((r) => {
        const totalSales = parseFloat(r.totalSales);
        const totalCost = parseFloat(r.totalCost);
        return {
          ...r,
          programId: parseInt(r.programId, 10),
          bookingCount: parseInt(r.bookingCount, 10),
          totalSales,
          totalCost,
          totalProfit: totalSales - totalCost,
        };
      }),
      programSummary: {
        totalBookings: parseInt(summary.totalbookings || 0, 10),
        totalRevenue: empTotalRevenue,
        totalCost: empTotalCost,
        totalProfit: empTotalRevenue - empTotalCost,
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
        WITH ds_calc AS (
          SELECT 
            type,
            profit,
            (SELECT COALESCE(SUM((item->>'quantity')::numeric * (item->>'sellPrice')::numeric), 0) FROM jsonb_array_elements((CASE WHEN jsonb_typeof(items) = 'array' THEN items ELSE '[]'::jsonb END)) as item) as "totalPrice",
            (SELECT COALESCE(SUM((item->>'quantity')::numeric * (item->>'purchasePrice')::numeric), 0) FROM jsonb_array_elements((CASE WHEN jsonb_typeof(items) = 'array' THEN items ELSE '[]'::jsonb END)) as item) as "originalPrice"
          FROM daily_services
          ${whereClause}
        )
        SELECT
            type,
            COUNT(*) as "serviceCount",
            COALESCE(SUM("totalPrice"), 0) as "totalSales",
            COALESCE(SUM("originalPrice"), 0) as "totalCost",
            COALESCE(SUM(profit), 0) as "totalProfit"
        FROM ds_calc
        GROUP BY type
        ORDER BY "totalProfit" DESC;
    `;

    const summaryQuery = `
        WITH ds_calc AS (
          SELECT
            profit,
            (SELECT COALESCE(SUM((item->>'quantity')::numeric * (item->>'sellPrice')::numeric), 0) FROM jsonb_array_elements((CASE WHEN jsonb_typeof(items) = 'array' THEN items ELSE '[]'::jsonb END)) as item) as "totalPrice",
            (SELECT COALESCE(SUM((item->>'quantity')::numeric * (item->>'purchasePrice')::numeric), 0) FROM jsonb_array_elements((CASE WHEN jsonb_typeof(items) = 'array' THEN items ELSE '[]'::jsonb END)) as item) as "originalPrice"
          FROM daily_services
          ${whereClause}
        )
        SELECT
            COUNT(*) as totalServices,
            COALESCE(SUM("totalPrice"), 0) as totalRevenue,
            COALESCE(SUM("originalPrice"), 0) as totalCost,
            COALESCE(SUM(profit), 0) as totalProfit
        FROM ds_calc
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

exports.getEmployeeDetailedAnalytics = async (req, res, next) => {
  try {
    const { username } = req.params;
    const { adminId } = req.user;
    const { startDate, endDate } = req.query;

    const isValidDate = (dateString) =>
      dateString && !isNaN(new Date(dateString));

    const employeeRes = await req.db.query(
      'SELECT id, username FROM employees WHERE username = $1 AND "adminId" = $2',
      [username, adminId]
    );
    if (employeeRes.rows.length === 0) {
      return next(new AppError("Employee not found.", 404));
    }
    const employee = employeeRes.rows[0];

    // Date range filtering conditions
    let bookingDateCond = "";
    let serviceDateCond = "";
    const queryParamsBookings = [employee.id];
    const queryParamsServices = [employee.id];

    if (isValidDate(startDate) && isValidDate(endDate)) {
      bookingDateCond = `AND b."createdAt"::date BETWEEN $2 AND $3`;
      serviceDateCond = `AND date::date BETWEEN $2 AND $3`;
      queryParamsBookings.push(startDate, endDate);
      queryParamsServices.push(startDate, endDate);
    }

    // 1. Get bookings revenue, profit, count grouped by date
    const bookingQuery = `
      SELECT 
        b."createdAt"::date as "date",
        COUNT(b.id)::int as "bookingsCount",
        COALESCE(SUM(b."sellingPrice"), 0)::float as "bookingsRevenue",
        COALESCE(SUM(b."profit"), 0)::float as "bookingsProfit"
      FROM bookings b
      WHERE b."employeeId" = $1 ${bookingDateCond}
      GROUP BY b."createdAt"::date
      ORDER BY "date" ASC;
    `;

    // 2. Get services revenue, profit, count grouped by date
    const serviceQuery = `
      WITH ds_calc AS (
        SELECT 
          date,
          profit,
          (SELECT COALESCE(SUM((item->>'quantity')::numeric * (item->>'sellPrice')::numeric), 0) FROM jsonb_array_elements((CASE WHEN jsonb_typeof(items) = 'array' THEN items ELSE '[]'::jsonb END)) as item) as "totalPrice"
        FROM daily_services
        WHERE "employeeId" = $1 ${serviceDateCond}
      )
      SELECT 
        date,
        COUNT(*)::int as "servicesCount",
        COALESCE(SUM("totalPrice"), 0)::float as "servicesRevenue",
        COALESCE(SUM("profit"), 0)::float as "servicesProfit"
      FROM ds_calc
      GROUP BY date
      ORDER BY date ASC;
    `;

    // 3. Rankings calculations
    let rankDateCondBookings = "";
    let rankDateCondServices = "";
    const rankQueryParams = [adminId, employee.id];
    if (isValidDate(startDate) && isValidDate(endDate)) {
      rankDateCondBookings = `AND b."createdAt"::date BETWEEN $3 AND $4`;
      rankDateCondServices = `AND ds."date" BETWEEN $3 AND $4`;
      rankQueryParams.push(startDate, endDate);
    }

    const rankQuery = `
      WITH employee_booking_revenue AS (
        SELECT "employeeId", COALESCE(SUM("sellingPrice"), 0) as revenue
        FROM bookings b
        WHERE b."userId" = $1 ${rankDateCondBookings}
        GROUP BY "employeeId"
      ),
      employee_service_revenue AS (
        SELECT ds."employeeId", COALESCE(SUM(
          (SELECT COALESCE(SUM((item->>'quantity')::numeric * (item->>'sellPrice')::numeric), 0) FROM jsonb_array_elements((CASE WHEN jsonb_typeof(items) = 'array' THEN items ELSE '[]'::jsonb END)) as item)
        ), 0) as revenue
        FROM daily_services ds
        WHERE ds."userId" = $1 ${rankDateCondServices}
        GROUP BY ds."employeeId"
      ),
      employee_totals AS (
        SELECT 
          e.id,
          e.username,
          COALESCE(br.revenue, 0) + COALESCE(sr.revenue, 0) as total_revenue
        FROM employees e
        LEFT JOIN employee_booking_revenue br ON e.id = br."employeeId"
        LEFT JOIN employee_service_revenue sr ON e.id = sr."employeeId"
        WHERE e."adminId" = $1
      ),
      ranked_employees AS (
        SELECT 
          id,
          username,
          total_revenue,
          RANK() OVER (ORDER BY total_revenue DESC)::int as rank,
          COUNT(*) OVER ()::int as total_count,
          COALESCE(SUM(total_revenue) OVER (), 0)::float as team_total_revenue
        FROM employee_totals
      )
      SELECT rank, total_count, total_revenue, team_total_revenue
      FROM ranked_employees
      WHERE id = $2;
    `;

    // 4. Booking source breakdown
    const sourceQuery = `
      SELECT 
        COALESCE(b."bookingSource", 'Direct') as "source",
        COUNT(b.id)::int as "count",
        COALESCE(SUM(b."sellingPrice"), 0)::float as "revenue"
      FROM bookings b
      WHERE b."employeeId" = $1 ${bookingDateCond}
      GROUP BY b."bookingSource"
      ORDER BY "revenue" DESC;
    `;

    const [bookingRes, serviceRes, rankRes, sourceRes] = await Promise.all([
      req.db.query(bookingQuery, queryParamsBookings),
      req.db.query(serviceQuery, queryParamsServices),
      req.db.query(rankQuery, rankQueryParams),
      req.db.query(sourceQuery, queryParamsBookings),
    ]);

    // Format over-time performance data
    const bookingsData = bookingRes.rows;
    const servicesData = serviceRes.rows;

    const dateMap = {};

    const formatDateStr = (d) => {
      if (!d) return "";
      const dateObj = new Date(d);
      return dateObj.toISOString().split("T")[0];
    };

    bookingsData.forEach((row) => {
      const dStr = formatDateStr(row.date);
      if (!dateMap[dStr]) {
        dateMap[dStr] = {
          date: dStr,
          bookingsCount: 0,
          bookingsRevenue: 0,
          bookingsProfit: 0,
          servicesCount: 0,
          servicesRevenue: 0,
          servicesProfit: 0,
        };
      }
      dateMap[dStr].bookingsCount = row.bookingsCount;
      dateMap[dStr].bookingsRevenue = row.bookingsRevenue;
      dateMap[dStr].bookingsProfit = row.bookingsProfit;
    });

    servicesData.forEach((row) => {
      const dStr = formatDateStr(row.date);
      if (!dateMap[dStr]) {
        dateMap[dStr] = {
          date: dStr,
          bookingsCount: 0,
          bookingsRevenue: 0,
          bookingsProfit: 0,
          servicesCount: 0,
          servicesRevenue: 0,
          servicesProfit: 0,
        };
      }
      dateMap[dStr].servicesCount = row.servicesCount;
      dateMap[dStr].servicesRevenue = row.servicesRevenue;
      dateMap[dStr].servicesProfit = row.servicesProfit;
    });

    const performanceOverTime = Object.values(dateMap).sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    const rankInfo = rankRes.rows[0] || { rank: 1, total_count: 1, total_revenue: 0, team_total_revenue: 0 };

    res.status(200).json({
      employee,
      performanceOverTime,
      ranking: {
        rank: rankInfo.rank,
        totalEmployees: rankInfo.total_count,
        totalRevenue: parseFloat(rankInfo.total_revenue || 0),
        teamTotalRevenue: parseFloat(rankInfo.team_total_revenue || 0),
      },
      sourceBreakdown: sourceRes.rows,
    });
  } catch (error) {
    logger.error("Employee Detailed Analytics Error:", {
      message: error.message,
      stack: error.stack,
      username: req.params.username,
    });
    next(new AppError("Failed to retrieve employee detailed analytics.", 500));
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
    const { username, password, role, permissions, branchId } = req.body;

    let hashedPassword;
    if (password) {
      const salt = await bcrypt.genSalt(10);
      hashedPassword = await bcrypt.hash(password, salt);
    }

    const existingEmp = await req.db.query(
      'SELECT "branchId" FROM employees WHERE id = $1 AND "adminId" = $2',
      [id, req.user.id]
    );
    if (existingEmp.rows.length === 0) {
      return next(new AppError("Employee not found.", 404));
    }
    let finalBranchId = branchId !== undefined ? branchId : existingEmp.rows[0].branchId;
    if (!finalBranchId) {
      finalBranchId = await getOrCreateHeadquartersBranchId(req.db, req.user.id);
    }

    const { rows } = await req.db.query(
      `UPDATE employees SET 
                username = COALESCE($1, username), 
                password = COALESCE($2, password), 
                role = COALESCE($3, role),
                permissions = COALESCE($4, permissions),
                "branchId" = $5 
             WHERE id = $6 AND "adminId" = $7 RETURNING id, username, role, permissions, "branchId"`,
      [username, hashedPassword, role, permissions ? JSON.stringify(permissions) : null, finalBranchId, id, req.user.id]
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
