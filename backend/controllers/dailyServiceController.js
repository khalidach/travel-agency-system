// backend/controllers/dailyServiceController.js
const getDailyServices = async (req, res) => {
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

    res.json({
      data: servicesResult.rows,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    console.error("Get Daily Services Error:", error);
    res.status(500).json({ message: "Failed to retrieve daily services." });
  }
};

const createDailyService = async (req, res) => {
  const { adminId, id: employeeId, role } = req.user;
  const { type, serviceName, originalPrice, totalPrice, date } = req.body;

  const commission = totalPrice - originalPrice;
  const profit = commission; // Since VAT is removed, profit is the commission

  try {
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
    console.error("Create Daily Service Error:", error);
    res.status(400).json({ message: "Failed to create daily service." });
  }
};

const updateDailyService = async (req, res) => {
  try {
    const { id } = req.params;
    const { adminId } = req.user;
    const { type, serviceName, originalPrice, totalPrice, date } = req.body;

    const commission = totalPrice - originalPrice;
    const profit = commission; // Since VAT is removed

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
      return res
        .status(404)
        .json({ message: "Service not found or not authorized." });
    }
    res.json(rows[0]);
  } catch (error) {
    console.error("Update Daily Service Error:", error);
    res.status(400).json({ message: "Failed to update daily service." });
  }
};

const deleteDailyService = async (req, res) => {
  try {
    const { id } = req.params;
    const { adminId } = req.user;

    const { rowCount } = await req.db.query(
      'DELETE FROM daily_services WHERE id = $1 AND "userId" = $2',
      [id, adminId]
    );

    if (rowCount === 0) {
      return res
        .status(404)
        .json({ message: "Service not found or not authorized." });
    }
    res.status(204).send();
  } catch (error) {
    console.error("Delete Daily Service Error:", error);
    res.status(500).json({ message: "Failed to delete daily service." });
  }
};

const getDailyServiceReport = async (req, res) => {
  const { adminId } = req.user;
  const { startDate, endDate } = req.query;

  const isValidDate = (dateString) =>
    dateString && !isNaN(new Date(dateString));

  try {
    let dateFilterClause = "";
    const queryParams = [adminId];
    if (isValidDate(startDate) && isValidDate(endDate)) {
      queryParams.push(startDate, endDate);
      dateFilterClause = `AND date::date BETWEEN $2 AND $3`;
    }

    const summaryQuery = `
      SELECT
        COUNT(*) as "totalSalesCount",
        COALESCE(SUM("totalPrice"), 0) as "totalRevenue",
        COALESCE(SUM("originalPrice"), 0) as "totalCost",
        COALESCE(SUM(profit), 0) as "totalProfit"
      FROM daily_services
      WHERE "userId" = $1 ${dateFilterClause}
    `;

    const byTypeQuery = `
      SELECT
        type,
        COUNT(*) as "count",
        COALESCE(SUM("originalPrice"), 0) as "totalOriginalPrice",
        COALESCE(SUM("totalPrice"), 0) as "totalSalePrice",
        COALESCE(SUM(commission), 0) as "totalCommission",
        COALESCE(SUM(profit), 0) as "totalProfit"
      FROM daily_services
      WHERE "userId" = $1 ${dateFilterClause}
      GROUP BY type
      ORDER BY type
    `;

    const summaryResult = await req.db.query(summaryQuery, queryParams);
    const byTypeResult = await req.db.query(byTypeQuery, queryParams);

    res.json({
      summary: summaryResult.rows[0],
      byType: byTypeResult.rows,
    });
  } catch (error) {
    console.error("Daily Service Report Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  getDailyServices,
  createDailyService,
  updateDailyService,
  deleteDailyService,
  getDailyServiceReport,
};
