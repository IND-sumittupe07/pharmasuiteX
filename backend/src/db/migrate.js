require("dotenv").config({ path: require("path").join(__dirname, "../../.env") });
const { pool } = require("./db");

const migrate = async () => {
  const client = await pool.connect();
  try {
    console.log("🔧 Running migrations...");
    await client.query("BEGIN");

    // ── Pharmacies (multi-tenant) ─────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS pharmacies (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(200) NOT NULL,
        owner_name VARCHAR(200) NOT NULL,
        mobile VARCHAR(15) UNIQUE NOT NULL,
        email VARCHAR(200) UNIQUE,
        address TEXT,
        city VARCHAR(100),
        state VARCHAR(100),
        gst_number VARCHAR(20),
        license_number VARCHAR(50),
        plan VARCHAR(20) DEFAULT 'basic' CHECK (plan IN ('basic','premium')),
        plan_expires_at TIMESTAMPTZ,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // ── Users (staff/owner login) ─────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        pharmacy_id UUID REFERENCES pharmacies(id) ON DELETE CASCADE,
        name VARCHAR(200) NOT NULL,
        mobile VARCHAR(15) NOT NULL,
        email VARCHAR(200),
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(20) DEFAULT 'staff' CHECK (role IN ('owner','staff')),
        is_active BOOLEAN DEFAULT true,
        last_login TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(pharmacy_id, mobile)
      );
    `);

    // ── Doctors ───────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS doctors (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        pharmacy_id UUID REFERENCES pharmacies(id) ON DELETE CASCADE,
        name VARCHAR(200) NOT NULL,
        speciality VARCHAR(100),
        mobile VARCHAR(15),
        clinic_name VARCHAR(200),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // ── Customers ─────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS customers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        pharmacy_id UUID REFERENCES pharmacies(id) ON DELETE CASCADE,
        customer_code VARCHAR(20),
        full_name VARCHAR(200) NOT NULL,
        age INTEGER CHECK (age > 0 AND age < 130),
        gender VARCHAR(10) CHECK (gender IN ('Male','Female','Other')),
        mobile VARCHAR(15) NOT NULL,
        address TEXT,
        city VARCHAR(100),
        doctor_id UUID REFERENCES doctors(id) ON DELETE SET NULL,
        medical_condition VARCHAR(200),
        notes TEXT,
        is_active BOOLEAN DEFAULT true,
        total_spend NUMERIC(12,2) DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(pharmacy_id, mobile)
      );
    `);

    // ── Medicine Catalogue ────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS medicines (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        pharmacy_id UUID REFERENCES pharmacies(id) ON DELETE CASCADE,
        name VARCHAR(200) NOT NULL,
        category VARCHAR(100),
        manufacturer VARCHAR(200),
        unit VARCHAR(50) DEFAULT 'tablet',
        price_per_unit NUMERIC(10,2),
        stock_qty INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // ── Customer Medicine Prescriptions ───────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS customer_medicines (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
        pharmacy_id UUID REFERENCES pharmacies(id) ON DELETE CASCADE,
        medicine_name VARCHAR(200) NOT NULL,
        category VARCHAR(100),
        dose VARCHAR(100),
        quantity INTEGER DEFAULT 1,
        duration_days INTEGER NOT NULL,
        start_date DATE NOT NULL,
        next_refill_date DATE GENERATED ALWAYS AS (start_date + duration_days - 5) STORED,
        doctor_id UUID REFERENCES doctors(id) ON DELETE SET NULL,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // ── Purchase History ──────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS purchases (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        pharmacy_id UUID REFERENCES pharmacies(id) ON DELETE CASCADE,
        customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
        invoice_number VARCHAR(50),
        items JSONB NOT NULL,
        total_amount NUMERIC(12,2) NOT NULL,
        discount_amount NUMERIC(12,2) DEFAULT 0,
        doctor_id UUID REFERENCES doctors(id) ON DELETE SET NULL,
        notes TEXT,
        purchase_date DATE DEFAULT CURRENT_DATE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // ── Reminder Logs ─────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS reminder_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        pharmacy_id UUID REFERENCES pharmacies(id) ON DELETE CASCADE,
        customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
        customer_medicine_id UUID REFERENCES customer_medicines(id) ON DELETE CASCADE,
        channel VARCHAR(20) CHECK (channel IN ('sms','whatsapp','both')),
        message TEXT,
        status VARCHAR(20) DEFAULT 'sent' CHECK (status IN ('sent','failed','pending')),
        sent_at TIMESTAMPTZ DEFAULT NOW(),
        error_message TEXT
      );
    `);

    // ── Campaigns ─────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS campaigns (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        pharmacy_id UUID REFERENCES pharmacies(id) ON DELETE CASCADE,
        name VARCHAR(200) NOT NULL,
        message TEXT NOT NULL,
        target_filter VARCHAR(100),
        channel VARCHAR(20) CHECK (channel IN ('sms','whatsapp','both')),
        status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft','scheduled','active','completed')),
        scheduled_at TIMESTAMPTZ,
        total_sent INTEGER DEFAULT 0,
        created_by UUID REFERENCES users(id),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // ── Indexes ───────────────────────────────────────────────────
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_customers_pharmacy ON customers(pharmacy_id);
      CREATE INDEX IF NOT EXISTS idx_customers_mobile ON customers(mobile);
      CREATE INDEX IF NOT EXISTS idx_cm_customer ON customer_medicines(customer_id);
      CREATE INDEX IF NOT EXISTS idx_cm_refill ON customer_medicines(next_refill_date);
      CREATE INDEX IF NOT EXISTS idx_purchases_customer ON purchases(customer_id);
      CREATE INDEX IF NOT EXISTS idx_reminders_pharmacy ON reminder_logs(pharmacy_id);
    `);

    await client.query("COMMIT");
    console.log("✅ All tables created successfully!");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Migration failed:", err.message);
    process.exit(1);
  } finally {
    client.release();
    pool.end();
  }
};

migrate();
