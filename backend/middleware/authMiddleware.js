// backend/middleware/authMiddleware.js
const jwt = require("jsonwebtoken");

// Helper function to safely parse JSON that might be a string or already an object
const safeJsonParse = (data) => {
  if (typeof data === "string") {
    try {
      return JSON.parse(data);
    } catch (e) {
      // Return null or an empty object if parsing fails
      return null;
    }
  }
  // Return data as is if it's already an object (or null/undefined)
  return data;
};

const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      token = req.headers.authorization.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      req.user = {
        id: decoded.id,
        role: decoded.role,
        adminId: decoded.adminId,
        tierId: decoded.tierId,
      };

      // Attach full user/employee details for convenience in other routes
      if (decoded.role === "admin" || decoded.role === "owner") {
        const { rows } = await req.db.query(
          `SELECT u.id, u.username, u."agencyName", u."facturationSettings", u."tierId", u.limits, t.limits as "tierLimits"
           FROM users u
           LEFT JOIN tiers t ON u."tierId" = t.id
           WHERE u.id = $1`,
          [decoded.id]
        );
        if (rows.length > 0) {
          const dbUser = rows[0];
          // FIX: Ensure limits from the database are parsed into objects
          dbUser.limits = safeJsonParse(dbUser.limits);
          dbUser.tierLimits = safeJsonParse(dbUser.tierLimits);
          req.user = { ...req.user, ...dbUser };
        }
      } else {
        const { rows } = await req.db.query(
          'SELECT id, username, "adminId" FROM employees WHERE id = $1',
          [decoded.id]
        );
        if (rows.length > 0) {
          const employeeData = rows[0];
          const adminRes = await req.db.query(
            `SELECT u."agencyName", u."facturationSettings", u."tierId", u.limits, t.limits as "tierLimits"
             FROM users u
             LEFT JOIN tiers t ON u."tierId" = t.id
             WHERE u.id = $1`,
            [employeeData.adminId]
          );

          if (adminRes.rows.length > 0) {
            const adminData = adminRes.rows[0];
            // FIX: Ensure admin limits are also parsed for the employee
            adminData.limits = safeJsonParse(adminData.limits);
            adminData.tierLimits = safeJsonParse(adminData.tierLimits);

            req.user = {
              ...req.user,
              ...employeeData,
              agencyName: adminData.agencyName,
              facturationSettings: adminData.facturationSettings,
              tierId: adminData.tierId,
              limits: adminData.limits,
              tierLimits: adminData.tierLimits,
            };
          }
        }
      }

      if (!req.user.username) {
        return res
          .status(401)
          .json({ message: "Not authorized, user not found" });
      }

      next();
    } catch (error) {
      console.error("Auth Middleware Error:", error);
      res.status(401).json({ message: "Not authorized, token failed" });
    }
  }

  if (!token) {
    res.status(401).json({ message: "Not authorized, no token" });
  }
};

module.exports = { protect };
