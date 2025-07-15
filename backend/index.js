// backend/index.js
const express = require("express");
const { Pool } = require("pg");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

// Import middleware and new DB initializer
const { protect } = require("./middleware/authMiddleware");
const { apiLimiter } = require("./middleware/rateLimitMiddleware"); // Import the apiLimiter
const { applyDatabaseMigrations } = require("./utils/db-init"); // <-- Import the new function

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
  origin: process.env.frontend_URL,
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());

// Connect to PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

pool
  .connect()
  .then(async (client) => {
    console.log("Connected to PostgreSQL");

    // Apply all database migrations (tables, indexes, etc.)
    await applyDatabaseMigrations(client);

    client.release();
  })
  .catch((err) => console.error("Database initialization error:", err));

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

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: "Something went wrong!" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
