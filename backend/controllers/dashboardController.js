// backend/controllers/dashboardController.js
const AppError = require("../utils/appError");
const logger = require("../utils/logger");

const getDashboardStats = async (req, res, next) => {
  try {
    const { adminId } = req.user;
    const { startDate, endDate } = req.query;

    const isValidDate = (dateString) =>
      dateString && !isNaN(new Date(dateString));

    let dateFilterClause = "";
    const queryParams = [adminId];
    if (isValidDate(startDate) && isValidDate(endDate)) {
      queryParams.push(startDate, endDate);
      dateFilterClause = `AND b."createdAt"::date BETWEEN $2 AND $3`;
    }

    const statsQuery = `
      SELECT
        (SELECT COUNT(*) FROM programs WHERE "userId" = $1) as "activePrograms",
        
        COUNT(*) as "allTimeBookings",
        COALESCE(SUM(b."sellingPrice"), 0) as "allTimeRevenue",
        COALESCE(SUM(b.profit), 0) as "allTimeProfit",
        
        COUNT(*) FILTER (WHERE 1=1 ${dateFilterClause}) as "filteredBookingsCount",
        COALESCE(SUM(b."sellingPrice") FILTER (WHERE 1=1 ${dateFilterClause}), 0) as "filteredRevenue",
        COALESCE(SUM(b.profit) FILTER (WHERE 1=1 ${dateFilterClause}), 0) as "filteredProfit",
        COALESCE(SUM(b."basePrice") FILTER (WHERE 1=1 ${dateFilterClause}), 0) as "filteredCost",
        COALESCE(SUM(b."sellingPrice" - b."remainingBalance") FILTER (WHERE 1=1 ${dateFilterClause}), 0) as "filteredPaid",

        COALESCE(SUM(CASE WHEN "isFullyPaid" = true THEN 1 ELSE 0 END), 0) as "fullyPaid",
        COALESCE(SUM(CASE WHEN "isFullyPaid" = false THEN 1 ELSE 0 END), 0) as "pending"
      FROM bookings b
      WHERE b."userId" = $1
    `;

    const statsPromise = req.db.query(statsQuery, queryParams);

    const programTypePromise = req.db.query(
      `SELECT type, COUNT(*) as count FROM programs WHERE "userId" = $1 GROUP BY type`,
      [adminId]
    );
    const recentBookingsPromise = req.db.query(
      `SELECT id, "clientNameFr", "passportNumber", "sellingPrice", "isFullyPaid"
       FROM bookings WHERE "userId" = $1
       ORDER BY "createdAt" DESC
       LIMIT 3`,
      [adminId]
    );
    const dailyServiceProfitPromise = req.db.query(
      `SELECT type, COALESCE(SUM(profit), 0) as "totalProfit" 
       FROM daily_services 
       WHERE "userId" = $1 
       GROUP BY type`,
      [adminId]
    );

    const [
      statsResult,
      programTypeResult,
      recentBookingsResult,
      dailyServiceProfitResult,
    ] = await Promise.all([
      statsPromise,
      programTypePromise,
      recentBookingsPromise,
      dailyServiceProfitPromise,
    ]);

    const stats = statsResult.rows[0];
    const programTypes = programTypeResult.rows;
    const recentBookings = recentBookingsResult.rows;
    const dailyServiceProfits = dailyServiceProfitResult.rows;

    const filteredRevenue = parseFloat(stats.filteredRevenue);
    const filteredPaid = parseFloat(stats.filteredPaid);

    const formattedResponse = {
      allTimeStats: {
        totalBookings: parseInt(stats.allTimeBookings, 10),
        totalRevenue: parseFloat(stats.allTimeRevenue),
        totalProfit: parseFloat(stats.allTimeProfit),
        activePrograms: parseInt(stats.activePrograms, 10),
      },
      dateFilteredStats: {
        totalBookings: parseInt(stats.filteredBookingsCount, 10),
        totalRevenue: filteredRevenue,
        totalProfit: parseFloat(stats.filteredProfit),
        totalCost: parseFloat(stats.filteredCost),
        totalPaid: filteredPaid,
        totalRemaining: filteredRevenue - filteredPaid,
      },
      programTypeData: {
        Hajj:
          parseInt(programTypes.find((p) => p.type === "Hajj")?.count, 10) || 0,
        Umrah:
          parseInt(programTypes.find((p) => p.type === "Umrah")?.count, 10) ||
          0,
        Tourism:
          parseInt(programTypes.find((p) => p.type === "Tourism")?.count, 10) ||
          0,
      },
      dailyServiceProfitData: dailyServiceProfits.map((item) => ({
        type: item.type,
        totalProfit: parseFloat(item.totalProfit),
      })),
      paymentStatus: {
        fullyPaid: parseInt(stats.fullyPaid, 10) || 0,
        pending: parseInt(stats.pending, 10) || 0,
      },
      recentBookings: recentBookings,
    };

    res.status(200).json(formattedResponse);
  } catch (error) {
    logger.error("Dashboard Stats Error:", {
      message: error.message,
      stack: error.stack,
    });
    next(new AppError("Failed to retrieve dashboard statistics.", 500));
  }
};

const getProfitReport = async (req, res, next) => {
  try {
    const { adminId } = req.user;
    const { programType, page = 1, limit = 7 } = req.query;
    const offset = (page - 1) * limit;

    // Query for the bar chart (top 6 programs by profit)
    let topProgramsQuery = `
            SELECT
                p.id,
                p.name as "programName",
                p.type,
                COUNT(b.id) as bookings,
                COALESCE(SUM(b."sellingPrice"), 0) as "totalSales",
                COALESCE(SUM(b.profit), 0) as "totalProfit",
                COALESCE(SUM(b."basePrice"), 0) as "totalCost"
            FROM programs p
            LEFT JOIN bookings b ON p.id::text = b."tripId" AND b."userId" = p."userId"
            WHERE p."userId" = $1
        `;
    const topProgramsParams = [adminId];
    if (programType && programType !== "all") {
      topProgramsQuery += ` AND p.type = $2`;
      topProgramsParams.push(programType);
    }
    topProgramsQuery += ` GROUP BY p.id ORDER BY "totalProfit" DESC LIMIT 6`;
    const topProgramsPromise = req.db.query(
      topProgramsQuery,
      topProgramsParams
    );

    // Paginated query for the detailed table
    let detailedPerformanceWhere = `WHERE p."userId" = $1`;
    const detailedPerformanceParams = [adminId];
    let paramIndex = 2;
    if (programType && programType !== "all") {
      detailedPerformanceWhere += ` AND p.type = $${paramIndex++}`;
      detailedPerformanceParams.push(programType);
    }

    const detailedPerformanceQuery = `
        SELECT
            p.id,
            p.name as "programName",
            p.type,
            COUNT(b.id) as bookings,
            COALESCE(SUM(b."sellingPrice"), 0) as "totalSales",
            COALESCE(SUM(b.profit), 0) as "totalProfit",
            COALESCE(SUM(b."basePrice"), 0) as "totalCost"
        FROM programs p
        LEFT JOIN bookings b ON p.id::text = b."tripId" AND b."userId" = p."userId"
        ${detailedPerformanceWhere}
        GROUP BY p.id ORDER BY p."createdAt" DESC
        LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;
    detailedPerformanceParams.push(limit, offset);
    const detailedPerformancePromise = req.db.query(
      detailedPerformanceQuery,
      detailedPerformanceParams
    );

    // Count query for pagination
    const totalCountQuery = `
        SELECT COUNT(DISTINCT p.id)
        FROM programs p
        LEFT JOIN bookings b ON p.id::text = b."tripId" AND b."userId" = p."userId"
        ${detailedPerformanceWhere}
    `;
    const totalCountParams = [adminId];
    if (programType && programType !== "all") {
      totalCountParams.push(programType);
    }
    const totalCountPromise = req.db.query(totalCountQuery, totalCountParams);

    // Monthly trend query remains the same
    const monthlyTrendQuery = `
            SELECT
                TO_CHAR(b."createdAt", 'YYYY-MM') as month,
                SUM(b.profit) as profit
            FROM bookings b
            WHERE b."userId" = $1 AND b."createdAt" >= NOW() - INTERVAL '12 months'
            GROUP BY month
            ORDER BY month ASC
        `;
    const monthlyTrendPromise = req.db.query(monthlyTrendQuery, [adminId]);

    const [
      topProgramsResult,
      detailedPerformanceResult,
      totalCountResult,
      monthlyTrendResult,
    ] = await Promise.all([
      topProgramsPromise,
      detailedPerformancePromise,
      totalCountPromise,
      monthlyTrendPromise,
    ]);

    const topProgramsData = topProgramsResult.rows.map((row) => ({
      ...row,
      totalSales: parseFloat(row.totalSales),
      totalProfit: parseFloat(row.totalProfit),
      totalCost: parseFloat(row.totalCost),
      bookings: parseInt(row.bookings, 10),
    }));

    const detailedPerformanceData = detailedPerformanceResult.rows.map(
      (row) => ({
        ...row,
        profitMargin:
          parseFloat(row.totalSales) > 0
            ? (parseFloat(row.totalProfit) / parseFloat(row.totalSales)) * 100
            : 0,
        totalSales: parseFloat(row.totalSales),
        totalProfit: parseFloat(row.totalProfit),
        totalCost: parseFloat(row.totalCost),
        bookings: parseInt(row.bookings, 10),
      })
    );

    const totalCount = parseInt(totalCountResult.rows[0].count, 10);

    res.status(200).json({
      topProgramsData,
      detailedPerformanceData,
      monthlyTrend: monthlyTrendResult.rows.map((row) => ({
        ...row,
        profit: parseFloat(row.profit),
      })),
      pagination: {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    logger.error("Profit Report Error:", {
      message: error.message,
      stack: error.stack,
    });
    next(new AppError("Failed to retrieve profit report.", 500));
  }
};

module.exports = {
  getDashboardStats,
  getProfitReport,
};
