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
        "limits" JSONB,
        "ownerName" VARCHAR(255),
        phone VARCHAR(50),
        email VARCHAR(255) UNIQUE,
        "trialExpiresAt" TIMESTAMPTZ
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS employees (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL,
        "adminId" INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        active BOOLEAN DEFAULT TRUE
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS programs (
          id SERIAL PRIMARY KEY,
          "userId" INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          "employeeId" INTEGER REFERENCES employees(id) ON DELETE SET NULL,
          name VARCHAR(255) NOT NULL,
          type VARCHAR(50) NOT NULL,
          variations JSONB, -- Renamed from cities and duration is now inside
          packages JSONB,
          "totalBookings" INTEGER DEFAULT 0,
          "isCommissionBased" BOOLEAN DEFAULT FALSE, -- New field for commission-based programs
          "maxBookings" INTEGER DEFAULT NULL, -- NEW: Max number of bookings (NULL for unlimited)
          "exportCounts" JSONB DEFAULT '{}'::jsonb,
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
          "ticketPricesByVariation" JSONB,
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
        "clientNameAr" VARCHAR(255), 
        "clientNameFr" JSONB,
        "personType" VARCHAR(50) NOT NULL,
        "phoneNumber" VARCHAR(50),
        "passportNumber" VARCHAR(255), 
        "dateOfBirth" VARCHAR(20),
        "passportExpirationDate" DATE,
        "gender" VARCHAR(10),
        "tripId" VARCHAR(255) NOT NULL,
        "variationName" VARCHAR(255), 
        "packageId" VARCHAR(255),
        "selectedHotel" JSONB,
        "sellingPrice" NUMERIC(10, 2) NOT NULL,
        "basePrice" NUMERIC(10, 2) NOT NULL,
        profit NUMERIC(10, 2) NOT NULL,
        "advancePayments" JSONB,
        "remainingBalance" NUMERIC(10, 2) NOT NULL,
        "isFullyPaid" BOOLEAN NOT NULL,
        "relatedPersons" JSONB,
        "bookingSource" TEXT, 
        "status" VARCHAR(50) DEFAULT 'confirmed',
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        "recipientId" INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        "senderId" INTEGER REFERENCES users(id) ON DELETE SET NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        type VARCHAR(50) NOT NULL,
        "referenceId" INTEGER,
        "isRead" BOOLEAN DEFAULT FALSE,
        "senderName" VARCHAR(255),
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS daily_services (
        id SERIAL PRIMARY KEY,
        "userId" INTEGER NOT NULL,
        "employeeId" INTEGER,
        type VARCHAR(100) NOT NULL,
        "clientName" VARCHAR(255),
        "bookingRef" VARCHAR(100),
        "items" JSONB DEFAULT '[]'::jsonb,
        "advancePayments" JSONB DEFAULT '[]'::jsonb,
        "remainingBalance" NUMERIC(10, 2) DEFAULT 0,
        "isFullyPaid" BOOLEAN DEFAULT FALSE,
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

    await client.query(`
      CREATE TABLE IF NOT EXISTS program_costs (
        id SERIAL PRIMARY KEY,
        "programId" INTEGER NOT NULL REFERENCES programs(id) ON DELETE CASCADE UNIQUE,
        "userId" INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        costs JSONB,
        "totalCost" NUMERIC(12, 2) DEFAULT 0,
        "isEnabled" BOOLEAN DEFAULT FALSE,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS expenses (
        id SERIAL PRIMARY KEY,
        "userId" INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        "employeeId" INTEGER REFERENCES employees(id) ON DELETE SET NULL,
        type VARCHAR(50) NOT NULL, -- 'order_note' or 'regular'
        category VARCHAR(100), 
        description TEXT NOT NULL,
        beneficiary VARCHAR(255), 
        amount NUMERIC(12, 2) NOT NULL,
        "advancePayments" JSONB DEFAULT '[]'::jsonb,
        "remainingBalance" NUMERIC(12, 2) DEFAULT 0,
        "isFullyPaid" BOOLEAN DEFAULT FALSE,
        date DATE NOT NULL,
        "items" JSONB DEFAULT '[]'::jsonb, -- NEW: Support for multiple items
        "currency" VARCHAR(10) DEFAULT 'MAD', -- NEW: Currency support
        "bookingType" VARCHAR(50), -- NEW: Booking type for order notes
        "reservationNumber" VARCHAR(100), -- NEW: Hotel reservation number
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS suppliers (
        id SERIAL PRIMARY KEY,
        "userId" INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255),
        phone VARCHAR(50),
        landline VARCHAR(50),
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS payment_sequences (
        "userId" INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        year INTEGER NOT NULL,
        last_value INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY ("userId", year)
      );
    `);

    console.log("All tables checked/created successfully.");

    // --- Index Creation ---
    console.log("Applying database indexes for performance...");
    await client.query("CREATE EXTENSION IF NOT EXISTS pg_trgm;");

    await client.query(
      'CREATE INDEX IF NOT EXISTS idx_expenses_user_date ON expenses("userId", date DESC);',
    );
    await client.query(
      'CREATE INDEX IF NOT EXISTS idx_expenses_type ON expenses("userId", type);',
    );
    await client.query(
      'CREATE INDEX IF NOT EXISTS idx_bookings_user_trip ON bookings("userId", "tripId");',
    );
    await client.query(
      'CREATE INDEX IF NOT EXISTS idx_bookings_employee ON bookings("employeeId");',
    );
    await client.query(
      'CREATE INDEX IF NOT EXISTS idx_bookings_created_at ON bookings("createdAt" DESC);',
    );
    await client.query(
      'CREATE INDEX IF NOT EXISTS idx_bookings_passport ON bookings("passportNumber");',
    );
    await client.query(
      'CREATE INDEX IF NOT EXISTS idx_programs_user_type ON programs("userId", "type");',
    );
    await client.query(
      'CREATE INDEX IF NOT EXISTS idx_program_pricing_program ON program_pricing("programId");',
    );
    await client.query(
      'CREATE INDEX IF NOT EXISTS idx_factures_user ON factures("userId");',
    );
    await client.query(
      'CREATE INDEX IF NOT EXISTS idx_daily_services_user ON daily_services("userId");',
    );
    await client.query(
      'CREATE INDEX IF NOT EXISTS idx_employees_admin ON employees("adminId");',
    );
    await client.query(
      'CREATE INDEX IF NOT EXISTS idx_bookings_composite_filters ON bookings("userId", "tripId", "isFullyPaid");',
    );
    await client.query(
      `CREATE INDEX IF NOT EXISTS idx_bookings_client_name_fr_gin ON bookings USING GIN (("clientNameFr" ->> 'lastName') gin_trgm_ops, ("clientNameFr" ->> 'firstName') gin_trgm_ops);`,
    );
    await client.query(
      'CREATE INDEX IF NOT EXISTS idx_bookings_client_name_ar_gin ON bookings USING GIN ("clientNameAr" gin_trgm_ops);',
    );
    await client.query(
      "CREATE INDEX IF NOT EXISTS idx_programs_name_gin ON programs USING GIN (name gin_trgm_ops);",
    );
    await client.query(
      'CREATE INDEX IF NOT EXISTS idx_daily_services_user_date ON daily_services("userId", date DESC);',
    );
    await client.query(
      'CREATE INDEX IF NOT EXISTS idx_factures_user_created_at ON factures("userId", "createdAt" DESC);',
    );
    await client.query(
      'CREATE INDEX IF NOT EXISTS idx_program_costs_program ON program_costs("programId");',
    );
    await client.query(
      'CREATE INDEX IF NOT EXISTS idx_suppliers_user ON suppliers("userId");',
    );
    await client.query(
      "CREATE INDEX IF NOT EXISTS idx_suppliers_name_gin ON suppliers USING GIN (name gin_trgm_ops);",
    );
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS bookings_passport_trip_unique_partial
      ON bookings ("passportNumber", "tripId")
      WHERE "passportNumber" IS NOT NULL AND "passportNumber" != '';
    `);
    await client.query(
      'CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications("recipientId", "isRead");',
    );

    console.log("Database indexes applied successfully.");
    console.log("Database initialization complete.");
  } catch (error) {
    console.error("Database initialization error:", error);
    process.exit(1);
  }
};

module.exports = { applyDatabaseMigrations };
