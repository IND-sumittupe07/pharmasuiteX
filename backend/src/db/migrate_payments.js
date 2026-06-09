require("dotenv").config({ path: require("path").join(__dirname, "../../.env") });
const { pool } = require("./db");

const migrate = async () => {
  const client = await pool.connect();
  try {
    console.log("🔧 Running payments/messaging migration...");
    await client.query("BEGIN");

    // Add API key columns to pharmacies
    await client.query(`
      ALTER TABLE pharmacies
        ADD COLUMN IF NOT EXISTS fast2sms_key TEXT,
        ADD COLUMN IF NOT EXISTS interakt_key TEXT,
        ADD COLUMN IF NOT EXISTS razorpay_key TEXT;
    `);

    // Payment logs table
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

    await client.query("COMMIT");
    console.log("✅ Payments migration complete!");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Migration failed:", err.message);
  } finally {
    client.release();
    pool.end();
  }
};
migrate();
