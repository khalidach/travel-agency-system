// backend/controllers/dashboardController.js
const getDashboardStats = async (req, res) => {
  const { adminId } = req.user;
  const { startDate, endDate } = req.query;

  const isValidDate = (dateString) =>
    dateString && !isNaN(new Date(dateString));

  try {
    // 1. All-time stats
    const allTimeStatsQuery = `
      SELECT
        (SELECT COUNT(*) FROM bookings WHERE "userId" = $1) as "totalBookings",
        (SELECT COALESCE(SUM("sellingPrice"), 0) FROM bookings WHERE "userId" = $1) as "totalRevenue",
        (SELECT COALESCE(SUM(profit), 0) FROM bookings WHERE "userId" = $1) as "totalProfit",
        (SELECT COUNT(*) FROM programs WHERE "userId" = $1) as "activePrograms"
    `;
    const allTimeStatsPromise = req.db.query(allTimeStatsQuery, [adminId]);

    // 2. Date-filtered stats
    let dateFilterCondition = "";
    const dateFilterParams = [adminId];
    if (isValidDate(startDate) && isValidDate(endDate)) {
      // FIX: Cast `createdAt` to date to correctly handle the range.
      dateFilterCondition = `AND "createdAt"::date BETWEEN $2 AND $3`;
      dateFilterParams.push(startDate, endDate);
    }

    const simplifiedDateFilteredQuery = `
      SELECT
        COUNT(*) as "filteredBookingsCount",
        COALESCE(SUM("sellingPrice"), 0) as "filteredRevenue",
        COALESCE(SUM(profit), 0) as "filteredProfit",
        COALESCE(SUM("basePrice"), 0) as "filteredCost",
        COALESCE(SUM("sellingPrice" - "remainingBalance"), 0) as "filteredPaid"
      FROM bookings
      WHERE "userId" = $1 ${dateFilterCondition}
    `;
    const dateFilteredStatsPromise = req.db.query(
      simplifiedDateFilteredQuery,
      dateFilterParams
    );

    // 3. Program type distribution
    const programTypeQuery = `
        SELECT type, COUNT(*) as count FROM programs WHERE "userId" = $1 GROUP BY type
    `;
    const programTypePromise = req.db.query(programTypeQuery, [adminId]);

    // 4. Payment status (added COALESCE for safety)
    const paymentStatusQuery = `
      SELECT
        COALESCE(SUM(CASE WHEN "isFullyPaid" = true THEN 1 ELSE 0 END), 0) as "fullyPaid",
        COALESCE(SUM(CASE WHEN "isFullyPaid" = false THEN 1 ELSE 0 END), 0) as "pending"
      FROM bookings WHERE "userId" = $1
    `;
    const paymentStatusPromise = req.db.query(paymentStatusQuery, [adminId]);

    // 5. Recent bookings
    const recentBookingsQuery = `
      SELECT id, "clientNameFr", "passportNumber", "sellingPrice", "isFullyPaid"
      FROM bookings WHERE "userId" = $1
      ORDER BY "createdAt" DESC
      LIMIT 3
    `;
    const recentBookingsPromise = req.db.query(recentBookingsQuery, [adminId]);

    // Execute all queries in parallel
    const [
      allTimeStatsResult,
      dateFilteredStatsResult,
      programTypeResult,
      paymentStatusResult,
      recentBookingsResult,
    ] = await Promise.all([
      allTimeStatsPromise,
      dateFilteredStatsPromise,
      programTypePromise,
      paymentStatusPromise,
      recentBookingsPromise,
    ]);

    // Format the results
    const allTimeStats = allTimeStatsResult.rows[0];
    const dateFilteredStats = dateFilteredStatsResult.rows[0];
    const programTypes = programTypeResult.rows;
    const paymentStatus = paymentStatusResult.rows[0];
    const recentBookings = recentBookingsResult.rows;

    const filteredRevenue = parseFloat(dateFilteredStats.filteredRevenue);
    const filteredPaid = parseFloat(dateFilteredStats.filteredPaid);

    const formattedResponse = {
      allTimeStats: {
        totalBookings: parseInt(allTimeStats.totalBookings, 10),
        totalRevenue: parseFloat(allTimeStats.totalRevenue),
        totalProfit: parseFloat(allTimeStats.totalProfit),
        activePrograms: parseInt(allTimeStats.activePrograms, 10),
      },
      dateFilteredStats: {
        totalBookings: parseInt(dateFilteredStats.filteredBookingsCount, 10),
        totalRevenue: filteredRevenue,
        totalProfit: parseFloat(dateFilteredStats.filteredProfit),
        totalCost: parseFloat(dateFilteredStats.filteredCost),
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
      paymentStatus: {
        fullyPaid: parseInt(paymentStatus.fullyPaid, 10) || 0,
        pending: parseInt(paymentStatus.pending, 10) || 0,
      },
      recentBookings: recentBookings,
    };

    res.json(formattedResponse);
  } catch (error) {
    console.error("Dashboard Stats Error:", error);
    res.status(500).json({
      message: "Server error",
    });
  }
};

const getProfitReport = async (req, res) => {
  const { adminId } = req.user;
  const { programType } = req.query;

  try {
    let programProfitsQuery = `
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

    const queryParams = [adminId];

    if (programType && programType !== "all") {
      programProfitsQuery += ` AND p.type = $2`;
      queryParams.push(programType);
    }

    programProfitsQuery += ` GROUP BY p.id ORDER BY "totalProfit" DESC`;

    const programProfitsPromise = req.db.query(
      programProfitsQuery,
      queryParams
    );

    const monthlyTrendQuery = `
            SELECT
                TO_CHAR(b."createdAt", 'YYYY-MM') as month,
                SUM(b."sellingPrice") as sales,
                SUM(b.profit) as profit,
                COUNT(b.id) as bookings
            FROM bookings b
            WHERE b."userId" = $1
            GROUP BY month
            ORDER BY month ASC
        `;
    const monthlyTrendPromise = req.db.query(monthlyTrendQuery, [adminId]);

    const [programProfitsResult, monthlyTrendResult] = await Promise.all([
      programProfitsPromise,
      monthlyTrendPromise,
    ]);

    const profitData = programProfitsResult.rows.map((row) => ({
      ...row,
      profitMargin:
        parseFloat(row.totalSales) > 0
          ? (parseFloat(row.totalProfit) / parseFloat(row.totalSales)) * 100
          : 0,
      totalSales: parseFloat(row.totalSales),
      totalProfit: parseFloat(row.totalProfit),
      totalCost: parseFloat(row.totalCost),
      bookings: parseInt(row.bookings, 10),
    }));

    res.json({
      profitData,
      monthlyTrend: monthlyTrendResult.rows.map((row) => ({
        ...row,
        sales: parseFloat(row.sales),
        profit: parseFloat(row.profit),
        bookings: parseInt(row.bookings, 10),
      })),
    });
  } catch (error) {
    console.error("Profit Report Error:", error);
    res.status(500).json({
      message: "Server error",
    });
  }
};

module.exports = {
  getDashboardStats,
  getProfitReport,
};
