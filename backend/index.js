// backend/server.js
const express = require("express");
const { Pool } = require("pg");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

// Import middleware
const { protect } = require("./middleware/authMiddleware");

// Import routes
const authRoutes = require("./routes/authRoutes");
const programRoutes = require("./routes/programRoutes");
const programPricingRoutes = require("./routes/programPricingRoutes");
const bookingRoutes = require("./routes/bookingRoutes");
const employeeRoutes = require("./routes/employeeRoutes");
const ownerRoutes = require("./routes/ownerRoutes"); // New
const dashboardRoutes = require("./routes/dashboardRoutes"); // <<< NEW

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
  .then(() => console.log("Connected to PostgreSQL"))
  .catch((err) => console.error("PostgreSQL connection error:", err));

// Make the database pool available to all routes
app.use((req, res, next) => {
  req.db = pool;
  next();
});

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/owner", ownerRoutes); // New
// Apply protect middleware to all data routes
app.use("/api/dashboard", protect, dashboardRoutes); // <<< NEW
app.use("/api/programs", protect, programRoutes);
app.use("/api/program-pricing", protect, programPricingRoutes);
app.use("/api/bookings", protect, bookingRoutes);
app.use("/api/employees", protect, employeeRoutes);

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
