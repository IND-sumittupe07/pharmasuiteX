require("dotenv").config({ path: require("path").join(__dirname, "../../.env") });
const { pool } = require("./db");

const migrate = async () => {
  const client = await pool.connect();
  try {
    console.log("🔧 Running medicines migration...");
    await client.query("BEGIN");

    // Add new columns to medicines table
    await client.query(`
      ALTER TABLE medicines
        ADD COLUMN IF NOT EXISTS cost_price NUMERIC(10,2) DEFAULT 0,
        ADD COLUMN IF NOT EXISTS low_stock_alert INTEGER DEFAULT 10,
        ADD COLUMN IF NOT EXISTS description TEXT,
        ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
    `);

    // Seed sample medicines if table is empty
    const count = await client.query("SELECT COUNT(*) FROM medicines");
    if (parseInt(count.rows[0].count) === 0) {
      const pharma = await client.query("SELECT id FROM pharmacies LIMIT 1");
      if (pharma.rows.length > 0) {
        const pid = pharma.rows[0].id;
        const medicines = [
          ["Metformin 500mg",    "Diabetes",    "Sun Pharma",   "tablet", 8,  12,  200, 20],
          ["Amlodipine 5mg",     "BP",          "Cipla",        "tablet", 5,  8,   150, 15],
          ["Atorvastatin 10mg",  "Cardiac",     "Lupin",        "tablet", 15, 22,  100, 10],
          ["Thyroxine 50mcg",    "Thyroid",     "Abbott",       "tablet", 6,  10,  300, 30],
          ["Salbutamol Inhaler", "Respiratory", "GSK",          "piece",  85, 120, 25,  5],
          ["Paracetamol 500mg",  "Pain Relief", "GSK",          "tablet", 1,  2,   500, 50],
          ["Azithromycin 500mg", "Antibiotic",  "Cipla",        "tablet", 18, 28,  80,  10],
          ["Omeprazole 20mg",    "Gastro",      "Sun Pharma",   "tablet", 4,  7,   200, 20],
          ["Cetirizine 10mg",    "Allergy",     "UCB",          "tablet", 2,  4,   300, 30],
          ["Vitamin D3 60K",     "Supplements", "HealthKart",   "capsule",25, 40,  60,  10],
          ["Ferrous Sulfate",    "Supplements", "Macleods",     "tablet", 3,  5,   150, 15],
          ["Telmisartan 40mg",   "BP",          "Glenmark",     "tablet", 8,  13,  180, 20],
        ];
        for (const [name, cat, mfr, unit, cost, price, stock, alert] of medicines) {
          await client.query(
            `INSERT INTO medicines (pharmacy_id, name, category, manufacturer, unit, cost_price, price_per_unit, stock_qty, low_stock_alert)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT DO NOTHING`,
            [pid, name, cat, mfr, unit, cost, price, stock, alert]
          );
        }
        console.log("✅ Sample medicines seeded");
      }
    }

    await client.query("COMMIT");
    console.log("✅ Medicines migration complete!");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Migration failed:", err.message);
  } finally {
    client.release();
    pool.end();
  }
};

migrate();
