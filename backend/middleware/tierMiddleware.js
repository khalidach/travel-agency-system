// backend/middleware/tierMiddleware.js
const getLimits = async (req) => {
  // 1. Get the base limits from the user's tier.
  let tierLimits = {};
  let { tierId } = req.user;
  if (!tierId) tierId = 1; // Default to Tier 1 if not set

  // The tierLimits might already be on req.user from the auth middleware, if not, fetch them.
  if (req.user.tierLimits && Object.keys(req.user.tierLimits).length > 0) {
    tierLimits = req.user.tierLimits;
  } else {
    const { rows } = await req.db.query(
      "SELECT limits FROM tiers WHERE id = $1",
      [tierId]
    );
    if (rows.length > 0) {
      tierLimits = rows[0].limits;
    } else {
      // Fallback to a default restrictive limit if tier not found
      tierLimits = {
        bookingsPerMonth: 0,
        programsPerMonth: 0,
        programPricingsPerMonth: 0,
        employees: 0,
        invoicing: false,
        facturesPerMonth: 0,
        dailyServicesPerMonth: 0,
        dailyServices: false,
        bookingExcelExportsPerMonth: 0,
        listExcelExportsPerMonth: 0,
        flightListExport: false,
      };
    }
  }

  // 2. Get the user's custom override limits.
  // req.user.limits is already parsed into an object by the auth middleware
  const userSpecificLimits = req.user.limits || {};

  // 3. Merge them. User-specific limits override tier limits.
  const effectiveLimits = { ...tierLimits, ...userSpecificLimits };

  return effectiveLimits;
};

const checkLimit = async (req, res, next, resource) => {
  try {
    const { adminId } = req.user;
    const limits = await getLimits(req);
    req.user.tierLimits = limits; // Attach the effective limits

    const limit = limits[resource.limitKey];

    if (limit === -1) {
      // -1 means unlimited
      return next();
    }

    if (resource.limitKey === "employees") {
      const { rows: countRows } = await req.db.query(
        `SELECT COUNT(*) FROM employees WHERE "adminId" = $1`,
        [adminId]
      );
      const currentCount = parseInt(countRows[0].count, 10);
      if (currentCount >= limit) {
        return res
          .status(403)
          .json({ message: `Limit of ${limit} employees reached.` });
      }
    } else {
      // Monthly limits for other resources
      const { rows: countRows } = await req.db.query(
        `SELECT COUNT(*) FROM ${resource.table} WHERE "userId" = $1 AND "createdAt" >= date_trunc('month', current_date)`,
        [adminId]
      );
      const currentCount = parseInt(countRows[0].count, 10);
      if (currentCount >= limit) {
        return res.status(403).json({
          message: `Monthly limit of ${limit} ${resource.name} reached.`,
        });
      }
    }

    next();
  } catch (error) {
    console.error(`Tier limit check error for ${resource.name}:`, error);
    res.status(500).json({ message: "Server error during limit check." });
  }
};

const checkExportLimit = async (req, res, next, exportType) => {
  try {
    const { adminId } = req.user;
    const { programId } = req.params;
    const limits = await getLimits(req);
    req.user.tierLimits = limits; // Attach effective limits for use in the controller

    const limitKey =
      exportType === "booking"
        ? "bookingExcelExportsPerMonth"
        : "listExcelExportsPerMonth";
    const limit = limits[limitKey];

    if (limit === -1) {
      // -1 means unlimited
      return next();
    }
    if (limit === 0) {
      return res.status(403).json({
        message: `Export for ${exportType} list is disabled for your tier.`,
      });
    }

    // Fetch the program to check its current export counts
    const programResult = await req.db.query(
      'SELECT "exportCounts" FROM programs WHERE id = $1 AND "userId" = $2',
      [programId, adminId]
    );

    if (programResult.rows.length === 0) {
      return res.status(404).json({ message: "Program not found." });
    }

    const exportCounts = programResult.rows[0].exportCounts || {};
    const currentMonth = new Date().toISOString().slice(0, 7); // Format: YYYY-MM

    const monthlyLog = exportCounts[exportType] || { month: "", count: 0 };

    let currentCount = 0;
    // If the log is for the current month, use its count. Otherwise, the count is 0.
    if (monthlyLog.month === currentMonth) {
      currentCount = monthlyLog.count;
    }

    if (currentCount >= limit) {
      return res.status(403).json({
        message: `You have reached your monthly export limit of ${limit} for this program's ${exportType} list.`,
      });
    }

    // If limit is not reached, proceed to the controller.
    // The controller will be responsible for incrementing the count.
    next();
  } catch (error) {
    console.error(`Export limit check error for ${exportType}:`, error);
    res
      .status(500)
      .json({ message: "Server error during export limit check." });
  }
};

const checkInvoicingAccess = async (req, res, next) => {
  try {
    const limits = await getLimits(req);
    if (!limits.invoicing) {
      return res
        .status(403)
        .json({ message: "Invoicing is not available for your subscription." });
    }
    next();
  } catch (error) {
    console.error("Invoicing access check error:", error);
    res.status(500).json({ message: "Server error during access check." });
  }
};

const checkDailyServiceAccess = async (req, res, next) => {
  try {
    const limits = await getLimits(req);
    if (!limits.dailyServices) {
      return res.status(403).json({
        message: "Daily Services are not available for your subscription.",
      });
    }
    next();
  } catch (error) {
    console.error("Daily Service access check error:", error);
    res.status(500).json({ message: "Server error during access check." });
  }
};

module.exports = {
  getLimits,
  checkBookingLimit: (req, res, next) =>
    checkLimit(req, res, next, {
      table: "bookings",
      name: "bookings",
      limitKey: "bookingsPerMonth",
    }),
  checkProgramLimit: (req, res, next) =>
    checkLimit(req, res, next, {
      table: "programs",
      name: "programs",
      limitKey: "programsPerMonth",
    }),
  checkProgramPricingLimit: (req, res, next) =>
    checkLimit(req, res, next, {
      table: "program_pricing",
      name: "program pricings",
      limitKey: "programPricingsPerMonth",
    }),
  checkFactureLimit: (req, res, next) =>
    checkLimit(req, res, next, {
      table: "factures",
      name: "invoices",
      limitKey: "facturesPerMonth",
    }),
  checkEmployeeLimit: (req, res, next) =>
    checkLimit(req, res, next, {
      table: "employees",
      name: "employees",
      limitKey: "employees",
    }),
  checkDailyServiceLimit: (req, res, next) =>
    checkLimit(req, res, next, {
      table: "daily_services",
      name: "daily services",
      limitKey: "dailyServicesPerMonth",
    }),
  checkBookingExportLimit: (req, res, next) =>
    checkExportLimit(req, res, next, "booking"),
  checkListExportLimit: (req, res, next) =>
    checkExportLimit(req, res, next, "list"),
  checkInvoicingAccess,
  checkDailyServiceAccess,
};
