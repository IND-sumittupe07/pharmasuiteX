require("dotenv").config({ path: require("path").join(__dirname, "../../.env") });
const { pool } = require("./db");

const migrate = async () => {
  const client = await pool.connect();
  try {
    console.log("🔧 Running Phase 1 migration...");
    await client.query("BEGIN");

    // ── Add expiry_date + HSN to medicines ──────────────────────
    await client.query(`
      ALTER TABLE medicines
        ADD COLUMN IF NOT EXISTS hsn_code VARCHAR(20),
        ADD COLUMN IF NOT EXISTS gst_percent NUMERIC(5,2) DEFAULT 12,
        ADD COLUMN IF NOT EXISTS batch_number VARCHAR(50),
        ADD COLUMN IF NOT EXISTS expiry_date DATE,
        ADD COLUMN IF NOT EXISTS rack_location VARCHAR(50);
    `);

    // ── Upgrade purchases table for GST invoices ─────────────────
    await client.query(`
      ALTER TABLE purchases
        ADD COLUMN IF NOT EXISTS gst_amount NUMERIC(12,2) DEFAULT 0,
        ADD COLUMN IF NOT EXISTS cgst_amount NUMERIC(12,2) DEFAULT 0,
        ADD COLUMN IF NOT EXISTS sgst_amount NUMERIC(12,2) DEFAULT 0,
        ADD COLUMN IF NOT EXISTS subtotal NUMERIC(12,2) DEFAULT 0,
        ADD COLUMN IF NOT EXISTS payment_mode VARCHAR(20) DEFAULT 'cash',
        ADD COLUMN IF NOT EXISTS prescription_number VARCHAR(50),
        ADD COLUMN IF NOT EXISTS is_gst_invoice BOOLEAN DEFAULT false;
    `);

    // ── Suppliers table ───────────────────────────────────────────
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

    // ── Purchase Orders (from supplier) ──────────────────────────
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

    // ── Medicine Batches (expiry tracking) ────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS medicine_batches (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        pharmacy_id UUID REFERENCES pharmacies(id) ON DELETE CASCADE,
        medicine_id UUID REFERENCES medicines(id) ON DELETE CASCADE,
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

    // ── Indexes ──────────────────────────────────────────────────
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_batches_expiry ON medicine_batches(expiry_date);
      CREATE INDEX IF NOT EXISTS idx_batches_medicine ON medicine_batches(medicine_id);
      CREATE INDEX IF NOT EXISTS idx_po_pharmacy ON purchase_orders(pharmacy_id);
      CREATE INDEX IF NOT EXISTS idx_suppliers_pharmacy ON suppliers(pharmacy_id);
    `);

    // ── Seed sample supplier ──────────────────────────────────────
    const pharma = await client.query("SELECT id FROM pharmacies LIMIT 1");
    if (pharma.rows.length > 0) {
      const pid = pharma.rows[0].id;
      await client.query(`
        INSERT INTO suppliers (pharmacy_id, name, contact_person, mobile, gst_number, city, credit_days)
        VALUES
          ($1, 'Mehta Pharma Distributors', 'Rajesh Mehta', '9812345678', '27AABCM1234B1Z5', 'Pune', 30),
          ($1, 'Sun Pharma Agency', 'Priya Sharma', '9823456789', '27AABCS9876C2Z3', 'Mumbai', 45)
        ON CONFLICT DO NOTHING
      `, [pid]);
    }

    await client.query("COMMIT");
    console.log("✅ Phase 1 migration complete!");
    console.log("  → Expiry tracking columns added");
    console.log("  → GST invoice columns added");
    console.log("  → Suppliers table created");
    console.log("  → Purchase orders table created");
    console.log("  → Medicine batches table created");
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
