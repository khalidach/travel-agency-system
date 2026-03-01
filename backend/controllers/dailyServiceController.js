const AppError = require("../utils/appError");
const logger = require("../utils/logger");
const { getNextPaymentId } = require("../services/sequence.service");

// Helper to compute derived properties from items JSONB
const mapServiceData = (row) => {
  const items = typeof row.items === "string" ? JSON.parse(row.items) : (row.items || []);
  const originalPrice = items.reduce((sum, item) => sum + (Number(item.quantity) * Number(item.purchasePrice) || 0), 0);
  const totalPrice = items.reduce((sum, item) => sum + (Number(item.quantity) * Number(item.sellPrice) || 0), 0);

  let serviceName = "";
  if (items.length > 0) {
    serviceName = items.length === 1
      ? items[0].description
      : `${items.length} items (${items.map(i => i.description).join(", ").slice(0, 50)}...)`;
  }

  const advancePayments = typeof row.advancePayments === "string" ? JSON.parse(row.advancePayments) : (row.advancePayments || []);
  const totalPaid = advancePayments.reduce((sum, p) => sum + (Number(p.amount) || Number(p.amountMAD) || 0), 0);

  return {
    ...row,
    items,
    originalPrice,
    totalPrice,
    serviceName,
    advancePayments,
    totalPaid
  };
};

const getDailyServices = async (req, res, next) => {
  try {
    const { adminId } = req.user;
    const page = parseInt(req.query.page || "1", 10);
    const limit = parseInt(req.query.limit || "10", 10);
    const offset = (page - 1) * limit;

    const servicesPromise = req.db.query(
      'SELECT * FROM daily_services WHERE "userId" = $1 ORDER BY "createdAt" DESC LIMIT $2 OFFSET $3',
      [adminId, limit, offset],
    );

    const totalCountPromise = req.db.query(
      'SELECT COUNT(*) FROM daily_services WHERE "userId" = $1',
      [adminId],
    );

    const [servicesResult, totalCountResult] = await Promise.all([
      servicesPromise,
      totalCountPromise,
    ]);

    const totalCount = parseInt(totalCountResult.rows[0].count, 10);

    res.status(200).json({
      data: servicesResult.rows.map(mapServiceData),
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
    const {
      type,
      clientName,
      bookingRef,
      items,
      date,
      advancePayments,
    } = req.body;

    const originalPrice = (items || []).reduce((sum, item) => sum + (Number(item.quantity) * Number(item.purchasePrice) || 0), 0);
    const totalPrice = (items || []).reduce((sum, item) => sum + (Number(item.quantity) * Number(item.sellPrice) || 0), 0);

    const profit = totalPrice - originalPrice;

    const totalPaid = (advancePayments || []).reduce(
      (sum, p) => sum + (Number(p.amount) || Number(p.amountMAD) || 0),
      0,
    );
    const remainingBalance = Number(totalPrice) - totalPaid;
    const isFullyPaid = remainingBalance <= 0;

    const { rows } = await req.db.query(
      `INSERT INTO daily_services ("userId", "employeeId", type, "clientName", "bookingRef", "items", profit, date, "advancePayments", "remainingBalance", "isFullyPaid")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
      [
        adminId,
        role === "admin" ? null : employeeId,
        type,
        clientName || null,
        bookingRef || null,
        JSON.stringify(items || []),
        profit,
        date,
        JSON.stringify(advancePayments || []),
        remainingBalance,
        isFullyPaid,
      ],
    );
    res.status(201).json(mapServiceData(rows[0]));
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
    const {
      type,
      clientName,
      bookingRef,
      items,
      date,
      advancePayments,
    } = req.body;

    const originalPrice = (items || []).reduce((sum, item) => sum + (Number(item.quantity) * Number(item.purchasePrice) || 0), 0);
    const totalPrice = (items || []).reduce((sum, item) => sum + (Number(item.quantity) * Number(item.sellPrice) || 0), 0);
    const profit = totalPrice - originalPrice;

    const totalPaid = (advancePayments || []).reduce(
      (sum, p) => sum + (Number(p.amount) || Number(p.amountMAD) || 0),
      0,
    );
    const remainingBalance = Number(totalPrice) - totalPaid;
    const isFullyPaid = remainingBalance <= 0;

    const { rows } = await req.db.query(
      `UPDATE daily_services 
       SET type = $1, "clientName" = $2, "bookingRef" = $3, "items" = $4, profit = $5, date = $6, "advancePayments" = $7, "remainingBalance" = $8, "isFullyPaid" = $9, "updatedAt" = NOW()
       WHERE id = $10 AND "userId" = $11 RETURNING *`,
      [
        type,
        clientName || null,
        bookingRef || null,
        JSON.stringify(items || []),
        profit,
        date,
        JSON.stringify(advancePayments || []),
        remainingBalance,
        isFullyPaid,
        id,
        adminId,
      ],
    );

    if (rows.length === 0) {
      return next(new AppError("Service not found or not authorized.", 404));
    }
    res.status(200).json(mapServiceData(rows[0]));
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
      [id, adminId],
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

    const isValidDate = (dateString) => dateString && !isNaN(new Date(dateString));

    // Fetch all for user and calculate stats in JS
    const { rows } = await req.db.query('SELECT * FROM daily_services WHERE "userId" = $1', [adminId]);
    const mappedServices = rows.map(mapServiceData);

    // Lifetime summary
    const lifetimeSummary = {
      totalSalesCount: mappedServices.length,
      totalRevenue: mappedServices.reduce((sum, s) => sum + s.totalPrice, 0),
      totalProfit: mappedServices.reduce((sum, s) => sum + Number(s.profit), 0),
      totalCost: mappedServices.reduce((sum, s) => sum + s.originalPrice, 0),
    };

    // Monthly Trend
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);

    const monthlyTrendMap = {};
    for (const s of mappedServices) {
      const d = new Date(s.date);
      if (d >= sixMonthsAgo) {
        const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        monthlyTrendMap[monthKey] = (monthlyTrendMap[monthKey] || 0) + Number(s.profit);
      }
    }
    const monthlyTrend = Object.keys(monthlyTrendMap).sort().map(month => ({ month, profit: monthlyTrendMap[month] }));

    // Filtering logic
    const startDateObj = isValidDate(startDate) ? new Date(startDate) : null;
    const endDateObj = isValidDate(endDate) ? new Date(endDate) : null;

    // Using UTC to avoid timezone drift errors
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

    res.status(200).json({
      lifetimeSummary,
      dateFilteredSummary: Object.keys(dateFilteredSummary).length > 0 ? dateFilteredSummary : {
        totalSalesCount: 0, totalRevenue: 0, totalProfit: 0, totalCost: 0
      },
      byType,
      monthlyTrend
    });
  } catch (error) {
    logger.error("Daily Service Report Error:", {
      message: error.message,
      stack: error.stack,
    });
    next(new AppError("Failed to retrieve daily service report.", 500));
  }
};

const findDailyServiceForUser = async (db, user, serviceId) => {
  const { rows } = await db.query(
    'SELECT * FROM daily_services WHERE id = $1 AND "userId" = $2',
    [serviceId, user.adminId],
  );
  if (rows.length === 0)
    throw new Error("Daily service not found or not authorized");

  const service = mapServiceData(rows[0]);
  if (user.role === "manager") {
    throw new Error("Managers are not authorized to modify payments.");
  }
  if (user.role === "employee" && service.employeeId !== user.id) {
    throw new Error(
      "You are not authorized to modify payments for this service.",
    );
  }
  return service;
};

const addDailyServicePayment = async (req, res, next) => {
  try {
    const { serviceId } = req.params;
    const { adminId } = req.user;
    const { labelPaper, ...paymentData } = req.body;

    const service = await findDailyServiceForUser(req.db, req.user, serviceId);
    const paymentId = await getNextPaymentId(req.db, adminId);

    const newPayment = {
      ...paymentData,
      _id: new Date().getTime().toString(),
      paymentID: paymentId,
      labelPaper: labelPaper || "",
    };

    const advancePayments = [...(service.advancePayments || []), newPayment];
    const totalPaid = advancePayments.reduce(
      (sum, p) => sum + (Number(p.amount) || Number(p.amountMAD) || 0),
      0,
    );
    const remainingBalance = Number(service.totalPrice) - totalPaid;
    const isFullyPaid = remainingBalance <= 0;

    const { rows: updatedRows } = await req.db.query(
      `UPDATE daily_services SET "advancePayments" = $1, "remainingBalance" = $2, "isFullyPaid" = $3 WHERE id = $4 AND "userId" = $5 RETURNING *`,
      [
        JSON.stringify(advancePayments),
        remainingBalance,
        isFullyPaid,
        serviceId,
        adminId,
      ],
    );

    res.status(200).json(mapServiceData(updatedRows[0]));
  } catch (error) {
    logger.error("Add Daily Service Payment Error:", {
      message: error.message,
      stack: error.stack,
      serviceId: req.params.serviceId,
    });
    next(new AppError(error.message || "Failed to add payment.", 400));
  }
};

const updateDailyServicePayment = async (req, res, next) => {
  try {
    const { serviceId, paymentId } = req.params;
    const { adminId } = req.user;
    const { labelPaper, ...paymentData } = req.body;

    const service = await findDailyServiceForUser(req.db, req.user, serviceId);

    const advancePayments = (service.advancePayments || []).map(
      (p) =>
        p._id === paymentId
          ? { ...p, ...paymentData, _id: p._id, labelPaper: labelPaper || "" }
          : p,
    );
    const totalPaid = advancePayments.reduce(
      (sum, p) => sum + (Number(p.amount) || Number(p.amountMAD) || 0),
      0,
    );
    const remainingBalance = Number(service.totalPrice) - totalPaid;
    const isFullyPaid = remainingBalance <= 0;

    const { rows: updatedRows } = await req.db.query(
      `UPDATE daily_services SET "advancePayments" = $1, "remainingBalance" = $2, "isFullyPaid" = $3 WHERE id = $4 AND "userId" = $5 RETURNING *`,
      [
        JSON.stringify(advancePayments),
        remainingBalance,
        isFullyPaid,
        serviceId,
        adminId,
      ],
    );

    res.status(200).json(mapServiceData(updatedRows[0]));
  } catch (error) {
    logger.error("Update Daily Service Payment Error:", {
      message: error.message,
      stack: error.stack,
      serviceId: req.params.serviceId,
      paymentId: req.params.paymentId,
    });
    next(new AppError(error.message || "Failed to update payment.", 400));
  }
};

const deleteDailyServicePayment = async (req, res, next) => {
  try {
    const { serviceId, paymentId } = req.params;
    const { adminId } = req.user;

    const service = await findDailyServiceForUser(req.db, req.user, serviceId);

    const advancePayments = (service.advancePayments || []).filter(
      (p) => p._id !== paymentId,
    );
    const totalPaid = advancePayments.reduce(
      (sum, p) => sum + (Number(p.amount) || Number(p.amountMAD) || 0),
      0,
    );
    const remainingBalance = Number(service.totalPrice) - totalPaid;
    const isFullyPaid = remainingBalance <= 0;

    const { rows: updatedRows } = await req.db.query(
      `UPDATE daily_services SET "advancePayments" = $1, "remainingBalance" = $2, "isFullyPaid" = $3 WHERE id = $4 AND "userId" = $5 RETURNING *`,
      [
        JSON.stringify(advancePayments),
        remainingBalance,
        isFullyPaid,
        serviceId,
        adminId,
      ],
    );

    res.status(200).json(mapServiceData(updatedRows[0]));
  } catch (error) {
    logger.error("Delete Daily Service Payment Error:", {
      message: error.message,
      stack: error.stack,
      serviceId: req.params.serviceId,
      paymentId: req.params.paymentId,
    });
    next(new AppError(error.message || "Failed to delete payment.", 500));
  }
};

module.exports = {
  getDailyServices,
  createDailyService,
  updateDailyService,
  deleteDailyService,
  getDailyServiceReport,
  addDailyServicePayment,
  updateDailyServicePayment,
  deleteDailyServicePayment,
};
