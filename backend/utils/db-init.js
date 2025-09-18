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

    // Modified programs table
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
          "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // Add 'isCommissionBased' column if it doesn't exist for existing installations
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='programs' AND column_name='isCommissionBased') THEN
          ALTER TABLE programs ADD COLUMN "isCommissionBased" BOOLEAN DEFAULT FALSE;
        END IF;
      END;
      $$;
    `);

    // Add 'variations' column, migrate old data, and then drop old columns safely.
    await client.query(`
      DO $$
      BEGIN
        -- Add the new 'variations' column if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='programs' AND column_name='variations') THEN
          ALTER TABLE programs ADD COLUMN "variations" JSONB;
        END IF;

        -- Check if migration is needed (i.e., the old 'cities' column still exists)
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='programs' AND column_name='cities') THEN
            -- Migrate data from 'cities' and 'duration' into a default variation for existing programs
            UPDATE programs
            SET variations = jsonb_build_array(jsonb_build_object(
                'name', 'Default Variation',
                'duration', duration,
                'cities', cities
            ))
            WHERE cities IS NOT NULL AND variations IS NULL;

            
        END IF;
      END;
      $$;
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

    // Add 'ticketPricesByVariation' column to program_pricing if it doesn't exist
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='program_pricing' AND column_name='ticketPricesByVariation') THEN
          ALTER TABLE program_pricing ADD COLUMN "ticketPricesByVariation" JSONB;
        END IF;
      END;
      $$;
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS bookings (
        id SERIAL PRIMARY KEY,
        "userId" INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        "employeeId" INTEGER REFERENCES employees(id) ON DELETE SET NULL,
        "clientNameAr" VARCHAR(255) NOT NULL,
        "clientNameFr" JSONB,
        "personType" VARCHAR(50) NOT NULL,
        "phoneNumber" VARCHAR(50),
        "passportNumber" VARCHAR(255) NOT NULL,
        "dateOfBirth" VARCHAR(20),
        "passportExpirationDate" DATE,
        "gender" VARCHAR(10),
        "tripId" VARCHAR(255) NOT NULL,
        "variationName" VARCHAR(255), -- New field for variation
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

    // Migration for clientNameFr
    await client.query(`
      DO $$
      BEGIN
        IF (SELECT data_type FROM information_schema.columns WHERE table_name='bookings' AND column_name='clientNameFr') = 'character varying' THEN
          -- 1. Add a temporary column
          ALTER TABLE bookings ADD COLUMN "clientNameFr_json" JSONB;

          -- 2. Migrate data
          UPDATE bookings
          SET "clientNameFr_json" = jsonb_build_object(
            'lastName', SPLIT_PART("clientNameFr", ' ', 1),
            'firstName', SUBSTRING("clientNameFr" FROM POSITION(' ' IN "clientNameFr") + 1)
          )
          WHERE "clientNameFr" IS NOT NULL AND "clientNameFr" LIKE '% %';

          UPDATE bookings
          SET "clientNameFr_json" = jsonb_build_object(
            'lastName', "clientNameFr",
            'firstName', ''
          )
          WHERE "clientNameFr" IS NOT NULL AND "clientNameFr" NOT LIKE '% %';

          -- 3. Drop old column
          ALTER TABLE bookings DROP COLUMN "clientNameFr";

          -- 4. Rename new column
          ALTER TABLE bookings RENAME COLUMN "clientNameFr_json" TO "clientNameFr";
        END IF;
      END;
      $$;
    `);

    // Add 'variationName' column to bookings if it doesn't exist
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='bookings' AND column_name='variationName') THEN
          ALTER TABLE bookings ADD COLUMN "variationName" VARCHAR(255);
        END IF;
      END;
      $$;
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
      `CREATE INDEX IF NOT EXISTS idx_bookings_client_name_fr_gin ON bookings USING GIN (("clientNameFr" ->> 'lastName') gin_trgm_ops, ("clientNameFr" ->> 'firstName') gin_trgm_ops);`
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
    await client.query(
      'CREATE INDEX IF NOT EXISTS idx_program_costs_program ON program_costs("programId");'
    );

    console.log("Database indexes applied successfully.");
    console.log("Database initialization complete.");
  } catch (error) {
    console.error("Database initialization error:", error);
    process.exit(1);
  }
};

module.exports = { applyDatabaseMigrations };
