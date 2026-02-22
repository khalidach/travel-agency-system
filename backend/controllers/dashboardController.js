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
    const servicesFilteredDateParams = [...queryParams];
    const facturesFilteredDateParams = [...queryParams];

    const statsQuery = `
      SELECT
        (SELECT COUNT(*) FROM programs WHERE "userId" = $1) as "activePrograms",
        
        COUNT(*) as "allTimeBookings",
        COALESCE(SUM(b."sellingPrice" - b."remainingBalance"), 0) as "allTimeRevenue",
        
        COUNT(*) FILTER (WHERE 1=1 ${dateFilterClause}) as "filteredBookingsCount",
        COALESCE(SUM(b."sellingPrice" - b."remainingBalance") FILTER (WHERE 1=1 ${dateFilterClause}), 0) as "filteredBookingRevenue",
        COALESCE(SUM(b."sellingPrice" - b."remainingBalance") FILTER (WHERE 1=1 ${dateFilterClause}), 0) as "filteredPaid",

        COALESCE(SUM(CASE WHEN "isFullyPaid" = true THEN 1 ELSE 0 END), 0) as "fullyPaid",
        COALESCE(SUM(CASE WHEN "isFullyPaid" = false THEN 1 ELSE 0 END), 0) as "pending"
      FROM bookings b
      WHERE b."userId" = $1
    `;

    const statsPromise = req.db.query(statsQuery, queryParams);

    // NEW: Query for Daily Services Stats (Count and Revenue)
    let dailyServiceDateFilterClause = "";
    if (isValidDate(startDate) && isValidDate(endDate)) {
      dailyServiceDateFilterClause = `AND date::date BETWEEN $2 AND $3`;
    }
    const dailyServiceStatsQuery = `
      SELECT 
        COUNT(*) FILTER (WHERE 1=1 ${dailyServiceDateFilterClause}) AS "filteredServicesCount",
        COALESCE(SUM("totalPrice" - "remainingBalance") FILTER (WHERE 1=1 ${dailyServiceDateFilterClause}), 0) AS "filteredServiceRevenue",
        COALESCE(SUM("totalPrice" - "remainingBalance"), 0) AS "allTimeServiceRevenue"
      FROM daily_services
      WHERE "userId" = $1
    `;
    const dailyServiceStatsPromise = req.db.query(
      dailyServiceStatsQuery,
      queryParams
    );

    let expenseDateFilterClause = "";
    if (isValidDate(startDate) && isValidDate(endDate)) {
      expenseDateFilterClause = `AND date::date BETWEEN $2 AND $3`;
    }
    const expensesStatsQuery = `
      SELECT
        COALESCE(SUM(amount - "remainingBalance") FILTER (WHERE 1=1 ${expenseDateFilterClause}), 0) AS "filteredExpensesCost",
        COALESCE(SUM(amount - "remainingBalance"), 0) AS "allTimeExpensesCost"
      FROM expenses
      WHERE "userId" = $1 AND type IN ('order_note', 'regular')
    `;
    const expensesStatsPromise = req.db.query(expensesStatsQuery, queryParams);

    // NEW: Query for Factures Count
    let factureDateFilterClause = "";
    if (isValidDate(startDate) && isValidDate(endDate)) {
      factureDateFilterClause = `AND date::date BETWEEN $2 AND $3`;
    }
    const facturesCountQuery = `
      SELECT 
        COUNT(*) AS "filteredFacturesCount"
      FROM factures
      WHERE "userId" = $1 ${factureDateFilterClause}
    `;
    const facturesCountPromise = req.db.query(
      facturesCountQuery,
      facturesFilteredDateParams
    );

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
      dailyServiceStatsResult,
      facturesCountResult,
      programTypeResult,
      recentBookingsResult,
      dailyServiceProfitResult,
      expensesStatsResult,
    ] = await Promise.all([
      statsPromise,
      dailyServiceStatsPromise,
      facturesCountPromise,
      programTypePromise,
      recentBookingsPromise,
      dailyServiceProfitPromise,
      expensesStatsPromise,
    ]);

    const stats = statsResult.rows[0];
    const dailyServiceStats = dailyServiceStatsResult.rows[0];
    const facturesCount = facturesCountResult.rows[0];
    const programTypes = programTypeResult.rows;
    const recentBookings = recentBookingsResult.rows;
    const dailyServiceProfits = dailyServiceProfitResult.rows;
    const expensesStats = expensesStatsResult.rows[0];
    const allTimeCost = parseFloat(expensesStats.allTimeExpensesCost);
    const allTimeRevenue = parseFloat(stats.allTimeRevenue) + parseFloat(dailyServiceStats.allTimeServiceRevenue);
    const allTimeProfit = allTimeRevenue - allTimeCost;

    const filteredBookingRevenue = parseFloat(stats.filteredBookingRevenue);
    const filteredServiceRevenue = parseFloat(
      dailyServiceStats.filteredServiceRevenue
    );
    const filteredCost = parseFloat(expensesStats.filteredExpensesCost);
    const filteredRevenue = filteredBookingRevenue + filteredServiceRevenue; // Combined Revenue
    const filteredProfit = filteredRevenue - filteredCost;
    const filteredPaid = parseFloat(stats.filteredPaid);

    const formattedResponse = {
      allTimeStats: {
        totalBookings: parseInt(stats.allTimeBookings, 10),
        totalRevenue: allTimeRevenue,
        totalProfit: allTimeProfit,
        totalCost: allTimeCost,
      },
      dateFilteredStats: {
        totalBookings: parseInt(stats.filteredBookingsCount, 10),
        totalDailyServices: parseInt(
          dailyServiceStats.filteredServicesCount,
          10
        ),
        totalFactures: parseInt(facturesCount.filteredFacturesCount, 10),
        totalRevenue: filteredRevenue,
        totalCost: filteredCost,
        totalProfit: filteredProfit,
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

    // --- Build WHERE clauses and params ---
    let programWhereClause = `WHERE p."userId" = $1`;
    const programParams = [adminId];
    if (programType && programType !== "all") {
      programWhereClause += ` AND p.type = $2`;
      programParams.push(programType);
    }

    const baseFromClause = `
      FROM programs p
      LEFT JOIN bookings b ON p.id::text = b."tripId" AND b."userId" = p."userId"
      ${programWhereClause}
    `;

    // --- REMOVED: Query for the bar chart (top 6 programs by profit) ---

    // --- Paginated query for the detailed table (unchanged) ---
    let detailedParams = [...programParams];
    detailedParams.push(limit, offset);
    const detailedPerformanceQuery = `
      SELECT
          p.id,
          p.name as "programName",
          p.type,
          COUNT(b.id) as bookings,
          COALESCE(SUM(b."sellingPrice"), 0) as "totalSales",
          COALESCE(pc."totalCost", 0) as "totalCost"
      FROM programs p
      LEFT JOIN bookings b ON p.id::text = b."tripId" AND b."userId" = p."userId"
      LEFT JOIN program_costs pc ON p.id = pc."programId" AND pc."userId" = p."userId"
      ${programWhereClause}
      GROUP BY p.id, pc."totalCost" ORDER BY p."createdAt" DESC
      LIMIT $${programParams.length + 1} OFFSET $${programParams.length + 2}
    `;
    const detailedPerformancePromise = req.db.query(
      detailedPerformanceQuery,
      detailedParams
    );

    // --- Query for summary stats (Total Bookings, Revenue, etc.) (unchanged) ---
    let summaryWhereClause = `WHERE b."userId" = $1`;
    const summaryParams = [adminId];
    if (programType && programType !== "all") {
      summaryWhereClause += ` AND p.type = $2`;
      summaryParams.push(programType);
    }
    const summaryQuery = `
      SELECT 
        COUNT(b.id) as "totalBookings",
        COALESCE(SUM(b."sellingPrice"), 0) as "totalSales"
      FROM bookings b
      LEFT JOIN programs p ON b."tripId"::int = p.id
      ${summaryWhereClause}
    `;
    const summaryPromise = req.db.query(summaryQuery, summaryParams);

    // Query total cost from program_costs
    let costWhereClause = `WHERE pc."userId" = $1`;
    const costParams = [adminId];
    if (programType && programType !== "all") {
      costWhereClause += ` AND p.type = $2`;
      costParams.push(programType);
    }
    const totalCostQuery = `
      SELECT COALESCE(SUM(pc."totalCost"), 0) as "totalCost"
      FROM program_costs pc
      LEFT JOIN programs p ON pc."programId" = p.id
      ${costWhereClause}
    `;
    const totalCostPromise = req.db.query(totalCostQuery, costParams);

    // --- Count query for pagination (counts programs) (unchanged) ---
    const programCountQuery = `
        SELECT COUNT(*)
        FROM programs p
        ${programWhereClause}
    `;
    const programCountPromise = req.db.query(programCountQuery, programParams);

    // --- Monthly trend query (MODIFIED: Count bookings instead of sum profit) ---
    const monthlyTrendQuery = `
        SELECT
            TO_CHAR(b."createdAt", 'YYYY-MM') as month,
            COUNT(b.id) as "bookingsCount" 
        FROM bookings b
        WHERE b."userId" = $1 AND b."createdAt" >= NOW() - INTERVAL '12 months'
        GROUP BY month
        ORDER BY month ASC
    `;
    const monthlyTrendPromise = req.db.query(monthlyTrendQuery, [adminId]);

    const [
      detailedPerformanceResult,
      summaryResult,
      programCountResult,
      monthlyTrendResult,
      totalCostResult,
    ] = await Promise.all([
      detailedPerformancePromise,
      summaryPromise,
      programCountPromise,
      monthlyTrendPromise,
      totalCostPromise,
    ]);

    // --- REMOVED: topProgramsData logic ---
    const detailedPerformanceData = detailedPerformanceResult.rows.map(
      (row) => {
        const totalSales = parseFloat(row.totalSales);
        const totalCost = parseFloat(row.totalCost);
        const totalProfit = totalSales - totalCost;
        return {
          ...row,
          profitMargin: totalSales > 0 ? (totalProfit / totalSales) * 100 : 0,
          totalSales,
          totalProfit,
          totalCost,
          bookings: parseInt(row.bookings, 10),
        };
      }
    );

    const programCount = parseInt(programCountResult.rows[0].count, 10);
    const summaryData = summaryResult.rows[0];
    const summaryTotalCost = parseFloat(totalCostResult.rows[0].totalCost);
    const summaryTotalSales = parseFloat(summaryData.totalSales);

    res.status(200).json({
      // REMOVED: topProgramsData
      detailedPerformanceData,
      monthlyTrend: monthlyTrendResult.rows.map((row) => ({
        ...row,
        bookings: parseInt(row.bookingsCount, 10), // Updated key
      })),
      pagination: {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        totalCount: programCount,
        totalPages: Math.ceil(programCount / limit),
      },
      summary: {
        totalBookings: parseInt(summaryData.totalBookings, 10),
        totalSales: summaryTotalSales,
        totalProfit: summaryTotalSales - summaryTotalCost,
        totalCost: summaryTotalCost,
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
