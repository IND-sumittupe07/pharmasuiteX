const express = require("express");
const { query } = require("../db/db");
const { authenticate } = require("../middleware/auth");
const { checkLimit } = require("../middleware/planLimits");

const router = express.Router();
router.use(authenticate);

// GET /api/customers  ── List all customers with medicine count
router.get("/", async (req, res) => {
  const { pharmacyId } = req.user;
  const { search, condition, city } = req.query;
  try {
    let sql = `
      SELECT c.*,
             d.name as doctor_name,
             COUNT(cm.id) FILTER (WHERE cm.is_active) as medicine_count,
             MIN(cm.start_date + cm.duration_days - 5) as earliest_refill
      FROM customers c
      LEFT JOIN doctors d ON d.id = c.doctor_id
      LEFT JOIN customer_medicines cm ON cm.customer_id = c.id AND cm.is_active = true
      WHERE c.pharmacy_id = $1 AND c.is_active = true
    `;
    const params = [pharmacyId];
    let i = 2;
    if (search) { sql += ` AND (c.full_name ILIKE $${i} OR c.mobile ILIKE $${i})`; params.push(`%${search}%`); i++; }
    if (condition) { sql += ` AND c.medical_condition ILIKE $${i}`; params.push(`%${condition}%`); i++; }
    if (city) { sql += ` AND c.city ILIKE $${i}`; params.push(`%${city}%`); i++; }
    sql += ` GROUP BY c.id, d.name ORDER BY c.created_at DESC`;
    const result = await query(sql, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch customers" });
  }
});

// GET /api/customers/:id  ── Single customer with medicines + purchases
router.get("/:id", async (req, res) => {
  const { pharmacyId } = req.user;
  try {
    const cust = await query(
      `SELECT c.*, d.name as doctor_name, d.speciality as doctor_speciality
       FROM customers c LEFT JOIN doctors d ON d.id = c.doctor_id
       WHERE c.id = $1 AND c.pharmacy_id = $2`,
      [req.params.id, pharmacyId]
    );
    if (cust.rows.length === 0) return res.status(404).json({ error: "Customer not found" });

    const meds = await query(
      `SELECT cm.*, d.name as doctor_name,
              (cm.start_date + cm.duration_days - 5 - CURRENT_DATE) as days_left
       FROM customer_medicines cm
       LEFT JOIN doctors d ON d.id = cm.doctor_id
       WHERE cm.customer_id = $1 AND cm.is_active = true
       ORDER BY cm.created_at DESC`,
      [req.params.id]
    );

    const purchases = await query(
      `SELECT * FROM purchases WHERE customer_id = $1 ORDER BY purchase_date DESC LIMIT 12`,
      [req.params.id]
    );

    res.json({ ...cust.rows[0], medicines: meds.rows, purchases: purchases.rows });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch customer" });
  }
});

// POST /api/customers  ── Create customer
router.post("/", checkLimit("customers"), async (req, res) => {
  const { pharmacyId } = req.user;
  const { fullName, age, gender, mobile, address, city, doctorId, medicalCondition, notes } = req.body;
  if (!fullName || !mobile) return res.status(400).json({ error: "fullName and mobile are required" });
  try {
    // Auto-generate customer code
    const countRes = await query("SELECT COUNT(*) FROM customers WHERE pharmacy_id = $1", [pharmacyId]);
    const code = `C${String(parseInt(countRes.rows[0].count) + 1).padStart(3, "0")}`;

    const result = await query(
      `INSERT INTO customers (pharmacy_id, customer_code, full_name, age, gender, mobile, address, city, doctor_id, medical_condition, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [pharmacyId, code, fullName, age || null, gender || null, mobile, address || null, city || null, doctorId || null, medicalCondition || null, notes || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === "23505") return res.status(409).json({ error: "Mobile already registered" });
    console.error(err);
    res.status(500).json({ error: "Failed to create customer" });
  }
});

// PUT /api/customers/:id  ── Update customer
router.put("/:id", async (req, res) => {
  const { pharmacyId } = req.user;
  const { fullName, age, gender, mobile, address, city, doctorId, medicalCondition, notes } = req.body;
  try {
    const result = await query(
      `UPDATE customers SET full_name=$1,age=$2,gender=$3,mobile=$4,address=$5,city=$6,
       doctor_id=$7,medical_condition=$8,notes=$9,updated_at=NOW()
       WHERE id=$10 AND pharmacy_id=$11 RETURNING *`,
      [fullName, age, gender, mobile, address, city, doctorId || null, medicalCondition, notes, req.params.id, pharmacyId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "Customer not found" });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Failed to update customer" });
  }
});

// DELETE /api/customers/:id  ── Soft delete
router.delete("/:id", async (req, res) => {
  const { pharmacyId } = req.user;
  try {
    await query("UPDATE customers SET is_active=false WHERE id=$1 AND pharmacy_id=$2", [req.params.id, pharmacyId]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete customer" });
  }
});

// POST /api/customers/:id/medicines  ── Add medicine to customer
router.post("/:id/medicines", async (req, res) => {
  const { pharmacyId } = req.user;
  const { medicineName, category, dose, quantity, durationDays, startDate, doctorId } = req.body;
  if (!medicineName || !durationDays || !startDate) {
    return res.status(400).json({ error: "medicineName, durationDays, startDate required" });
  }
  try {
    const result = await query(
      `INSERT INTO customer_medicines (customer_id, pharmacy_id, medicine_name, category, dose, quantity, duration_days, start_date, doctor_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [req.params.id, pharmacyId, medicineName, category || null, dose || null, quantity || 1, durationDays, startDate, doctorId || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to add medicine" });
  }
});

// POST /api/customers/:id/purchases  ── Log a purchase
router.post("/:id/purchases", async (req, res) => {
  const { pharmacyId } = req.user;
  const { invoiceNumber, items, totalAmount, discountAmount, doctorId, notes, purchaseDate } = req.body;
  if (!items || !totalAmount) return res.status(400).json({ error: "items and totalAmount required" });
  try {
    const result = await query(
      `INSERT INTO purchases (pharmacy_id, customer_id, invoice_number, items, total_amount, discount_amount, doctor_id, notes, purchase_date)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [pharmacyId, req.params.id, invoiceNumber || null, JSON.stringify(items), totalAmount, discountAmount || 0, doctorId || null, notes || null, purchaseDate || new Date()]
    );
    // Update total spend
    await query("UPDATE customers SET total_spend = total_spend + $1 WHERE id = $2", [totalAmount, req.params.id]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Failed to log purchase" });
  }
});

module.exports = router;
