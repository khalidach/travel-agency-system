// backend/index.js
const express = require("express");
const { Pool } = require("pg");
const cors = require("cors");
const path = require("path");
const helmet = require("helmet"); // Add helmet for security headers
const cookieParser = require("cookie-parser");
require("dotenv").config();

// Import middleware and new DB initializer
const { protect } = require("./middleware/authMiddleware");
const { apiLimiter } = require("./middleware/rateLimitMiddleware");
const { applyDatabaseMigrations } = require("./utils/db-init");
const errorHandler = require("./middleware/errorHandler");
const logger = require("./utils/logger");

// Import routes
const authRoutes = require("./routes/authRoutes");
const programRoutes = require("./routes/programRoutes");
const programPricingRoutes = require("./routes/programPricingRoutes");
const programCostsRoutes = require("./routes/programCostsRoutes"); // Import new route
const bookingRoutes = require("./routes/bookingRoutes");
const employeeRoutes = require("./routes/employeeRoutes");
const ownerRoutes = require("./routes/ownerRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const roomManagementRoutes = require("./routes/roomManagementRoutes");
const factureRoutes = require("./routes/factureRoutes");
const settingsRoutes = require("./routes/settingsRoutes");
const tierRoutes = require("./routes/tierRoutes");
const dailyServiceRoutes = require("./routes/dailyServiceRoutes");
const accountRoutes = require("./routes/accountRoutes");
const notificationRoutes = require("./routes/notificationRoutes"); // Import new notification routes
const expenseRoutes = require("./routes/expenseRoutes"); // <--- ADD THIS

const app = express();

// --- CORS Configuration Fix ---
// Whitelist of allowed origins. Add any other frontend URLs you might have (e.g., preview domains).
const allowedOrigins = [process.env.FRONTEND_URL];

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg =
        "The CORS policy for this site does not allow access from the specified Origin.";
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true, // This is crucial for cookies
};

// Security Headers - Apply helmet middleware for security
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
        fontSrc: ["'self'", "https:", "data:"],
        connectSrc: ["'self'"],
        mediaSrc: ["'self'"],
        objectSrc: ["'none'"],
        childSrc: ["'self'"],
        workerSrc: ["'self'"],
        frameSrc: ["'self'"],
        upgradeInsecureRequests: [],
      },
    },
    crossOriginEmbedderPolicy: false,
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
    noSniff: true,
    frameguard: { action: "deny" },
    xssFilter: true,
    referrerPolicy: { policy: "same-origin" },
  }),
);

// Middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());

// Connect to PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

pool
  .connect()
  .then(async (client) => {
    logger.info("Connected to PostgreSQL");
    await applyDatabaseMigrations(client);
    client.release();
  })
  .catch((err) => logger.error("Database initialization error:", err));

// Make the database pool available to all routes
app.use((req, res, next) => {
  req.db = pool;
  next();
});

// Apply the general rate limiter to all API routes
app.use("/api/", apiLimiter);

// --- Caching Middleware ---
// This middleware configures caching for API responses.
app.use("/api/", (req, res, next) => {
  // 'no-cache' tells the browser it can cache the response but must revalidate with the server before using it.
  res.setHeader("Cache-Control", "no-cache");
  // 'Vary: Cookie' tells the browser to cache responses based on the presence of the authentication cookie.
  res.setHeader("Vary", "Cookie");
  next();
});

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/account", accountRoutes);
app.use("/api/owner", ownerRoutes);
app.use("/api/tiers", protect, tierRoutes);
app.use("/api/dashboard", protect, dashboardRoutes);
app.use("/api/programs", protect, programRoutes);
app.use("/api/program-pricing", protect, programPricingRoutes);
app.use("/api/program-costs", protect, programCostsRoutes); // Add new route
app.use("/api/bookings", protect, bookingRoutes);
app.use("/api/employees", protect, employeeRoutes);
app.use("/api/room-management", protect, roomManagementRoutes);
app.use("/api/facturation", protect, factureRoutes);
app.use("/api/settings", protect, settingsRoutes);
app.use("/api/daily-services", protect, dailyServiceRoutes);
app.use("/api/notifications", notificationRoutes); // Add this line
app.use("/api/expenses", protect, expenseRoutes); // <--- ADD THIS

// Serve static files from the frontend build directory
app.use(express.static(path.join(__dirname, "../frontend/dist")));

// Handle client-side routing
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/dist/index.html"));
});

// Use the global error handling middleware
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  logger.info(`Server is running on port ${PORT}`);
});
