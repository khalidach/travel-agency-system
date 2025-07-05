// backend/index.js
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
const ownerRoutes = require("./routes/ownerRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const roomManagementRoutes = require("./routes/roomManagementRoutes");
const factureRoutes = require("./routes/factureRoutes");
const settingsRoutes = require("./routes/settingsRoutes");
const tierRoutes = require("./routes/tierRoutes"); // New

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

    // Create tiers table
    await client.query(`
      CREATE TABLE IF NOT EXISTS tiers (
        id SERIAL PRIMARY KEY,
        name VARCHAR(50) NOT NULL UNIQUE,
        limits JSONB NOT NULL
      );
    `);

    // Add limits column to users table if it doesn't exist
    const userLimitsCheck = await client.query(`
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='users' AND column_name='limits'
    `);
    if (userLimitsCheck.rows.length === 0) {
      await client.query(`ALTER TABLE users ADD COLUMN "limits" JSONB;`);
      console.log("'limits' column added to users table.");
    }

    // Add tierId to users table if it doesn't exist
    const tierIdCheck = await client.query(`
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='users' AND column_name='tierId'
    `);
    if (tierIdCheck.rows.length === 0) {
      await client.query(
        `ALTER TABLE users ADD COLUMN "tierId" INTEGER REFERENCES tiers(id) DEFAULT 1;`
      );
      console.log("'tierId' column added to users table.");
    }

    // Populate tiers table if they don't exist
    await client.query(`
      INSERT INTO tiers (id, name, limits) VALUES
      (1, 'Tier 1', '{
        "bookingsPerMonth": 300,
        "programsPerMonth": 5,
        "programPricingsPerMonth": 5,
        "employees": 2,
        "invoicing": false,
        "facturesPerMonth": 0
      }'),
      (2, 'Tier 2', '{
        "bookingsPerMonth": 500,
        "programsPerMonth": 10,
        "programPricingsPerMonth": 10,
        "employees": 5,
        "invoicing": true,
        "facturesPerMonth": 100
      }'),
      (3, 'Tier 3', '{
        "bookingsPerMonth": -1,
        "programsPerMonth": -1,
        "programPricingsPerMonth": -1,
        "employees": 7,
        "invoicing": true,
        "facturesPerMonth": -1
      }')
      ON CONFLICT (id) DO NOTHING;
    `);
    console.log("Tiers table seeded.");

    // Create room_managements table
    await client.query(`
      CREATE TABLE IF NOT EXISTS room_managements (
        id SERIAL PRIMARY KEY,
        "userId" INTEGER NOT NULL,
        "programId" INTEGER NOT NULL,
        "hotelName" VARCHAR(255) NOT NULL,
        rooms JSONB,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE("userId", "programId", "hotelName")
      );
    `);

    // Create factures table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS factures (
        id SERIAL PRIMARY KEY,
        "userId" INTEGER NOT NULL,
        "employeeId" INTEGER,
        "clientName" VARCHAR(255) NOT NULL,
        "clientAddress" TEXT,
        "date" DATE NOT NULL,
        "items" JSONB NOT NULL,
        "type" VARCHAR(50) NOT NULL, -- 'facture' or 'devis'
        "total" NUMERIC(10, 2) NOT NULL,
        "notes" TEXT,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // Drop old 'fraisDeService' column if it exists
    const fraisCheck = await client.query(`
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='factures' AND column_name='fraisDeService'
    `);
    if (fraisCheck.rows.length > 0) {
      await client.query(`ALTER TABLE factures DROP COLUMN "fraisDeService";`);
      console.log("'fraisDeService' column dropped from factures table.");
    }

    // Add 'prixTotalHorsFrais' column if it doesn't exist
    const prixTotalHorsFraisCheck = await client.query(`
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='factures' AND column_name='prixTotalHorsFrais'
    `);
    if (prixTotalHorsFraisCheck.rows.length === 0) {
      await client.query(
        `ALTER TABLE factures ADD COLUMN "prixTotalHorsFrais" NUMERIC(10, 2) DEFAULT 0;`
      );
      console.log("'prixTotalHorsFrais' column added to factures table.");
    }

    // Add 'totalFraisServiceHT' column if it doesn't exist
    const totalFraisServiceHTCheck = await client.query(`
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='factures' AND column_name='totalFraisServiceHT'
    `);
    if (totalFraisServiceHTCheck.rows.length === 0) {
      await client.query(
        `ALTER TABLE factures ADD COLUMN "totalFraisServiceHT" NUMERIC(10, 2) DEFAULT 0;`
      );
      console.log("'totalFraisServiceHT' column added to factures table.");
    }

    // Check and add 'tva' column to factures table if it doesn't exist
    const tvaCheck = await client.query(`
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='factures' AND column_name='tva'
    `);
    if (tvaCheck.rows.length === 0) {
      await client.query(
        `ALTER TABLE factures ADD COLUMN "tva" NUMERIC(10, 2) DEFAULT 0;`
      );
      console.log("'tva' column added to factures table.");
    }

    // Check and add 'facture_number' column
    const factureNumberCheck = await client.query(`
        SELECT 1 FROM information_schema.columns
        WHERE table_name='factures' AND column_name='facture_number'
    `);
    if (factureNumberCheck.rows.length === 0) {
      await client.query(
        `ALTER TABLE factures ADD COLUMN "facture_number" TEXT;`
      );
      await client.query(
        `ALTER TABLE factures ADD CONSTRAINT unique_facture_number_per_user UNIQUE ("userId", "facture_number");`
      );
      console.log(
        "'facture_number' column and unique constraint added to factures table."
      );
    }

    // Add facturationSettings column to users table if it doesn't exist
    const columnCheck = await client.query(`
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='users' AND column_name='facturationSettings'
    `);

    if (columnCheck.rows.length === 0) {
      await client.query(
        `ALTER TABLE users ADD COLUMN "facturationSettings" JSONB;`
      );
      console.log("'facturationSettings' column added to users table.");
    }

    client.release();
  })
  .catch((err) => console.error("Database initialization error:", err));

// Make the database pool available to all routes
app.use((req, res, next) => {
  req.db = pool;
  next();
});

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/owner", ownerRoutes);
app.use("/api/tiers", protect, tierRoutes); // New
app.use("/api/dashboard", protect, dashboardRoutes);
app.use("/api/programs", protect, programRoutes);
app.use("/api/program-pricing", protect, programPricingRoutes);
app.use("/api/bookings", protect, bookingRoutes);
app.use("/api/employees", protect, employeeRoutes);
app.use("/api/room-management", protect, roomManagementRoutes);
app.use("/api/facturation", protect, factureRoutes);
app.use("/api/settings", protect, settingsRoutes);

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
