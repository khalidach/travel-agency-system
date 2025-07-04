// backend/middleware/authMiddleware.js
const jwt = require("jsonwebtoken");

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
          'SELECT id, username, "agencyName", "facturationSettings", "tierId", "limits" FROM users WHERE id = $1',
          [decoded.id]
        );
        if (rows.length > 0) req.user = { ...req.user, ...rows[0] };
      } else {
        const { rows } = await req.db.query(
          'SELECT id, username, "adminId" FROM employees WHERE id = $1',
          [decoded.id]
        );
        if (rows.length > 0) {
          const adminRes = await req.db.query(
            'SELECT "agencyName", "facturationSettings", "tierId", "limits" FROM users WHERE id = $1',
            [rows[0].adminId]
          );
          req.user = {
            ...req.user,
            ...rows[0],
            agencyName: adminRes.rows[0]?.agencyName,
            facturationSettings: adminRes.rows[0]?.facturationSettings,
            tierId: adminRes.rows[0]?.tierId,
            limits: adminRes.rows[0]?.limits,
          };
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
