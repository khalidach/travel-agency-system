// backend/utils/db-init.js

/**
 * Applies all necessary database migrations, including table creation and indexing.
 * This function is designed to be idempotent (safe to run multiple times).
 * Queries are batched together to minimize remote round-trip latency.
 * @param {object} client - The node-postgres client.
 */
const applyDatabaseMigrations = async (client) => {
  try {
    console.log("Starting database migrations...");

    // Batch 1: Create all tables in a single round-trip
    await client.query(`
      CREATE TABLE IF NOT EXISTS tiers (
        id SERIAL PRIMARY KEY,
        name VARCHAR(50) NOT NULL UNIQUE,
        limits JSONB NOT NULL
      );

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

      CREATE TABLE IF NOT EXISTS employees (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL,
        "adminId" INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        active BOOLEAN DEFAULT TRUE,
        permissions JSONB DEFAULT '[]'::jsonb
      );

      CREATE TABLE IF NOT EXISTS programs (
        id SERIAL PRIMARY KEY,
        "userId" INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        "employeeId" INTEGER REFERENCES employees(id) ON DELETE SET NULL,
        name VARCHAR(255) NOT NULL,
        type VARCHAR(50) NOT NULL,
        variations JSONB,
        packages JSONB,
        "totalBookings" INTEGER DEFAULT 0,
        "isCommissionBased" BOOLEAN DEFAULT FALSE,
        "maxBookings" INTEGER DEFAULT NULL,
        "exportCounts" JSONB DEFAULT '{}'::jsonb,
        "allowedBranchIds" INTEGER[],
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

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

      CREATE TABLE IF NOT EXISTS bookings (
        id SERIAL PRIMARY KEY,
        "userId" INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        "employeeId" INTEGER REFERENCES employees(id) ON DELETE SET NULL,
        "clientNameAr" VARCHAR(255), 
        "clientNameFr" JSONB,
        "personType" VARCHAR(50) NOT NULL,
        "phoneNumber" VARCHAR(255),
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

      CREATE TABLE IF NOT EXISTS expenses (
        id SERIAL PRIMARY KEY,
        "userId" INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        "employeeId" INTEGER REFERENCES employees(id) ON DELETE SET NULL,
        type VARCHAR(50) NOT NULL,
        category VARCHAR(100), 
        description TEXT NOT NULL,
        beneficiary VARCHAR(255), 
        amount NUMERIC(12, 2) NOT NULL,
        "advancePayments" JSONB DEFAULT '[]'::jsonb,
        "remainingBalance" NUMERIC(12, 2) DEFAULT 0,
        "isFullyPaid" BOOLEAN DEFAULT FALSE,
        date DATE NOT NULL,
        "items" JSONB DEFAULT '[]'::jsonb,
        "currency" VARCHAR(10) DEFAULT 'MAD',
        "bookingType" VARCHAR(50),
        "reservationNumber" VARCHAR(100),
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS incomes (
        id SERIAL PRIMARY KEY,
        "userId" INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        "employeeId" INTEGER REFERENCES employees(id) ON DELETE SET NULL,
        type VARCHAR(50) NOT NULL,
        category VARCHAR(100), 
        description TEXT NOT NULL,
        client VARCHAR(255), 
        amount NUMERIC(12, 2) NOT NULL,
        "advancePayments" JSONB DEFAULT '[]'::jsonb,
        "remainingBalance" NUMERIC(12, 2) DEFAULT 0,
        "isFullyPaid" BOOLEAN DEFAULT FALSE,
        date DATE NOT NULL,
        "items" JSONB DEFAULT '[]'::jsonb, 
        "factureId" INTEGER REFERENCES factures(id) ON DELETE SET NULL,
        "deliveryNoteNumber" VARCHAR(255),
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

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

      CREATE TABLE IF NOT EXISTS supplier_payments (
        id SERIAL PRIMARY KEY,
        "userId" INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        "supplierId" INTEGER NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
        amount NUMERIC(12, 2) NOT NULL,
        currency VARCHAR(10) NOT NULL,
        "amountMAD" NUMERIC(12, 2) NOT NULL,
        "bookingType" VARCHAR(50),
        date DATE NOT NULL,
        method VARCHAR(50) NOT NULL,
        "labelPaper" TEXT,
        "chequeNumber" VARCHAR(100),
        "bankName" VARCHAR(255),
        "chequeCashingDate" DATE,
        "transferReference" VARCHAR(255),
        "transferPayerName" VARCHAR(255),
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS clients (
        id SERIAL PRIMARY KEY,
        "userId" INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        "clientNameAr" VARCHAR(255),
        "clientNameFr" JSONB,
        email VARCHAR(255),
        phone VARCHAR(255),
        address TEXT,
        ice VARCHAR(50),
        "passportNumber" VARCHAR(255),
        "dateOfBirth" VARCHAR(50),
        "passportExpirationDate" DATE,
        gender VARCHAR(20),
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS payment_sequences (
        "userId" INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        year INTEGER NOT NULL,
        last_value INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY ("userId", year)
      );

      CREATE TABLE IF NOT EXISTS branches (
        id SERIAL PRIMARY KEY,
        "userId" INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        address TEXT,
        phone VARCHAR(50),
        email VARCHAR(255),
        "isHeadquarters" BOOLEAN DEFAULT FALSE,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // Batch 2: Schema updates for existing tables
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name='incomes' AND column_name='deliveryNoteNumber'
        ) THEN
          ALTER TABLE incomes ADD COLUMN "deliveryNoteNumber" VARCHAR(255);
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name='employees' AND column_name='permissions'
        ) THEN
          ALTER TABLE employees ADD COLUMN permissions JSONB DEFAULT '[]'::jsonb;
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name='employees' AND column_name='branchId'
        ) THEN
          ALTER TABLE employees ADD COLUMN "branchId" INTEGER REFERENCES branches(id) ON DELETE SET NULL;
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name='bookings' AND column_name='branchId'
        ) THEN
          ALTER TABLE bookings ADD COLUMN "branchId" INTEGER REFERENCES branches(id) ON DELETE SET NULL;
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name='expenses' AND column_name='branchId'
        ) THEN
          ALTER TABLE expenses ADD COLUMN "branchId" INTEGER REFERENCES branches(id) ON DELETE SET NULL;
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name='incomes' AND column_name='branchId'
        ) THEN
          ALTER TABLE incomes ADD COLUMN "branchId" INTEGER REFERENCES branches(id) ON DELETE SET NULL;
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name='daily_services' AND column_name='branchId'
        ) THEN
          ALTER TABLE daily_services ADD COLUMN "branchId" INTEGER REFERENCES branches(id) ON DELETE SET NULL;
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name='factures' AND column_name='branchId'
        ) THEN
          ALTER TABLE factures ADD COLUMN "branchId" INTEGER REFERENCES branches(id) ON DELETE SET NULL;
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name='programs' AND column_name='allowedBranchIds'
        ) THEN
          ALTER TABLE programs ADD COLUMN "allowedBranchIds" INTEGER[];
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name='branches' AND column_name='isHeadquarters'
        ) THEN
          ALTER TABLE branches ADD COLUMN "isHeadquarters" BOOLEAN DEFAULT FALSE;
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name='bookings' AND column_name='clientId'
        ) THEN
          ALTER TABLE bookings ADD COLUMN "clientId" INTEGER REFERENCES clients(id) ON DELETE SET NULL;
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name='clients' AND column_name='clientNameAr'
        ) THEN
          ALTER TABLE clients ADD COLUMN "clientNameAr" VARCHAR(255);
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name='clients' AND column_name='clientNameFr'
        ) THEN
          ALTER TABLE clients ADD COLUMN "clientNameFr" JSONB;
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name='clients' AND column_name='passportNumber'
        ) THEN
          ALTER TABLE clients ADD COLUMN "passportNumber" VARCHAR(255);
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name='clients' AND column_name='dateOfBirth'
        ) THEN
          ALTER TABLE clients ADD COLUMN "dateOfBirth" VARCHAR(50);
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name='clients' AND column_name='passportExpirationDate'
        ) THEN
          ALTER TABLE clients ADD COLUMN "passportExpirationDate" DATE;
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name='clients' AND column_name='gender'
        ) THEN
          ALTER TABLE clients ADD COLUMN "gender" VARCHAR(20);
        END IF;

        ALTER TABLE bookings ALTER COLUMN "phoneNumber" TYPE VARCHAR(255);
        ALTER TABLE clients ALTER COLUMN "phone" TYPE VARCHAR(255);
      END $$;
    `);

    // Batch 3: Extensions and indexes in a single round-trip
    await client.query(`
      CREATE EXTENSION IF NOT EXISTS pg_trgm;

      CREATE INDEX IF NOT EXISTS idx_expenses_user_date ON expenses("userId", date DESC);
      CREATE INDEX IF NOT EXISTS idx_expenses_type ON expenses("userId", type);
      CREATE INDEX IF NOT EXISTS idx_incomes_user_date ON incomes("userId", date DESC);
      CREATE INDEX IF NOT EXISTS idx_incomes_type ON incomes("userId", type);
      CREATE INDEX IF NOT EXISTS idx_bookings_user_trip ON bookings("userId", "tripId");
      CREATE INDEX IF NOT EXISTS idx_bookings_employee ON bookings("employeeId");
      CREATE INDEX IF NOT EXISTS idx_bookings_created_at ON bookings("createdAt" DESC);
      CREATE INDEX IF NOT EXISTS idx_bookings_passport ON bookings("passportNumber");
      CREATE INDEX IF NOT EXISTS idx_programs_user_type ON programs("userId", "type");
      CREATE INDEX IF NOT EXISTS idx_program_pricing_program ON program_pricing("programId");
      CREATE INDEX IF NOT EXISTS idx_factures_user ON factures("userId");
      CREATE INDEX IF NOT EXISTS idx_daily_services_user ON daily_services("userId");
      CREATE INDEX IF NOT EXISTS idx_employees_admin ON employees("adminId");
      CREATE INDEX IF NOT EXISTS idx_bookings_composite_filters ON bookings("userId", "tripId", "isFullyPaid");
      CREATE INDEX IF NOT EXISTS idx_bookings_client_name_fr_gin ON bookings USING GIN (("clientNameFr" ->> 'lastName') gin_trgm_ops, ("clientNameFr" ->> 'firstName') gin_trgm_ops);
      CREATE INDEX IF NOT EXISTS idx_bookings_client_name_ar_gin ON bookings USING GIN ("clientNameAr" gin_trgm_ops);
      CREATE INDEX IF NOT EXISTS idx_programs_name_gin ON programs USING GIN (name gin_trgm_ops);
      CREATE INDEX IF NOT EXISTS idx_daily_services_user_date ON daily_services("userId", date DESC);
      CREATE INDEX IF NOT EXISTS idx_factures_user_created_at ON factures("userId", "createdAt" DESC);
      CREATE INDEX IF NOT EXISTS idx_program_costs_program ON program_costs("programId");
      CREATE INDEX IF NOT EXISTS idx_suppliers_user ON suppliers("userId");
      CREATE INDEX IF NOT EXISTS idx_suppliers_name_gin ON suppliers USING GIN (name gin_trgm_ops);
      CREATE INDEX IF NOT EXISTS idx_supplier_payments_supplier ON supplier_payments("supplierId");
      CREATE INDEX IF NOT EXISTS idx_supplier_payments_user ON supplier_payments("userId");
      CREATE INDEX IF NOT EXISTS idx_clients_user ON clients("userId");
      CREATE INDEX IF NOT EXISTS idx_clients_name_gin ON clients USING GIN (name gin_trgm_ops);
      CREATE UNIQUE INDEX IF NOT EXISTS bookings_passport_trip_unique_partial
        ON bookings ("passportNumber", "tripId")
        WHERE "passportNumber" IS NOT NULL AND "passportNumber" != '';
      CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications("recipientId", "isRead");

      CREATE INDEX IF NOT EXISTS idx_employees_branch ON employees("branchId");
      CREATE INDEX IF NOT EXISTS idx_bookings_branch ON bookings("branchId");
      CREATE INDEX IF NOT EXISTS idx_expenses_branch ON expenses("branchId");
      CREATE INDEX IF NOT EXISTS idx_incomes_branch ON incomes("branchId");
      CREATE INDEX IF NOT EXISTS idx_daily_services_branch ON daily_services("branchId");
      CREATE INDEX IF NOT EXISTS idx_factures_branch ON factures("branchId");

      CREATE INDEX IF NOT EXISTS idx_bookings_client_id ON bookings("clientId");
      CREATE INDEX IF NOT EXISTS idx_clients_passport ON clients("userId", "passportNumber");
      CREATE INDEX IF NOT EXISTS idx_clients_ar_name ON clients("userId", "clientNameAr");
    `);

    // Migrate old bookings to clients
    await migrateOldBookingsToClients(client);

    console.log("Database initialization complete.");
  } catch (error) {
    console.error("Database initialization error:", error);
    process.exit(1);
  }
};

const migrateOldBookingsToClients = async (client) => {
  try {
    const unlinkedRes = await client.query(`
      SELECT id, "userId", "clientNameAr", "clientNameFr", "phoneNumber", 
             "passportNumber", "dateOfBirth", "passportExpirationDate", gender, "createdAt"
      FROM bookings
      WHERE "clientId" IS NULL
      ORDER BY id ASC
    `);

    if (unlinkedRes.rows.length === 0) {
      return;
    }

    console.log(`Starting migration of ${unlinkedRes.rows.length} unlinked bookings to clients...`);

    const existingClientsRes = await client.query(`
      SELECT id, "userId", name, "clientNameAr", "clientNameFr", phone, "passportNumber", "dateOfBirth", "passportExpirationDate", gender
      FROM clients
    `);

    const clientLookup = new Map();
    const getLookup = (userId) => {
      if (!clientLookup.has(userId)) {
        clientLookup.set(userId, {
          byPassport: new Map(),
          byName: new Map(),
          byArName: new Map(),
        });
      }
      return clientLookup.get(userId);
    };

    const registerClientInLookup = (c) => {
      const lk = getLookup(c.userId);
      if (c.passportNumber && String(c.passportNumber).trim()) {
        lk.byPassport.set(String(c.passportNumber).trim().toUpperCase(), c);
      }
      if (c.name && String(c.name).trim()) {
        lk.byName.set(String(c.name).trim().toLowerCase(), c);
      }
      if (c.clientNameAr && String(c.clientNameAr).trim()) {
        lk.byArName.set(String(c.clientNameAr).trim().toLowerCase(), c);
      }
    };

    for (const c of existingClientsRes.rows) {
      registerClientInLookup(c);
    }

    await client.query("BEGIN");

    for (const b of unlinkedRes.rows) {
      const userId = b.userId;
      const lk = getLookup(userId);

      const passport = b.passportNumber && String(b.passportNumber).trim() ? String(b.passportNumber).trim().toUpperCase() : null;

      let frFirstName = "";
      let frLastName = "";
      if (typeof b.clientNameFr === "object" && b.clientNameFr !== null) {
        frFirstName = (b.clientNameFr.firstName || "").trim();
        frLastName = (b.clientNameFr.lastName || "").trim();
      } else if (typeof b.clientNameFr === "string") {
        try {
          const parsed = JSON.parse(b.clientNameFr);
          frFirstName = (parsed.firstName || "").trim();
          frLastName = (parsed.lastName || "").trim();
        } catch (_) {
          frLastName = b.clientNameFr.trim();
        }
      }
      const fullNameFr = `${frFirstName} ${frLastName}`.trim();
      const arName = (b.clientNameAr || "").trim();
      const displayName = fullNameFr || arName || `Client ${b.id}`;
      const normFr = fullNameFr ? fullNameFr.toLowerCase() : "";
      const normAr = arName ? arName.toLowerCase() : "";

      let matchedClient = null;
      if (passport && lk.byPassport.has(passport)) {
        matchedClient = lk.byPassport.get(passport);
      } else if (normFr && lk.byName.has(normFr)) {
        matchedClient = lk.byName.get(normFr);
      } else if (normAr && lk.byArName.has(normAr)) {
        matchedClient = lk.byArName.get(normAr);
      } else if (normAr && lk.byName.has(normAr)) {
        matchedClient = lk.byName.get(normAr);
      }

      if (matchedClient) {
        const needsUpdate =
          (!matchedClient.passportNumber && passport) ||
          (!matchedClient.phone && b.phoneNumber) ||
          (!matchedClient.clientNameAr && arName) ||
          (!matchedClient.dateOfBirth && b.dateOfBirth) ||
          (!matchedClient.passportExpirationDate && b.passportExpirationDate) ||
          (!matchedClient.gender && b.gender);

        if (needsUpdate) {
          const updatedPhone = matchedClient.phone || b.phoneNumber || null;
          const updatedPassport = matchedClient.passportNumber || passport || null;
          const updatedAr = matchedClient.clientNameAr || arName || null;
          const updatedDob = matchedClient.dateOfBirth || b.dateOfBirth || null;
          const updatedExp = matchedClient.passportExpirationDate || b.passportExpirationDate || null;
          const updatedGender = matchedClient.gender || b.gender || null;

          await client.query(`
            UPDATE clients 
            SET phone = $1, "passportNumber" = $2, "clientNameAr" = $3, 
                "dateOfBirth" = $4, "passportExpirationDate" = $5, gender = $6, "updatedAt" = NOW()
            WHERE id = $7
          `, [updatedPhone, updatedPassport, updatedAr, updatedDob, updatedExp, updatedGender, matchedClient.id]);

          matchedClient.phone = updatedPhone;
          matchedClient.passportNumber = updatedPassport;
          matchedClient.clientNameAr = updatedAr;
          matchedClient.dateOfBirth = updatedDob;
          matchedClient.passportExpirationDate = updatedExp;
          matchedClient.gender = updatedGender;
          registerClientInLookup(matchedClient);
        }

        await client.query('UPDATE bookings SET "clientId" = $1 WHERE id = $2', [matchedClient.id, b.id]);
      } else {
        const clientNameFrJson = JSON.stringify({ firstName: frFirstName, lastName: frLastName });
        const insertRes = await client.query(`
          INSERT INTO clients ("userId", name, "clientNameAr", "clientNameFr", phone, "passportNumber", "dateOfBirth", "passportExpirationDate", gender, "createdAt", "updatedAt")
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $10)
          RETURNING *
        `, [
          userId,
          displayName,
          arName || null,
          clientNameFrJson,
          b.phoneNumber || null,
          passport || null,
          b.dateOfBirth || null,
          b.passportExpirationDate || null,
          b.gender || null,
          b.createdAt || new Date(),
        ]);

        const newClient = insertRes.rows[0];
        registerClientInLookup(newClient);
        await client.query('UPDATE bookings SET "clientId" = $1 WHERE id = $2', [newClient.id, b.id]);
      }
    }

    await client.query("COMMIT");
    console.log("Migration of old bookings to clients finished successfully.");
  } catch (migError) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("Error migrating old bookings to clients:", migError);
  }
};

module.exports = { applyDatabaseMigrations };
