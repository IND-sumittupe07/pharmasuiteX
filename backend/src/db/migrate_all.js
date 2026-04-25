// ─── MedTrack Master Migration — Run this ONCE to set up everything ────────────
require("dotenv").config({ path: require("path").join(__dirname, "../../.env") });
const { pool } = require("./db");

const migrate = async () => {
  const client = await pool.connect();
  try {
    console.log("\n🔧 MedTrack Master Migration Starting...\n");
    await client.query("BEGIN");

    // ── 1. Pharmacies ─────────────────────────────────────────────
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
        plan VARCHAR(20) DEFAULT 'basic' CHECK (plan IN ('free','basic','premium','enterprise')),
        plan_expires_at TIMESTAMPTZ,
        fast2sms_key TEXT,
        interakt_key TEXT,
        razorpay_key TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log("  ✅ pharmacies");

    // ── 2. Users ──────────────────────────────────────────────────
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
    console.log("  ✅ users");

    // ── 3. Doctors ────────────────────────────────────────────────
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
    console.log("  ✅ doctors");

    // ── 4. Customers ──────────────────────────────────────────────
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
    console.log("  ✅ customers");

    // ── 5. Medicines ──────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS medicines (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        pharmacy_id UUID REFERENCES pharmacies(id) ON DELETE CASCADE,
        name VARCHAR(200) NOT NULL,
        category VARCHAR(100),
        manufacturer VARCHAR(200),
        unit VARCHAR(50) DEFAULT 'tablet',
        cost_price NUMERIC(10,2) DEFAULT 0,
        price_per_unit NUMERIC(10,2) DEFAULT 0,
        stock_qty INTEGER DEFAULT 0,
        low_stock_alert INTEGER DEFAULT 10,
        hsn_code VARCHAR(20) DEFAULT '3004',
        gst_percent NUMERIC(5,2) DEFAULT 12,
        batch_number VARCHAR(50),
        expiry_date DATE,
        rack_location VARCHAR(50),
        description TEXT,
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log("  ✅ medicines");

    // ── 6. Customer Medicines (prescriptions) ─────────────────────
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
        doctor_id UUID REFERENCES doctors(id) ON DELETE SET NULL,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log("  ✅ customer_medicines");

    // ── 7. Purchases / Sales ──────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS purchases (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        pharmacy_id UUID REFERENCES pharmacies(id) ON DELETE CASCADE,
        customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
        invoice_number VARCHAR(50),
        items JSONB NOT NULL,
        subtotal NUMERIC(12,2) DEFAULT 0,
        gst_amount NUMERIC(12,2) DEFAULT 0,
        cgst_amount NUMERIC(12,2) DEFAULT 0,
        sgst_amount NUMERIC(12,2) DEFAULT 0,
        total_amount NUMERIC(12,2) NOT NULL,
        discount_amount NUMERIC(12,2) DEFAULT 0,
        payment_mode VARCHAR(20) DEFAULT 'cash',
        prescription_number VARCHAR(50),
        doctor_id UUID REFERENCES doctors(id) ON DELETE SET NULL,
        is_gst_invoice BOOLEAN DEFAULT true,
        notes TEXT,
        purchase_date DATE DEFAULT CURRENT_DATE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log("  ✅ purchases");

    // ── 8. Reminder Logs ──────────────────────────────────────────
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
    console.log("  ✅ reminder_logs");

    // ── 9. Campaigns ──────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS campaigns (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        pharmacy_id UUID REFERENCES pharmacies(id) ON DELETE CASCADE,
        name VARCHAR(200) NOT NULL,
        message TEXT NOT NULL,
        target_filter VARCHAR(100) DEFAULT 'all',
        channel VARCHAR(20) CHECK (channel IN ('sms','whatsapp','both')),
        status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft','scheduled','active','completed')),
        scheduled_at TIMESTAMPTZ,
        total_sent INTEGER DEFAULT 0,
        created_by UUID REFERENCES users(id),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log("  ✅ campaigns");

    // ── 10. Suppliers ─────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS suppliers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        pharmacy_id UUID REFERENCES pharmacies(id) ON DELETE CASCADE,
        name VARCHAR(200) NOT NULL,
        contact_person VARCHAR(200),
        mobile VARCHAR(15),
        email VARCHAR(200),
        gst_number VARCHAR(20),
        drug_license VARCHAR(50),
        address TEXT,
        city VARCHAR(100),
        credit_days INTEGER DEFAULT 30,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log("  ✅ suppliers");

    // ── 11. Purchase Orders (from suppliers) ──────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS purchase_orders (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        pharmacy_id UUID REFERENCES pharmacies(id) ON DELETE CASCADE,
        supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
        po_number VARCHAR(50) UNIQUE,
        invoice_number VARCHAR(100),
        invoice_date DATE DEFAULT CURRENT_DATE,
        items JSONB NOT NULL DEFAULT '[]',
        subtotal NUMERIC(12,2) DEFAULT 0,
        gst_amount NUMERIC(12,2) DEFAULT 0,
        total_amount NUMERIC(12,2) NOT NULL,
        discount_amount NUMERIC(12,2) DEFAULT 0,
        payment_status VARCHAR(20) DEFAULT 'pending'
          CHECK (payment_status IN ('pending','partial','paid')),
        payment_due_date DATE,
        notes TEXT,
        created_by UUID REFERENCES users(id),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log("  ✅ purchase_orders");

    // ── 12. Medicine Batches (expiry tracking) ────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS medicine_batches (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        pharmacy_id UUID REFERENCES pharmacies(id) ON DELETE CASCADE,
        medicine_id UUID REFERENCES medicines(id) ON DELETE SET NULL,
        medicine_name VARCHAR(200) NOT NULL,
        batch_number VARCHAR(50) NOT NULL,
        expiry_date DATE NOT NULL,
        quantity INTEGER DEFAULT 0,
        purchase_price NUMERIC(10,2) DEFAULT 0,
        selling_price NUMERIC(10,2) DEFAULT 0,
        supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
        purchase_order_id UUID REFERENCES purchase_orders(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log("  ✅ medicine_batches");

    // ── 13. Payment Logs ──────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS payment_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        pharmacy_id UUID REFERENCES pharmacies(id) ON DELETE CASCADE,
        plan_id VARCHAR(20),
        amount NUMERIC(10,2),
        razorpay_order_id VARCHAR(100) UNIQUE,
        razorpay_payment_id VARCHAR(100),
        status VARCHAR(20) DEFAULT 'pending',
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log("  ✅ payment_logs");

    // ── 14. Indexes ───────────────────────────────────────────────
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_customers_pharmacy ON customers(pharmacy_id);
      CREATE INDEX IF NOT EXISTS idx_customers_mobile ON customers(mobile);
      CREATE INDEX IF NOT EXISTS idx_cm_customer ON customer_medicines(customer_id);
      CREATE INDEX IF NOT EXISTS idx_purchases_customer ON purchases(customer_id);
      CREATE INDEX IF NOT EXISTS idx_purchases_pharmacy ON purchases(pharmacy_id);
      CREATE INDEX IF NOT EXISTS idx_reminders_pharmacy ON reminder_logs(pharmacy_id);
      CREATE INDEX IF NOT EXISTS idx_batches_expiry ON medicine_batches(expiry_date);
      CREATE INDEX IF NOT EXISTS idx_batches_medicine ON medicine_batches(medicine_id);
      CREATE INDEX IF NOT EXISTS idx_po_pharmacy ON purchase_orders(pharmacy_id);
      CREATE INDEX IF NOT EXISTS idx_suppliers_pharmacy ON suppliers(pharmacy_id);
      CREATE INDEX IF NOT EXISTS idx_campaigns_pharmacy ON campaigns(pharmacy_id);
    `);
    console.log("  ✅ indexes");

    await client.query("COMMIT");
    console.log("\n✅ All tables created successfully!\n");
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
