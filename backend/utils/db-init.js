// backend/utils/db-init.js

/**
 * Applies all necessary database migrations, including table creation and indexing.
 * This function is designed to be idempotent (safe to run multiple times).
 * @param {object} client - The node-postgres client.
 */
const applyDatabaseMigrations = async (client) => {
  try {
    console.log("Starting database migrations...");

    // --- Table Creation ---
    // Moved from index.js to centralize schema management.

    await client.query(`
      CREATE TABLE IF NOT EXISTS tiers (
        id SERIAL PRIMARY KEY,
        name VARCHAR(50) NOT NULL UNIQUE,
        limits JSONB NOT NULL
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        "agencyName" VARCHAR(255),
        role VARCHAR(50) NOT NULL,
        "activeUser" BOOLEAN DEFAULT TRUE,
        "facturationSettings" JSONB,
        "tierId" INTEGER REFERENCES tiers(id) DEFAULT 1,
        "limits" JSONB
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS employees (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL,
        "adminId" INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS programs (
          id SERIAL PRIMARY KEY,
          "userId" INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          "employeeId" INTEGER REFERENCES employees(id) ON DELETE SET NULL,
          name VARCHAR(255) NOT NULL,
          type VARCHAR(50) NOT NULL,
          duration INTEGER NOT NULL,
          cities JSONB,
          packages JSONB,
          "totalBookings" INTEGER DEFAULT 0,
          "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS program_pricing (
          id SERIAL PRIMARY KEY,
          "userId" INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          "employeeId" INTEGER REFERENCES employees(id) ON DELETE SET NULL,
          "programId" INTEGER NOT NULL,
          "selectProgram" VARCHAR(255),
          "ticketAirline" NUMERIC(10, 2),
          "visaFees" NUMERIC(10, 2),
          "guideFees" NUMERIC(10, 2),
          "transportFees" NUMERIC(10, 2),
          "allHotels" JSONB,
          "personTypes" JSONB,
          "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          UNIQUE("programId")
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS bookings (
        id SERIAL PRIMARY KEY,
        "userId" INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        "employeeId" INTEGER REFERENCES employees(id) ON DELETE SET NULL,
        "clientNameAr" VARCHAR(255) NOT NULL,
        "clientNameFr" VARCHAR(255) NOT NULL,
        "personType" VARCHAR(50) NOT NULL,
        "phoneNumber" VARCHAR(50),
        "passportNumber" VARCHAR(255) NOT NULL,
        "tripId" VARCHAR(255) NOT NULL,
        "packageId" VARCHAR(255),
        "selectedHotel" JSONB,
        "sellingPrice" NUMERIC(10, 2) NOT NULL,
        "basePrice" NUMERIC(10, 2) NOT NULL,
        profit NUMERIC(10, 2) NOT NULL,
        "advancePayments" JSONB,
        "remainingBalance" NUMERIC(10, 2) NOT NULL,
        "isFullyPaid" BOOLEAN NOT NULL,
        "relatedPersons" JSONB,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS daily_services (
        id SERIAL PRIMARY KEY,
        "userId" INTEGER NOT NULL,
        "employeeId" INTEGER,
        type VARCHAR(100) NOT NULL,
        "serviceName" VARCHAR(255) NOT NULL,
        "originalPrice" NUMERIC(10, 2) NOT NULL,
        "totalPrice" NUMERIC(10, 2) NOT NULL,
        commission NUMERIC(10, 2) NOT NULL,
        profit NUMERIC(10, 2) NOT NULL,
        date DATE NOT NULL,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

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

    await client.query(`
      CREATE TABLE IF NOT EXISTS factures (
        id SERIAL PRIMARY KEY,
        "userId" INTEGER NOT NULL,
        "employeeId" INTEGER,
        "clientName" VARCHAR(255) NOT NULL,
        "clientAddress" TEXT,
        "date" DATE NOT NULL,
        "items" JSONB NOT NULL,
        "type" VARCHAR(50) NOT NULL,
        "facture_number" TEXT,
        "prixTotalHorsFrais" NUMERIC(10, 2) DEFAULT 0,
        "totalFraisServiceHT" NUMERIC(10, 2) DEFAULT 0,
        "tva" NUMERIC(10, 2) DEFAULT 0,
        "total" NUMERIC(10, 2) NOT NULL,
        "notes" TEXT,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE ("userId", "facture_number")
      );
    `);

    console.log("All tables checked/created successfully.");

    // --- Seed Data ---
    // Populate tiers table if they don't exist, ON CONFLICT prevents errors on restart.
    await client.query(`
      INSERT INTO tiers (id, name, limits) VALUES
      (1, 'Tier 1', '{"bookingsPerMonth": 300, "programsPerMonth": 5, "programPricingsPerMonth": 5, "employees": 2, "invoicing": false, "facturesPerMonth": 0, "dailyServicesPerMonth": 50, "dailyServices": true}'),
      (2, 'Tier 2', '{"bookingsPerMonth": 500, "programsPerMonth": 10, "programPricingsPerMonth": 10, "employees": 5, "invoicing": true, "facturesPerMonth": 100, "dailyServicesPerMonth": 150, "dailyServices": true}'),
      (3, 'Tier 3', '{"bookingsPerMonth": -1, "programsPerMonth": -1, "programPricingsPerMonth": -1, "employees": 7, "invoicing": true, "facturesPerMonth": -1, "dailyServicesPerMonth": -1, "dailyServices": true}')
      ON CONFLICT (name) DO NOTHING;
    `);
    console.log("Tiers table seeded.");

    // --- Index Creation ---
    // Using 'IF NOT EXISTS' to prevent errors on subsequent runs.
    console.log("Applying database indexes for performance...");

    await client.query(
      'CREATE INDEX IF NOT EXISTS idx_bookings_user_trip ON bookings("userId", "tripId");'
    );
    await client.query(
      'CREATE INDEX IF NOT EXISTS idx_bookings_employee ON bookings("employeeId");'
    );
    await client.query(
      'CREATE INDEX IF NOT EXISTS idx_bookings_created_at ON bookings("createdAt" DESC);'
    );
    await client.query(
      'CREATE INDEX IF NOT EXISTS idx_bookings_passport ON bookings("passportNumber");'
    );

    await client.query(
      'CREATE INDEX IF NOT EXISTS idx_programs_user_type ON programs("userId", "type");'
    );

    await client.query(
      'CREATE INDEX IF NOT EXISTS idx_program_pricing_program ON program_pricing("programId");'
    );

    await client.query(
      'CREATE INDEX IF NOT EXISTS idx_factures_user ON factures("userId");'
    );
    await client.query(
      'CREATE INDEX IF NOT EXISTS idx_daily_services_user ON daily_services("userId");'
    );
    await client.query(
      'CREATE INDEX IF NOT EXISTS idx_employees_admin ON employees("adminId");'
    );

    console.log("Database indexes applied successfully.");
    console.log("Database initialization complete.");
  } catch (error) {
    console.error("Database initialization error:", error);
    // Exit process if critical setup fails
    process.exit(1);
  }
};

module.exports = { applyDatabaseMigrations };
