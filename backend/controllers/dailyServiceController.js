// backend/controllers/dailyServiceController.js
const AppError = require("../utils/appError");
const logger = require("../utils/logger");

const getDailyServices = async (req, res, next) => {
  try {
    const { adminId } = req.user;
    const page = parseInt(req.query.page || "1", 10);
    const limit = parseInt(req.query.limit || "10", 10);
    const offset = (page - 1) * limit;

    const servicesPromise = req.db.query(
      'SELECT * FROM daily_services WHERE "userId" = $1 ORDER BY "createdAt" DESC LIMIT $2 OFFSET $3',
      [adminId, limit, offset]
    );

    const totalCountPromise = req.db.query(
      'SELECT COUNT(*) FROM daily_services WHERE "userId" = $1',
      [adminId]
    );

    const [servicesResult, totalCountResult] = await Promise.all([
      servicesPromise,
      totalCountPromise,
    ]);

    const totalCount = parseInt(totalCountResult.rows[0].count, 10);

    res.status(200).json({
      data: servicesResult.rows,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    logger.error("Get Daily Services Error:", {
      message: error.message,
      stack: error.stack,
    });
    next(new AppError("Failed to retrieve daily services.", 500));
  }
};

const createDailyService = async (req, res, next) => {
  try {
    const { adminId, id: employeeId, role } = req.user;
    const { type, serviceName, originalPrice, totalPrice, date } = req.body;

    const commission = totalPrice - originalPrice;
    const profit = commission;

    const { rows } = await req.db.query(
      `INSERT INTO daily_services ("userId", "employeeId", type, "serviceName", "originalPrice", "totalPrice", commission, profit, date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [
        adminId,
        role === "admin" ? null : employeeId,
        type,
        serviceName,
        originalPrice,
        totalPrice,
        commission,
        profit,
        date,
      ]
    );
    res.status(201).json(rows[0]);
  } catch (error) {
    logger.error("Create Daily Service Error:", {
      message: error.message,
      stack: error.stack,
      body: req.body,
    });
    next(new AppError("Failed to create daily service.", 400));
  }
};

const updateDailyService = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { adminId } = req.user;
    const { type, serviceName, originalPrice, totalPrice, date } = req.body;

    const commission = totalPrice - originalPrice;
    const profit = commission;

    const { rows } = await req.db.query(
      `UPDATE daily_services 
       SET type = $1, "serviceName" = $2, "originalPrice" = $3, "totalPrice" = $4, commission = $5, profit = $6, date = $7, "updatedAt" = NOW()
       WHERE id = $8 AND "userId" = $9 RETURNING *`,
      [
        type,
        serviceName,
        originalPrice,
        totalPrice,
        commission,
        profit,
        date,
        id,
        adminId,
      ]
    );

    if (rows.length === 0) {
      return next(new AppError("Service not found or not authorized.", 404));
    }
    res.status(200).json(rows[0]);
  } catch (error) {
    logger.error("Update Daily Service Error:", {
      message: error.message,
      stack: error.stack,
      serviceId: req.params.id,
    });
    next(new AppError("Failed to update daily service.", 400));
  }
};

const deleteDailyService = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { adminId } = req.user;

    const { rowCount } = await req.db.query(
      'DELETE FROM daily_services WHERE id = $1 AND "userId" = $2',
      [id, adminId]
    );

    if (rowCount === 0) {
      return next(new AppError("Service not found or not authorized.", 404));
    }
    res.status(204).send();
  } catch (error) {
    logger.error("Delete Daily Service Error:", {
      message: error.message,
      stack: error.stack,
      serviceId: req.params.id,
    });
    next(new AppError("Failed to delete daily service.", 500));
  }
};

const getDailyServiceReport = async (req, res, next) => {
  try {
    const { adminId } = req.user;
    const { startDate, endDate } = req.query;

    const isValidDate = (dateString) =>
      dateString && !isNaN(new Date(dateString));

    const lifetimeSummaryQuery = `
      SELECT
        COUNT(*) as "totalSalesCount",
        COALESCE(SUM("totalPrice"), 0) as "totalRevenue",
        COALESCE(SUM(profit), 0) as "totalProfit",
        COALESCE(SUM("originalPrice"), 0) as "totalCost"
      FROM daily_services
      WHERE "userId" = $1
    `;
    const lifetimeSummaryPromise = req.db.query(lifetimeSummaryQuery, [
      adminId,
    ]);

    const monthlyTrendQuery = `
      SELECT
          TO_CHAR(date, 'YYYY-MM') as month,
          SUM(profit) as profit
      FROM daily_services
      WHERE "userId" = $1 AND date >= date_trunc('month', NOW()) - interval '5 months'
      GROUP BY month
      ORDER BY month ASC
    `;
    const monthlyTrendPromise = req.db.query(monthlyTrendQuery, [adminId]);

    let dateFilterClause = "";
    const queryParams = [adminId];
    if (isValidDate(startDate) && isValidDate(endDate)) {
      queryParams.push(startDate, endDate);
      dateFilterClause = `AND date::date BETWEEN $2 AND $3`;
    }

    const filteredDataQuery = `
      WITH FilteredServices AS (
        SELECT *
        FROM daily_services
        WHERE "userId" = $1 ${dateFilterClause}
      )
      SELECT
        (SELECT json_build_object(
          'totalSalesCount', COUNT(*),
          'totalRevenue', COALESCE(SUM("totalPrice"), 0),
          'totalProfit', COALESCE(SUM(profit), 0),
          'totalCost', COALESCE(SUM("originalPrice"), 0)
        ) FROM FilteredServices) as "dateFilteredSummary",

        (SELECT json_agg(t) FROM (
          SELECT
            type,
            COUNT(*) as "count",
            COALESCE(SUM("originalPrice"), 0) as "totalOriginalPrice",
            COALESCE(SUM("totalPrice"), 0) as "totalSalePrice",
            COALESCE(SUM(commission), 0) as "totalCommission",
            COALESCE(SUM(profit), 0) as "totalProfit"
          FROM FilteredServices
          GROUP BY type
          ORDER BY type
        ) t) as "byType"
    `;
    const filteredDataPromise = req.db.query(filteredDataQuery, queryParams);

    const [lifetimeSummaryResult, monthlyTrendResult, filteredDataResult] =
      await Promise.all([
        lifetimeSummaryPromise,
        monthlyTrendPromise,
        filteredDataPromise,
      ]);

    const filteredData = filteredDataResult.rows[0];

    res.status(200).json({
      lifetimeSummary: lifetimeSummaryResult.rows[0],
      dateFilteredSummary: filteredData.dateFilteredSummary || {
        totalSalesCount: 0,
        totalRevenue: 0,
        totalProfit: 0,
        totalCost: 0,
      },
      byType: filteredData.byType || [],
      monthlyTrend: monthlyTrendResult.rows.map((row) => ({
        ...row,
        profit: parseFloat(row.profit),
      })),
    });
  } catch (error) {
    logger.error("Daily Service Report Error:", {
      message: error.message,
      stack: error.stack,
    });
    next(new AppError("Failed to retrieve daily service report.", 500));
  }
};

module.exports = {
  getDailyServices,
  createDailyService,
  updateDailyService,
  deleteDailyService,
  getDailyServiceReport,
};
