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
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='programs' AND column_name='exportCounts') THEN
          ALTER TABLE programs ADD COLUMN "exportCounts" JSONB DEFAULT '{}'::jsonb;
        END IF;
      END;
      $$;
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
        "dateOfBirth" VARCHAR(20),
        "passportExpirationDate" DATE,
        "gender" VARCHAR(10),
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
        "clientName" VARCHAR(255),
        "clientAddress" TEXT,
        "clientICE" TEXT,
        "date" DATE NOT NULL,
        "items" JSONB NOT NULL,
        "type" VARCHAR(50) NOT NULL,
        "facture_number" TEXT,
        "prixTotalHorsFrais" NUMERIC(10, 2) DEFAULT 0,
        "totalFraisServiceHT" NUMERIC(10, 2) DEFAULT 0,
        "tva" NUMERIC(10, 2) DEFAULT 0,
        "total" NUMERIC(10, 2) NOT NULL,
        "showMargin" BOOLEAN DEFAULT TRUE,
        "notes" TEXT,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE ("userId", "facture_number")
      );
    `);

    // --- Add/Alter columns for existing installations ---
    const alterFacturesTable = `
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='factures' AND column_name='showMargin') THEN
          ALTER TABLE factures ADD COLUMN "showMargin" BOOLEAN DEFAULT TRUE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='factures' AND column_name='clientICE') THEN
          ALTER TABLE factures ADD COLUMN "clientICE" TEXT;
        END IF;
        ALTER TABLE factures ALTER COLUMN "clientName" DROP NOT NULL;
      END;
      $$;
    `;
    await client.query(alterFacturesTable);

    console.log("All tables checked/created successfully.");

    // --- Index Creation ---
    console.log("Applying database indexes for performance...");
    await client.query("CREATE EXTENSION IF NOT EXISTS pg_trgm;");
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
    await client.query(
      'CREATE INDEX IF NOT EXISTS idx_bookings_composite_filters ON bookings("userId", "tripId", "isFullyPaid");'
    );
    await client.query(
      'CREATE INDEX IF NOT EXISTS idx_bookings_client_name_fr_gin ON bookings USING GIN ("clientNameFr" gin_trgm_ops);'
    );
    await client.query(
      'CREATE INDEX IF NOT EXISTS idx_bookings_client_name_ar_gin ON bookings USING GIN ("clientNameAr" gin_trgm_ops);'
    );
    await client.query(
      "CREATE INDEX IF NOT EXISTS idx_programs_name_gin ON programs USING GIN (name gin_trgm_ops);"
    );
    await client.query(
      'CREATE INDEX IF NOT EXISTS idx_daily_services_user_date ON daily_services("userId", date DESC);'
    );
    await client.query(
      'CREATE INDEX IF NOT EXISTS idx_factures_user_created_at ON factures("userId", "createdAt" DESC);'
    );

    console.log("Database indexes applied successfully.");
    console.log("Database initialization complete.");
  } catch (error) {
    console.error("Database initialization error:", error);
    process.exit(1);
  }
};

module.exports = { applyDatabaseMigrations };
