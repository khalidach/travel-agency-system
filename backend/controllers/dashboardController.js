// backend/controllers/dashboardController.js

const AppError = require("../utils/appError");
const logger = require("../utils/logger");
const ProfitReportExcelService = require("../services/ProfitReportExcelService");

const getDashboardStats = async (req, res, next) => {
  try {
    const adminId = req.user.role === "admin" || req.user.role === "owner" ? req.user.id : req.user.adminId;
    const { startDate, endDate } = req.query;
    const branchIdFilter = req.user.role === 'admin' || req.user.role === 'owner' ? req.query.branchId : req.user.branchId;

    const isValidDate = (dateString) =>
      dateString && !isNaN(new Date(dateString));

    const permissions = req.user.permissions || [];

    // 1. Bookings Stats Query
    const bookingsParams = [adminId];
    let bookingsDateFilter = "";
    if (isValidDate(startDate) && isValidDate(endDate)) {
      bookingsParams.push(startDate, endDate);
      bookingsDateFilter = `AND b."createdAt"::date BETWEEN $2 AND $3`;
    }
    let bookingsEmployeeFilter = "";
    if (req.user.role === "employee" && !permissions.includes("viewOthersBookings")) {
      bookingsParams.push(req.user.id);
      bookingsEmployeeFilter = `AND b."employeeId" = $${bookingsParams.length}`;
    }
    let bookingsBranchFilter = "";
    if (branchIdFilter && branchIdFilter !== 'all') {
      bookingsParams.push(branchIdFilter);
      bookingsBranchFilter = `AND b."branchId" = $${bookingsParams.length}`;
    }

    const statsQuery = `
      SELECT
        (SELECT COUNT(*) FROM programs WHERE "userId" = $1) as "activePrograms",
        
        COUNT(*) as "allTimeBookings",
        COALESCE(SUM(b."sellingPrice" - b."remainingBalance"), 0) as "allTimeRevenue",
        
        COUNT(*) FILTER (WHERE 1=1 ${bookingsDateFilter}) as "filteredBookingsCount",
        COALESCE(SUM(b."sellingPrice" - b."remainingBalance") FILTER (WHERE 1=1 ${bookingsDateFilter}), 0) as "filteredBookingRevenue",
        COALESCE(SUM(b."sellingPrice" - b."remainingBalance") FILTER (WHERE 1=1 ${bookingsDateFilter}), 0) as "filteredPaid",

        COALESCE(SUM(CASE WHEN "isFullyPaid" = true THEN 1 ELSE 0 END), 0) as "fullyPaid",
        COALESCE(SUM(CASE WHEN "isFullyPaid" = false THEN 1 ELSE 0 END), 0) as "pending"
      FROM bookings b
      WHERE b."userId" = $1 ${bookingsEmployeeFilter} ${bookingsBranchFilter}
    `;
    const statsPromise = req.db.query(statsQuery, bookingsParams);

    // 2. Daily Services Stats Query
    const dailyServiceStatsParams = [adminId];
    let dailyServiceDateFilterClause = "";
    if (isValidDate(startDate) && isValidDate(endDate)) {
      dailyServiceStatsParams.push(startDate, endDate);
      dailyServiceDateFilterClause = `AND date::date BETWEEN $2 AND $3`;
    }
    let dailyServiceBranchFilterClause = "";
    if (branchIdFilter && branchIdFilter !== 'all') {
      dailyServiceStatsParams.push(branchIdFilter);
      dailyServiceBranchFilterClause = `AND "branchId" = $${dailyServiceStatsParams.length}`;
    }

    const dailyServiceStatsQuery = `
      WITH ds_calc AS (
        SELECT 
          date,
          "remainingBalance",
          (
            SELECT COALESCE(SUM((item->>'quantity')::numeric * (item->>'sellPrice')::numeric), 0) 
            FROM jsonb_array_elements((CASE WHEN jsonb_typeof(items) = 'array' THEN items ELSE '[]'::jsonb END)) as item
          ) as total_price
        FROM daily_services
        WHERE "userId" = $1 ${dailyServiceBranchFilterClause}
      )
      SELECT 
        COUNT(*) FILTER (WHERE 1=1 ${dailyServiceDateFilterClause}) AS "filteredServicesCount",
        COUNT(*) AS "allTimeServicesCount",
        COALESCE(SUM(total_price - COALESCE("remainingBalance", total_price)) FILTER (WHERE 1=1 ${dailyServiceDateFilterClause}), 0) AS "filteredServiceRevenue",
        COALESCE(SUM(total_price - COALESCE("remainingBalance", total_price)), 0) AS "allTimeServiceRevenue"
      FROM ds_calc
    `;
    const dailyServiceStatsPromise = req.db.query(dailyServiceStatsQuery, dailyServiceStatsParams);

    // 3. Expenses Stats Query
    const expensesStatsParams = [adminId];
    let expenseDateFilterClause = "";
    if (isValidDate(startDate) && isValidDate(endDate)) {
      expensesStatsParams.push(startDate, endDate);
      expenseDateFilterClause = `AND date::date BETWEEN $2 AND $3`;
    }
    let expenseBranchFilterClause = "";
    if (branchIdFilter && branchIdFilter !== 'all') {
      expensesStatsParams.push(branchIdFilter);
      expenseBranchFilterClause = `AND "branchId" = $${expensesStatsParams.length}`;
    }

    const expensesStatsQuery = `
      SELECT
        COALESCE(SUM(amount - "remainingBalance") FILTER (WHERE 1=1 ${expenseDateFilterClause}), 0) AS "filteredExpensesCost",
        COALESCE(SUM(amount - "remainingBalance"), 0) AS "allTimeExpensesCost"
      FROM expenses
      WHERE "userId" = $1 AND type IN ('order_note', 'regular') ${expenseBranchFilterClause}
    `;
    const expensesStatsPromise = req.db.query(expensesStatsQuery, expensesStatsParams);

    // 4. Incomes Stats Query
    const incomeStatsParams = [adminId];
    let incomeDateFilterClause = "";
    if (isValidDate(startDate) && isValidDate(endDate)) {
      incomeStatsParams.push(startDate, endDate);
      incomeDateFilterClause = `AND date::date BETWEEN $2 AND $3`;
    }
    let incomeBranchFilterClause = "";
    if (branchIdFilter && branchIdFilter !== 'all') {
      incomeStatsParams.push(branchIdFilter);
      incomeBranchFilterClause = `AND "branchId" = $${incomeStatsParams.length}`;
    }

    const incomeStatsQuery = `
      SELECT
        COUNT(*) FILTER (WHERE 1=1 ${incomeDateFilterClause}) AS "filteredIncomesCount",
        COUNT(*) AS "allTimeIncomesCount",
        COALESCE(SUM(amount - COALESCE("remainingBalance", 0)) FILTER (WHERE 1=1 ${incomeDateFilterClause}), 0) AS "filteredIncomeRevenue",
        COALESCE(SUM(amount - COALESCE("remainingBalance", 0)), 0) AS "allTimeIncomeRevenue"
      FROM incomes
      WHERE "userId" = $1 ${incomeBranchFilterClause}
    `;
    const incomeStatsPromise = req.db.query(incomeStatsQuery, incomeStatsParams);

    // 5. Factures Count Query
    const facturesCountParams = [adminId];
    let factureDateFilterClause = "";
    if (isValidDate(startDate) && isValidDate(endDate)) {
      facturesCountParams.push(startDate, endDate);
      factureDateFilterClause = `AND date::date BETWEEN $2 AND $3`;
    }
    let factureBranchFilterClause = "";
    if (branchIdFilter && branchIdFilter !== 'all') {
      facturesCountParams.push(branchIdFilter);
      factureBranchFilterClause = `AND "branchId" = $${facturesCountParams.length}`;
    }

    const facturesCountQuery = `
      SELECT 
        COUNT(*) AS "filteredFacturesCount"
      FROM factures
      WHERE "userId" = $1 ${factureDateFilterClause} ${factureBranchFilterClause}
    `;
    const facturesCountPromise = req.db.query(facturesCountQuery, facturesCountParams);

    // 6. Programs by Type Promise (programs are user-wide)
    const programTypePromise = req.db.query(
      `SELECT type, COUNT(*) as count FROM programs WHERE "userId" = $1 GROUP BY type`,
      [adminId]
    );

    // 7. Recent Bookings Promise
    let recentBookingsQuery = `
      SELECT id, "clientNameFr", "passportNumber", "sellingPrice", "isFullyPaid", "employeeId"
      FROM bookings WHERE "userId" = $1
    `;
    const recentBookingsParams = [adminId];
    if (req.user.role === "employee" && !permissions.includes("viewOthersBookings")) {
      recentBookingsQuery += ` AND "employeeId" = $${recentBookingsParams.length + 1}`;
      recentBookingsParams.push(req.user.id);
    }
    if (branchIdFilter && branchIdFilter !== 'all') {
      recentBookingsQuery += ` AND "branchId" = $${recentBookingsParams.length + 1}`;
      recentBookingsParams.push(branchIdFilter);
    }
    recentBookingsQuery += ` ORDER BY "createdAt" DESC LIMIT 3`;
    const recentBookingsPromise = req.db.query(recentBookingsQuery, recentBookingsParams);

    // 8. Daily Service Profit Promise
    let dailyServiceProfitQuery = `
      SELECT type, COALESCE(SUM(profit), 0) as "totalProfit" 
      FROM daily_services 
      WHERE "userId" = $1
    `;
    const dailyServiceProfitParams = [adminId];
    if (branchIdFilter && branchIdFilter !== 'all') {
      dailyServiceProfitQuery += ` AND "branchId" = $2`;
      dailyServiceProfitParams.push(branchIdFilter);
    }
    dailyServiceProfitQuery += ` GROUP BY type`;
    const dailyServiceProfitPromise = req.db.query(dailyServiceProfitQuery, dailyServiceProfitParams);

    const [
      statsResult,
      dailyServiceStatsResult,
      facturesCountResult,
      programTypeResult,
      recentBookingsResult,
      dailyServiceProfitResult,
      expensesStatsResult,
      incomeStatsResult,
    ] = await Promise.all([
      statsPromise,
      dailyServiceStatsPromise,
      facturesCountPromise,
      programTypePromise,
      recentBookingsPromise,
      dailyServiceProfitPromise,
      expensesStatsPromise,
      incomeStatsPromise,
    ]);

    const stats = statsResult.rows[0];
    const dailyServiceStats = dailyServiceStatsResult.rows[0];
    const facturesCount = facturesCountResult.rows[0];
    const programTypes = programTypeResult.rows;
    const recentBookings = recentBookingsResult.rows.map((b) => {
      if (req.user.role === "employee" && b.employeeId !== req.user.id && !permissions.includes("viewOthersBookingsFinancials")) {
        return {
          ...b,
          sellingPrice: null,
          isFullyPaid: null,
        };
      }
      return b;
    });
    const dailyServiceProfits = dailyServiceProfitResult.rows;
    const expensesStats = expensesStatsResult.rows[0];
    const incomeStats = incomeStatsResult.rows[0];
    
    const allTimeCost = parseFloat(expensesStats.allTimeExpensesCost);
    const allTimeIncomeRevenue = parseFloat(incomeStats.allTimeIncomeRevenue);
    const allTimeRevenue = parseFloat(stats.allTimeRevenue) + parseFloat(dailyServiceStats.allTimeServiceRevenue) + allTimeIncomeRevenue;
    const allTimeProfit = allTimeRevenue - allTimeCost;

    const filteredBookingRevenue = parseFloat(stats.filteredBookingRevenue);
    const filteredServiceRevenue = parseFloat(dailyServiceStats.filteredServiceRevenue);
    const filteredIncomeRevenue = parseFloat(incomeStats.filteredIncomeRevenue);
    const filteredCost = parseFloat(expensesStats.filteredExpensesCost);
    const filteredRevenue = filteredBookingRevenue + filteredServiceRevenue + filteredIncomeRevenue;
    const filteredProfit = filteredRevenue - filteredCost;

    const formattedResponse = {
      allTimeStats: {
        totalBookings: parseInt(stats.allTimeBookings, 10),
        totalDailyServices: parseInt(dailyServiceStats.allTimeServicesCount, 10),
        totalIncomes: parseInt(incomeStats.allTimeIncomesCount, 10),
        totalRevenue: allTimeRevenue,
        totalProfit: allTimeProfit,
        totalCost: allTimeCost,
      },
      dateFilteredStats: {
        totalBookings: parseInt(stats.filteredBookingsCount, 10),
        totalDailyServices: parseInt(dailyServiceStats.filteredServicesCount, 10),
        totalIncomes: parseInt(incomeStats.filteredIncomesCount, 10),
        totalFactures: parseInt(facturesCount.filteredFacturesCount, 10),
        totalRevenue: filteredRevenue,
        totalCost: filteredCost,
        totalProfit: filteredProfit,
      },
      programTypeData: {
        Hajj: parseInt(programTypes.find((p) => p.type === "Hajj")?.count, 10) || 0,
        Umrah: parseInt(programTypes.find((p) => p.type === "Umrah")?.count, 10) || 0,
        Tourism: parseInt(programTypes.find((p) => p.type === "Tourism")?.count, 10) || 0,
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
    const adminId = req.user.role === "admin" || req.user.role === "owner" ? req.user.id : req.user.adminId;
    const { programType, page = 1, limit = 7, startDate, endDate } = req.query;
    const branchIdFilter = req.user.role === 'admin' || req.user.role === 'owner' ? req.query.branchId : req.user.branchId;
    const offset = (page - 1) * limit;

    const isValidDate = (dateString) =>
      dateString && !isNaN(new Date(dateString));

    // --- Build WHERE clauses and params ---
    let programWhereClause = `WHERE p."userId" = $1`;
    const programParams = [adminId];
    if (programType && programType !== "all") {
      programWhereClause += ` AND p.type = $2`;
      programParams.push(programType);
    }
    if (isValidDate(startDate) && isValidDate(endDate)) {
      programWhereClause += ` AND p."createdAt"::date BETWEEN $${programParams.length + 1} AND $${programParams.length + 2}`;
      programParams.push(startDate, endDate);
    }

    // --- Paginated query for the detailed table ---
    let bookingDateClause = "";
    let detailedParams = [...programParams];
    if (isValidDate(startDate) && isValidDate(endDate)) {
      const startIdx = programParams.indexOf(startDate) + 1;
      const endIdx = programParams.indexOf(endDate) + 1;
      bookingDateClause = `AND b."createdAt"::date BETWEEN $${startIdx} AND $${endIdx}`;
    }

    let bookingBranchClause = "";
    if (branchIdFilter && branchIdFilter !== 'all') {
      detailedParams.push(branchIdFilter);
      bookingBranchClause = `AND b."branchId" = $${detailedParams.length}`;
    }

    const limitPlaceholder = `$${detailedParams.length + 1}`;
    const offsetPlaceholder = `$${detailedParams.length + 2}`;
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
      LEFT JOIN bookings b ON p.id::text = b."tripId" AND b."userId" = p."userId" ${bookingDateClause} ${bookingBranchClause}
      LEFT JOIN program_costs pc ON p.id = pc."programId" AND pc."userId" = p."userId"
      ${programWhereClause}
      GROUP BY p.id, pc."totalCost" ORDER BY p."createdAt" DESC
      LIMIT ${limitPlaceholder} OFFSET ${offsetPlaceholder}
    `;
    const detailedPerformancePromise = req.db.query(
      detailedPerformanceQuery,
      detailedParams
    );

    // --- Query for summary stats (Total Bookings, Revenue, etc.) ---
    let summaryWhereClause = `WHERE b."userId" = $1`;
    const summaryParams = [adminId];
    if (programType && programType !== "all") {
      summaryWhereClause += ` AND p.type = $${summaryParams.length + 1}`;
      summaryParams.push(programType);
    }
    if (isValidDate(startDate) && isValidDate(endDate)) {
      summaryWhereClause += ` AND b."createdAt"::date BETWEEN $${summaryParams.length + 1} AND $${summaryParams.length + 2}`;
      summaryParams.push(startDate, endDate);
    }
    if (branchIdFilter && branchIdFilter !== 'all') {
      summaryWhereClause += ` AND b."branchId" = $${summaryParams.length + 1}`;
      summaryParams.push(branchIdFilter);
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
      costWhereClause += ` AND p.type = $${costParams.length + 1}`;
      costParams.push(programType);
    }
    if (isValidDate(startDate) && isValidDate(endDate)) {
      costWhereClause += ` AND p."createdAt"::date BETWEEN $${costParams.length + 1} AND $${costParams.length + 2}`;
      costParams.push(startDate, endDate);
    }
    const totalCostQuery = `
      SELECT COALESCE(SUM(pc."totalCost"), 0) as "totalCost"
      FROM program_costs pc
      LEFT JOIN programs p ON pc."programId" = p.id
      ${costWhereClause}
    `;
    const totalCostPromise = req.db.query(totalCostQuery, costParams);

    // --- Count query for pagination (counts programs) ---
    const programCountQuery = `
        SELECT COUNT(*)
        FROM programs p
        ${programWhereClause}
    `;
    const programCountPromise = req.db.query(programCountQuery, programParams);

    // --- Monthly trend query ---
    let monthlyTrendWhereClause = `WHERE b."userId" = $1 AND b."createdAt" >= NOW() - INTERVAL '12 months'`;
    const monthlyTrendParams = [adminId];
    if (programType && programType !== "all") {
      monthlyTrendWhereClause += ` AND p.type = $2`;
      monthlyTrendParams.push(programType);
    }
    if (branchIdFilter && branchIdFilter !== 'all') {
      monthlyTrendWhereClause += ` AND b."branchId" = $${monthlyTrendParams.length + 1}`;
      monthlyTrendParams.push(branchIdFilter);
    }
    const monthlyTrendQuery = `
        SELECT
            TO_CHAR(b."createdAt", 'YYYY-MM') as month,
            COUNT(b.id) as "bookingsCount",
            COALESCE(SUM(b."sellingPrice"), 0) as "sales",
            COALESCE(SUM(b.profit), 0) as "profit"
        FROM bookings b
        LEFT JOIN programs p ON b."tripId"::int = p.id
        ${monthlyTrendWhereClause}
        GROUP BY month
        ORDER BY month ASC
    `;
    const monthlyTrendPromise = req.db.query(monthlyTrendQuery, monthlyTrendParams);

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
      detailedPerformanceData,
      monthlyTrend: monthlyTrendResult.rows.map((row) => ({
        ...row,
        bookings: parseInt(row.bookingsCount, 10),
        sales: parseFloat(row.sales || 0),
        profit: parseFloat(row.profit || 0),
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

const exportProfitReportExcel = async (req, res, next) => {
  try {
    const adminId = req.user.role === "admin" || req.user.role === "owner" ? req.user.id : req.user.adminId;
    const { programType, startDate, endDate } = req.query;
    const branchIdFilter = req.user.role === 'admin' || req.user.role === 'owner' ? req.query.branchId : req.user.branchId;

    const isValidDate = (dateString) =>
      dateString && !isNaN(new Date(dateString));

    // 1. Query Program Performance (detailed & summary)
    let programWhereClause = `WHERE p."userId" = $1`;
    const programParams = [adminId];
    if (programType && programType !== "all") {
      programWhereClause += ` AND p.type = $2`;
      programParams.push(programType);
    }
    if (isValidDate(startDate) && isValidDate(endDate)) {
      programWhereClause += ` AND p."createdAt"::date BETWEEN $${programParams.length + 1} AND $${programParams.length + 2}`;
      programParams.push(startDate, endDate);
    }

    let bookingDateClause = "";
    if (isValidDate(startDate) && isValidDate(endDate)) {
      const startIdx = programParams.indexOf(startDate) + 1;
      const endIdx = programParams.indexOf(endDate) + 1;
      bookingDateClause = `AND b."createdAt"::date BETWEEN $${startIdx} AND $${endIdx}`;
    }

    let bookingBranchClause = "";
    if (branchIdFilter && branchIdFilter !== 'all') {
      programParams.push(branchIdFilter);
      bookingBranchClause = `AND b."branchId" = $${programParams.length}`;
    }

    const detailedPerformanceQuery = `
      SELECT
          p.id,
          p.name as "programName",
          p.type,
          COUNT(b.id) as bookings,
          COALESCE(SUM(b."sellingPrice"), 0) as "totalSales",
          COALESCE(pc."totalCost", 0) as "totalCost"
      FROM programs p
      LEFT JOIN bookings b ON p.id::text = b."tripId" AND b."userId" = p."userId" ${bookingDateClause} ${bookingBranchClause}
      LEFT JOIN program_costs pc ON p.id = pc."programId" AND pc."userId" = p."userId"
      ${programWhereClause}
      GROUP BY p.id, pc."totalCost" ORDER BY p."createdAt" DESC
    `;
    const detailedPerformanceResult = await req.db.query(detailedPerformanceQuery, programParams);

    const detailedPerformanceData = detailedPerformanceResult.rows.map((row) => {
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
    });

    let summaryWhereClause = `WHERE b."userId" = $1`;
    const summaryParams = [adminId];
    if (programType && programType !== "all") {
      summaryWhereClause += ` AND p.type = $${summaryParams.length + 1}`;
      summaryParams.push(programType);
    }
    if (isValidDate(startDate) && isValidDate(endDate)) {
      summaryWhereClause += ` AND b."createdAt"::date BETWEEN $${summaryParams.length + 1} AND $${summaryParams.length + 2}`;
      summaryParams.push(startDate, endDate);
    }
    if (branchIdFilter && branchIdFilter !== 'all') {
      summaryWhereClause += ` AND b."branchId" = $${summaryParams.length + 1}`;
      summaryParams.push(branchIdFilter);
    }
    const summaryQuery = `
      SELECT 
        COUNT(b.id) as "totalBookings",
        COALESCE(SUM(b."sellingPrice"), 0) as "totalSales"
      FROM bookings b
      LEFT JOIN programs p ON b."tripId"::int = p.id
      ${summaryWhereClause}
    `;
    const summaryResult = await req.db.query(summaryQuery, summaryParams);

    let costWhereClause = `WHERE pc."userId" = $1`;
    const costParams = [adminId];
    if (programType && programType !== "all") {
      costWhereClause += ` AND p.type = $${costParams.length + 1}`;
      costParams.push(programType);
    }
    if (isValidDate(startDate) && isValidDate(endDate)) {
      costWhereClause += ` AND p."createdAt"::date BETWEEN $${costParams.length + 1} AND $${costParams.length + 2}`;
      costParams.push(startDate, endDate);
    }
    const totalCostQuery = `
      SELECT COALESCE(SUM(pc."totalCost"), 0) as "totalCost"
      FROM program_costs pc
      LEFT JOIN programs p ON pc."programId" = p.id
      ${costWhereClause}
    `;
    const totalCostResult = await req.db.query(totalCostQuery, costParams);

    const summaryData = summaryResult.rows[0];
    const summaryTotalCost = parseFloat(totalCostResult.rows[0].totalCost);
    const summaryTotalSales = parseFloat(summaryData.totalSales);
    const progSummary = {
      totalBookings: parseInt(summaryData.totalBookings, 10),
      totalSales: summaryTotalSales,
      totalProfit: summaryTotalSales - summaryTotalCost,
      totalCost: summaryTotalCost,
    };

    // 2. Query Daily Services Performance
    let dsQuery = 'SELECT * FROM daily_services WHERE "userId" = $1';
    const dsParams = [adminId];
    if (branchIdFilter && branchIdFilter !== 'all') {
      dsQuery += ' AND "branchId" = $2';
      dsParams.push(branchIdFilter);
    }
    const { rows: dsRows } = await req.db.query(dsQuery, dsParams);
    
    const mapServiceData = (row) => {
      const items = typeof row.items === "string" ? JSON.parse(row.items) : (row.items || []);
      const originalPrice = items.reduce((sum, item) => sum + (Number(item.quantity) * Number(item.purchasePrice) || 0), 0);
      const totalPrice = items.reduce((sum, item) => sum + (Number(item.quantity) * Number(item.sellPrice) || 0), 0);
      return {
        ...row,
        originalPrice,
        totalPrice
      };
    };
    const mappedServices = dsRows.map(mapServiceData);

    const startDateObj = isValidDate(startDate) ? new Date(startDate) : null;
    const endDateObj = isValidDate(endDate) ? new Date(endDate) : null;
    if (startDateObj) startDateObj.setUTCHours(0, 0, 0, 0);
    if (endDateObj) endDateObj.setUTCHours(23, 59, 59, 999);

    const filteredMapped = mappedServices.filter(s => {
      if (!startDateObj && !endDateObj) return true;
      const d = new Date(s.date);
      d.setUTCHours(0, 0, 0, 0);
      let ok = true;
      if (startDateObj && d < startDateObj) ok = false;
      if (endDateObj && d > endDateObj) ok = false;
      return ok;
    });

    const dateFilteredSummary = {
      totalSalesCount: filteredMapped.length,
      totalRevenue: filteredMapped.reduce((sum, s) => sum + s.totalPrice, 0),
      totalProfit: filteredMapped.reduce((sum, s) => sum + Number(s.profit), 0),
      totalCost: filteredMapped.reduce((sum, s) => sum + s.originalPrice, 0),
    };

    const byTypeMap = {};
    for (const s of filteredMapped) {
      if (!byTypeMap[s.type]) {
        byTypeMap[s.type] = { type: s.type, count: 0, totalOriginalPrice: 0, totalSalePrice: 0, totalProfit: 0 };
      }
      byTypeMap[s.type].count += 1;
      byTypeMap[s.type].totalOriginalPrice += s.originalPrice;
      byTypeMap[s.type].totalSalePrice += s.totalPrice;
      byTypeMap[s.type].totalProfit += Number(s.profit);
    }
    const byType = Object.values(byTypeMap).sort((a, b) => a.type.localeCompare(b.type));

    // 3. Calculate Unified Financial Statistics
    const totalSalesCount = progSummary.totalBookings + dateFilteredSummary.totalSalesCount;
    const totalRevenue = progSummary.totalSales + dateFilteredSummary.totalRevenue;
    const totalCost = progSummary.totalCost + dateFilteredSummary.totalCost;
    const totalProfit = progSummary.totalProfit + dateFilteredSummary.totalProfit;
    const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

    const stats = {
      totalSalesCount,
      totalRevenue,
      totalCost,
      totalProfit,
      profitMargin,
    };

    // 4. Generate Workbook using Excel Service
    const workbook = await ProfitReportExcelService.generateProfitReportExcel({
      filters: { startDate, endDate, programType },
      stats,
      programData: detailedPerformanceData,
      serviceData: byType,
    });

    const fileName = `profit_report_${startDate || "lifetime"}_to_${endDate || "lifetime"}.xlsx`;
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader("Content-Disposition", `attachment; filename=${fileName}`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    logger.error("Failed to export profit report Excel:", {
      message: error.message,
      stack: error.stack,
    });
    if (!res.headersSent) {
      next(new AppError("Failed to export profit report Excel.", 500));
    }
  }
};

module.exports = {
  getDashboardStats,
  getProfitReport,
  exportProfitReportExcel,
};
