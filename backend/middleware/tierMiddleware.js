// backend/middleware/tierMiddleware.js
const getLimits = async (req) => {
  // 1. Check for user-specific limits first
  if (req.user.limits && Object.keys(req.user.limits).length > 0) {
    return req.user.limits;
  }

  // 2. Fallback to tier-based limits
  let { tierId } = req.user;
  if (!tierId) tierId = 1;

  const { rows } = await req.db.query(
    "SELECT limits FROM tiers WHERE id = $1",
    [tierId]
  );
  if (rows.length > 0) {
    return rows[0].limits;
  }

  // 3. Fallback to a default restrictive limit if something goes wrong
  return {
    bookingsPerMonth: 0,
    programsPerMonth: 0,
    programPricingsPerMonth: 0,
    employees: 0,
    invoicing: false,
    facturesPerMonth: 0,
  };
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

module.exports = {
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
  checkInvoicingAccess,
};
