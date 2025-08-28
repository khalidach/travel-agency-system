// backend/index.js
const express = require("express");
const { Pool } = require("pg");
const cors = require("cors");
const path = require("path");
const helmet = require("helmet"); // Add helmet for security headers
const cookieParser = require("cookie-parser"); // Added
require("dotenv").config();

// Import middleware and new DB initializer
const { protect } = require("./middleware/authMiddleware");
const { apiLimiter } = require("./middleware/rateLimitMiddleware"); // Import the apiLimiter
const { applyDatabaseMigrations } = require("./utils/db-init"); // <-- Import the new function
const errorHandler = require("./middleware/errorHandler"); // <-- Import the new error handler
const logger = require("./utils/logger"); // <-- Import the logger

// Import routes
const authRoutes = require("./routes/authRoutes");
const programRoutes = require("./routes/programRoutes");
const programPricingRoutes = require("./routes/programPricingRoutes");
const bookingRoutes = require("./routes/bookingRoutes");
const employeeRoutes = require("./routes/employeeRoutes");
const ownerRoutes = require("./routes/ownerRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const roomManagementRoutes = require("./routes/roomManagementRoutes");
const factureRoutes = require("./routes/factureRoutes");
const settingsRoutes = require("./routes/settingsRoutes");
const tierRoutes = require("./routes/tierRoutes");
const dailyServiceRoutes = require("./routes/dailyServiceRoutes");

const app = express();
const corsOptions = {
  origin: process.env.FRONTEND_URL || "http://localhost:5173", // Updated for credentials
  credentials: true, // Added
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
    crossOriginEmbedderPolicy: false, // May need to be disabled for some applications
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true,
    },
    noSniff: true, // X-Content-Type-Options: nosniff
    frameguard: { action: "deny" }, // X-Frame-Options: DENY (prevents clickjacking)
    xssFilter: true, // X-XSS-Protection: 1; mode=block
    referrerPolicy: { policy: "same-origin" },
  })
);

// Middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser()); // Added

// Connect to PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

pool
  .connect()
  .then(async (client) => {
    logger.info("Connected to PostgreSQL");

    // Apply all database migrations (tables, indexes, etc.)
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

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/owner", ownerRoutes);
app.use("/api/tiers", protect, tierRoutes);
app.use("/api/dashboard", protect, dashboardRoutes);
app.use("/api/programs", protect, programRoutes);
app.use("/api/program-pricing", protect, programPricingRoutes);
app.use("/api/bookings", protect, bookingRoutes);
app.use("/api/employees", protect, employeeRoutes);
app.use("/api/room-management", protect, roomManagementRoutes);
app.use("/api/facturation", protect, factureRoutes);
app.use("/api/settings", protect, settingsRoutes);
app.use("/api/daily-services", protect, dailyServiceRoutes);

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
