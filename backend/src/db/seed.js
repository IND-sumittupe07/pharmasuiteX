require("dotenv").config({ path: require("path").join(__dirname, "../../.env") });
const { pool } = require("./db");
const bcrypt = require("bcryptjs");

const seed = async () => {
  const client = await pool.connect();
  try {
    console.log("🌱 Seeding demo data...");
    await client.query("BEGIN");

    // ── Pharmacy ───────────────────────────────────────────────────
    const pharmacyRes = await client.query(`
      INSERT INTO pharmacies (name, owner_name, mobile, email, city, state, gst_number, license_number, plan)
      VALUES ('Sharma Medical Store', 'Ramesh Sharma', '9876543210', 'sharma@medtrack.in',
              'Pune', 'Maharashtra', '27AABCS1429B1Z8', 'MH-PH-2024-00432', 'premium')
      ON CONFLICT (mobile) DO UPDATE SET name = EXCLUDED.name
      RETURNING id;
    `);
    const pharmacyId = pharmacyRes.rows[0].id;
    console.log("✅ Pharmacy seeded:", pharmacyId);

    // ── No demo accounts seeded ──────────────────────────────────
    console.log("✅ No demo users seeded (create your own account via register)");

    // ── Doctors ────────────────────────────────────────────────────
    const doctorData = [
      ["Dr. Suresh Patil", "General Physician", "9811111111", "Patil Clinic"],
      ["Dr. Anita Kulkarni", "Cardiologist", "9822222222", "City Heart Centre"],
      ["Dr. Rajesh Deshmukh", "Endocrinologist", "9833333333", "Deshmukh Clinic"],
    ];
    const doctorIds = [];
    for (const [name, speciality, mobile, clinic] of doctorData) {
      const dr = await client.query(`
        INSERT INTO doctors (pharmacy_id, name, speciality, mobile, clinic_name)
        VALUES ($1,$2,$3,$4,$5) RETURNING id;
      `, [pharmacyId, name, speciality, mobile, clinic]);
      doctorIds.push(dr.rows[0].id);
    }
    console.log("✅ Doctors seeded");

    // ── Customers ──────────────────────────────────────────────────
    const customerData = [
      ["Rahul Sharma",    52, "Male",   "9876543210", "Pune",        doctorIds[0], "Diabetes",        4200],
      ["Sunita Deshpande",65, "Female", "9823456789", "Nashik",      doctorIds[1], "Hypertension",    1800],
      ["Vijay Jadhav",    45, "Male",   "9911223344", "Pune",        doctorIds[2], "Thyroid",          900],
      ["Kavita Bhosale",  38, "Female", "9765432100", "Mumbai",      doctorIds[0], "Asthma",          3500],
      ["Ramesh Kulkarni", 70, "Male",   "9654321000", "Nashik",      doctorIds[1], "Diabetes + BP",   6700],
      ["Priya Marathe",   29, "Female", "9812345670", "Aurangabad",  doctorIds[2], "Anemia",           750],
    ];
    const customerIds = [];
    for (let i = 0; i < customerData.length; i++) {
      const [name, age, gender, mobile, city, doctorId, condition, spend] = customerData[i];
      const code = `C${String(i + 1).padStart(3, "0")}`;
      const c = await client.query(`
        INSERT INTO customers (pharmacy_id, customer_code, full_name, age, gender, mobile, city, doctor_id, medical_condition, total_spend)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
        ON CONFLICT (pharmacy_id, mobile) DO UPDATE SET full_name = EXCLUDED.full_name
        RETURNING id;
      `, [pharmacyId, code, name, age, gender, mobile, city, doctorId, condition, spend]);
      customerIds.push(c.rows[0].id);
    }
    console.log("✅ Customers seeded");

    // ── Customer Medicines ─────────────────────────────────────────
    const medicineData = [
      [customerIds[0], "Metformin 500mg",    "Diabetes",   "1-0-1",  30, "2026-02-10", doctorIds[0]],
      [customerIds[0], "Atorvastatin 10mg",  "Cardiac",    "0-0-1",  30, "2026-02-10", doctorIds[0]],
      [customerIds[1], "Amlodipine 5mg",     "BP",         "1-0-0",  30, "2026-02-15", doctorIds[1]],
      [customerIds[2], "Thyroxine 50mcg",    "Thyroid",    "1-0-0",  30, "2026-02-20", doctorIds[2]],
      [customerIds[3], "Salbutamol Inhaler", "Respiratory","SOS",    45, "2026-02-05", doctorIds[0]],
      [customerIds[4], "Metformin 1000mg",   "Diabetes",   "1-0-1",  30, "2026-02-18", doctorIds[1]],
      [customerIds[4], "Telmisartan 40mg",   "BP",         "1-0-0",  30, "2026-02-18", doctorIds[1]],
      [customerIds[5], "Ferrous Sulfate",    "Supplements","1-1-1",  60, "2026-01-20", doctorIds[2]],
    ];
    for (const [custId, medName, cat, dose, dur, start, docId] of medicineData) {
      await client.query(`
        INSERT INTO customer_medicines (customer_id, pharmacy_id, medicine_name, category, dose, duration_days, start_date, doctor_id)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8);
      `, [custId, pharmacyId, medName, cat, dose, dur, start, docId]);
    }
    console.log("✅ Customer medicines seeded");

    // ── Purchase Records ───────────────────────────────────────────
    await client.query(`
      INSERT INTO purchases (pharmacy_id, customer_id, invoice_number, items, total_amount, purchase_date)
      VALUES
        ($1, $2, 'INV-001', '[{"name":"Metformin 500mg","qty":30,"price":40},{"name":"Atorvastatin 10mg","qty":30,"price":110}]', 1500, '2026-02-10'),
        ($1, $3, 'INV-002', '[{"name":"Amlodipine 5mg","qty":30,"price":60}]', 900, '2026-02-15'),
        ($1, $4, 'INV-003', '[{"name":"Thyroxine 50mcg","qty":30,"price":30}]', 350, '2026-02-20');
    `, [pharmacyId, customerIds[0], customerIds[1], customerIds[2]]);
    console.log("✅ Purchases seeded");

    // ── Campaigns ──────────────────────────────────────────────────
    await client.query(`
      INSERT INTO campaigns (pharmacy_id, name, message, target_filter, channel, status, total_sent)
      VALUES
        ($1,'Diabetes Care Week','Get 10% off on all Diabetes medicines this week!','diabetes','both','active',124),
        ($1,'Senior Health Drive','Free BP check on purchase above ₹500!','senior','sms','scheduled',0),
        ($1,'Summer Wellness','Stay healthy this summer! 15% off on vitamins & supplements.','all','whatsapp','draft',0);
    `, [pharmacyId]);
    console.log("✅ Campaigns seeded");

    await client.query("COMMIT");
    console.log("\n🎉 Seed complete!");
    console.log("──────────────────────────────────────");
    console.log("🔑 Login: mobile=9876543210  password=demo1234");
    console.log("──────────────────────────────────────\n");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Seed failed:", err.message);
    process.exit(1);
  } finally {
    client.release();
    pool.end();
  }
};

seed();
