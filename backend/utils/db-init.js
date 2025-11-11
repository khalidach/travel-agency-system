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

    // Add columns if they don't exist for existing installations
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='ownerName') THEN
          ALTER TABLE users ADD COLUMN "ownerName" VARCHAR(255);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='phone') THEN
          ALTER TABLE users ADD COLUMN "phone" VARCHAR(50);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='email') THEN
          ALTER TABLE users ADD COLUMN "email" VARCHAR(255) UNIQUE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='trialExpiresAt') THEN
          ALTER TABLE users ADD COLUMN "trialExpiresAt" TIMESTAMPTZ;
        END IF;
      END;
      $$;
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

    // Add 'active' column if it doesn't exist for existing installations
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='employees' AND column_name='active') THEN
          ALTER TABLE employees ADD COLUMN active BOOLEAN DEFAULT TRUE;
        END IF;
      END;
      $$;
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
          "maxBookings" INTEGER DEFAULT NULL, -- NEW: Max number of bookings (NULL for unlimited)
          "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // Add columns if they don't exist for existing installations
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='programs' AND column_name='isCommissionBased') THEN
          ALTER TABLE programs ADD COLUMN "isCommissionBased" BOOLEAN DEFAULT FALSE;
        END IF;
        
        -- NEW: Add maxBookings column if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='programs' AND column_name='maxBookings') THEN
          ALTER TABLE programs ADD COLUMN "maxBookings" INTEGER DEFAULT NULL;
        END IF;

        -- Add the new 'variations' column if it doesn't exist (legacy migration handling)
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
        "clientNameAr" VARCHAR(255), -- REMOVED NOT NULL
        "clientNameFr" JSONB,
        "personType" VARCHAR(50) NOT NULL,
        "phoneNumber" VARCHAR(50),
        "passportNumber" VARCHAR(255), -- REMOVED NOT NULL
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

    // --- FIX: Alter columns to allow NULL for "No Passport" and "Name AR/FR" features ---
    await client.query(`
      DO $$
      BEGIN
        -- Alter passportNumber to allow NULL
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='bookings' AND column_name='passportNumber' AND is_nullable = 'NO') THEN
          ALTER TABLE bookings ALTER COLUMN "passportNumber" DROP NOT NULL;
        END IF;

        -- Alter clientNameAr to allow NULL
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='bookings' AND column_name='clientNameAr' AND is_nullable = 'NO') THEN
          ALTER TABLE bookings ALTER COLUMN "clientNameAr" DROP NOT NULL;
        END IF;
      END;
      $$;
    `);
    // --- END FIX ---

    await client.query(`
      CREATE TABLE IF NOT EXISTS daily_services (
        id SERIAL PRIMARY KEY,
        "userId" INTEGER NOT NULL,
        "employeeId" INTEGER,
        type VARCHAR(100) NOT NULL,
        "serviceName" VARCHAR(255) NOT NULL,
        "originalPrice" NUMERIC(10, 2) NOT NULL,
        "totalPrice" NUMERIC(10, 2) NOT NULL,
        "advancePayments" JSONB DEFAULT '[]'::jsonb,
        "remainingBalance" NUMERIC(10, 2) DEFAULT 0,
        "isFullyPaid" BOOLEAN DEFAULT FALSE,
        profit NUMERIC(10, 2) NOT NULL,
        date DATE NOT NULL,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // Add and migrate new columns for Daily Services
    await client.query(`
      DO $$
      BEGIN
        -- Add new columns if they don't exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='daily_services' AND column_name='advancePayments') THEN
          ALTER TABLE daily_services ADD COLUMN "advancePayments" JSONB DEFAULT '[]'::jsonb;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='daily_services' AND column_name='remainingBalance') THEN
          ALTER TABLE daily_services ADD COLUMN "remainingBalance" NUMERIC(10, 2) DEFAULT 0;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='daily_services' AND column_name='isFullyPaid') THEN
          ALTER TABLE daily_services ADD COLUMN "isFullyPaid" BOOLEAN DEFAULT FALSE;
        END IF;

        -- Migrate old data: Set initial remaining balance to totalPrice and advancePayments to empty.
        UPDATE daily_services
        SET "remainingBalance" = "totalPrice"
        WHERE "remainingBalance" = 0;

        -- Migrate old data: Set initial isFullyPaid based on remainingBalance
        UPDATE daily_services
        SET "isFullyPaid" = ("remainingBalance" <= 0);

      END;
      $$;
    `);

    // --- NEW: Migration to add labelPaper to advancePayments JSONB in bookings and daily_services ---
    const updatePaymentJsonb = (tableName) => `
      DO $$
      DECLARE
        r record;
        payment_record jsonb;
        has_new_field boolean := FALSE;
      BEGIN
        -- Check if any record in advancePayments lacks the labelPaper field
        IF EXISTS (
            SELECT 1 FROM ${tableName}
            WHERE "advancePayments" IS NOT NULL
            AND jsonb_typeof("advancePayments") = 'array'
            AND EXISTS (
                SELECT 1 FROM jsonb_array_elements("advancePayments") AS payment
                WHERE payment ->> 'labelPaper' IS NULL
            )
        ) THEN
            FOR r IN SELECT id, "advancePayments" FROM ${tableName} WHERE "advancePayments" IS NOT NULL AND jsonb_typeof("advancePayments") = 'array'
            LOOP
                has_new_field := FALSE;
                payment_record := '[]'::jsonb;

                SELECT jsonb_agg(
                    CASE 
                        WHEN elem ->> 'labelPaper' IS NULL THEN elem || jsonb_build_object('labelPaper', '')
                        ELSE elem
                    END
                ) INTO payment_record
                FROM jsonb_array_elements(r."advancePayments") AS elem;

                IF payment_record IS DISTINCT FROM r."advancePayments" THEN
                    UPDATE ${tableName} SET "advancePayments" = payment_record WHERE id = r.id;
                END IF;
            END LOOP;
        END IF;
      END;
      $$;
    `;

    // Apply the JSONB structure update to both tables
    await client.query(updatePaymentJsonb("bookings"));
    await client.query(updatePaymentJsonb("daily_services"));

    // --- END NEW: Migration ---

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

    // --- FIX: Drop old unique constraint and add partial unique constraint for passport ---
    await client.query(`
      DO $$
      BEGIN
        -- 1. Drop the old, problematic unique constraint if it exists
        -- Note: 'bookings_passport_trip_unique' seems to be the name from your error
        IF EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'bookings_passport_trip_unique' AND contype = 'u'
        ) THEN
          ALTER TABLE bookings DROP CONSTRAINT bookings_passport_trip_unique;
        END IF;

        -- 2. Add a new partial unique index that only enforces uniqueness for non-empty passport numbers
        CREATE UNIQUE INDEX IF NOT EXISTS bookings_passport_trip_unique_partial
        ON bookings ("passportNumber", "tripId")
        WHERE "passportNumber" IS NOT NULL AND "passportNumber" != '';
      END;
      $$;
    `);
    // --- END FIX ---

    console.log("Database indexes applied successfully.");
    console.log("Database initialization complete.");
  } catch (error) {
    console.error("Database initialization error:", error);
    process.exit(1);
  }
};

module.exports = { applyDatabaseMigrations };
