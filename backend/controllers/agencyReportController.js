// backend/controllers/agencyReportController.js
const AppError = require("../utils/appError");
const logger = require("../utils/logger");

/**
 * Retrieves a detailed performance report for a specific sub-agency (admin user).
 * This report includes counts of programs, bookings, daily services, and factures,
 * filtered by an optional date range.
 */
exports.getAgencyDetailedReport = async (req, res, next) => {
  try {
    const { adminId } = req.params;
    const { startDate, endDate } = req.query;

    const isValidDate = (dateString) =>
      dateString && !isNaN(new Date(dateString));

    // Base query parameters and date filtering setup
    const queryParams = [adminId];
    let dateFilterClause = "";
    let paramIndex = 2;

    if (isValidDate(startDate) && isValidDate(endDate)) {
      queryParams.push(startDate, endDate);
      dateFilterClause = `AND "createdAt" BETWEEN $${paramIndex}::date AND $${
        paramIndex + 1
      }::date`;
      paramIndex += 2;
    }

    // 1. Get Agency/Admin Info
    const adminQuery = await req.db.query(
      'SELECT "agencyName" FROM users WHERE id = $1',
      [adminId]
    );

    if (adminQuery.rows.length === 0) {
      return next(new AppError("Agency not found.", 404));
    }
    const agencyName = adminQuery.rows[0].agencyName;

    // 2. Get Programs Count and List
    const programsQuery = await req.db.query(
      `SELECT COUNT(id) as count, COALESCE(json_agg(name) FILTER (WHERE 1=1 ${dateFilterClause}), '[]') as programs_list
       FROM programs
       WHERE "userId" = $1 ${dateFilterClause}`,
      queryParams
    );

    // 3. Get Bookings Count
    const bookingsQuery = await req.db.query(
      `SELECT COUNT(*) as count
       FROM bookings
       WHERE "userId" = $1 ${dateFilterClause}`,
      queryParams
    );

    // 4. Get Daily Services Count
    const dailyServicesQuery = await req.db.query(
      `SELECT COUNT(*) as count
       FROM daily_services
       WHERE "userId" = $1 ${dateFilterClause}`,
      queryParams
    );

    // 5. Get Factures Count
    const facturesQuery = await req.db.query(
      `SELECT COUNT(*) as count
       FROM factures
       WHERE "userId" = $1 ${dateFilterClause}`,
      queryParams
    );

    const programsCount = parseInt(programsQuery.rows[0].count, 10);
    const programsList = programsQuery.rows[0].programs_list || [];

    const report = {
      agencyName,
      programsCount: programsCount,
      programsList: programsList,
      bookingsCount: parseInt(bookingsQuery.rows[0].count, 10),
      dailyServicesCount: parseInt(dailyServicesQuery.rows[0].count, 10),
      facturesCount: parseInt(facturesQuery.rows[0].count, 10),
      dateRange: { startDate, endDate },
    };

    res.status(200).json(report);
  } catch (error) {
    logger.error("Get Agency Detailed Report Error:", {
      message: error.message,
      stack: error.stack,
      adminId: req.params.adminId,
    });
    next(new AppError("Failed to retrieve agency detailed report.", 500));
  }
};

/**
 * Retrieves summarized data for all admin users (agencies).
 * Used for the owner's agency list page.
 */
exports.getAgenciesSummaryReport = async (req, res, next) => {
  try {
    // Only fetch users with role 'admin' (which represent the sub-agencies)
    const { rows } = await req.db.query(
      `
      SELECT
        u.id as "agencyId",
        u."agencyName",
        u.username,
        u."activeUser",
        (SELECT COUNT(*) FROM programs p WHERE p."userId" = u.id) as "programsCount",
        (SELECT COUNT(*) FROM bookings b WHERE b."userId" = u.id) as "bookingsCount",
        (SELECT COUNT(*) FROM factures f WHERE f."userId" = u.id) as "facturesCount"
      FROM users u
      WHERE u.role = 'admin'
      ORDER BY u.id ASC
    `
    );

    const summary = rows.map((row) => ({
      ...row,
      programsCount: parseInt(row.programsCount, 10),
      bookingsCount: parseInt(row.bookingsCount, 10),
      facturesCount: parseInt(row.facturesCount, 10),
    }));

    res.status(200).json(summary);
  } catch (error) {
    logger.error("Get Agencies Summary Report Error:", {
      message: error.message,
      stack: error.stack,
    });
    next(new AppError("Failed to retrieve agencies summary report.", 500));
  }
};
