const express = require("express");
const { query } = require("../db/db");
const { authenticate } = require("../middleware/auth");

const router = express.Router();
router.use(authenticate);

const toCSV = (headers, rows) => {
  const escape = v => `"${String(v ?? "").replace(/"/g, '""')}"`;
  return [headers, ...rows].map(r => r.map(escape).join(",")).join("\n");
};

const sendCSV = (res, filename, csv) => {
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.send(csv);
};

// GET /api/export/customers
router.get("/customers", async (req, res) => {
  const { pharmacyId } = req.user;
  try {
    const result = await query(`
      SELECT c.customer_code, c.full_name, c.age, c.gender, c.mobile, c.city,
             c.medical_condition, c.total_spend, c.created_at,
             d.name as doctor_name,
             STRING_AGG(cm.medicine_name, ' | ') as medicines
      FROM customers c
      LEFT JOIN doctors d ON d.id = c.doctor_id
      LEFT JOIN customer_medicines cm ON cm.customer_id = c.id AND cm.is_active = true
      WHERE c.pharmacy_id=$1 AND c.is_active=true
      GROUP BY c.id, d.name ORDER BY c.created_at DESC
    `, [pharmacyId]);

    const headers = ["Customer ID","Name","Age","Gender","Mobile","City","Condition","Doctor","Total Spend (₹)","Medicines","Joined Date"];
    const rows = result.rows.map(r => [
      r.customer_code, r.full_name, r.age, r.gender, r.mobile, r.city,
      r.medical_condition, r.doctor_name, r.total_spend, r.medicines,
      new Date(r.created_at).toLocaleDateString("en-IN")
    ]);
    sendCSV(res, `MedTrack_Customers_${Date.now()}.csv`, toCSV(headers, rows));
  } catch (err) {
    res.status(500).json({ error: "Export failed" });
  }
});

// GET /api/export/medicines
router.get("/medicines", async (req, res) => {
  const { pharmacyId } = req.user;
  try {
    const result = await query(`
      SELECT medicine_name, category, COUNT(*) as patients, SUM(quantity) as total_qty
      FROM customer_medicines WHERE pharmacy_id=$1 AND is_active=true
      GROUP BY medicine_name, category ORDER BY patients DESC
    `, [pharmacyId]);
    const headers = ["Medicine Name","Category","Total Patients","Total Qty Dispensed"];
    const rows = result.rows.map(r => [r.medicine_name, r.category, r.patients, r.total_qty]);
    sendCSV(res, `MedTrack_Medicines_${Date.now()}.csv`, toCSV(headers, rows));
  } catch (err) {
    res.status(500).json({ error: "Export failed" });
  }
});

// GET /api/export/refills
router.get("/refills", async (req, res) => {
  const { pharmacyId } = req.user;
  try {
    const result = await query(`
      SELECT c.customer_code, c.full_name, c.mobile, c.medical_condition,
             cm.medicine_name, (cm.start_date + cm.duration_days - 5) as next_refill_date,
             (cm.start_date + cm.duration_days - 5 - CURRENT_DATE) as days_left,
             d.name as doctor_name
      FROM customer_medicines cm
      JOIN customers c ON c.id = cm.customer_id
      LEFT JOIN doctors d ON d.id = c.doctor_id
      WHERE cm.pharmacy_id=$1 AND cm.is_active=true AND c.is_active=true
        AND (cm.start_date + cm.duration_days - 5) <= CURRENT_DATE + 30
      ORDER BY (cm.start_date + cm.duration_days - 5) ASC
    `, [pharmacyId]);

    const headers = ["Customer ID","Name","Mobile","Condition","Medicine","Refill Date","Days Left","Urgency","Doctor"];
    const rows = result.rows.map(r => [
      r.customer_code, r.full_name, r.mobile, r.medical_condition,
      r.medicine_name, r.next_refill_date, r.days_left,
      r.days_left <= 2 ? "URGENT" : r.days_left <= 5 ? "HIGH" : "MEDIUM",
      r.doctor_name
    ]);
    sendCSV(res, `MedTrack_Refills_${Date.now()}.csv`, toCSV(headers, rows));
  } catch (err) {
    res.status(500).json({ error: "Export failed" });
  }
});

// GET /api/export/campaigns
router.get("/campaigns", async (req, res) => {
  const { pharmacyId } = req.user;
  try {
    const result = await query("SELECT * FROM campaigns WHERE pharmacy_id=$1 ORDER BY created_at DESC", [pharmacyId]);
    const headers = ["Campaign","Target","Channel","Status","Messages Sent","Scheduled Date","Message"];
    const rows = result.rows.map(r => [r.name, r.target_filter, r.channel, r.status, r.total_sent, r.scheduled_at, r.message]);
    sendCSV(res, `MedTrack_Campaigns_${Date.now()}.csv`, toCSV(headers, rows));
  } catch (err) {
    res.status(500).json({ error: "Export failed" });
  }
});

// GET /api/export/purchases
router.get("/purchases", async (req, res) => {
  const { pharmacyId } = req.user;
  try {
    const result = await query(`
      SELECT p.invoice_number, c.full_name, c.mobile, p.total_amount,
             p.discount_amount, p.purchase_date, p.items
      FROM purchases p JOIN customers c ON c.id = p.customer_id
      WHERE p.pharmacy_id=$1 ORDER BY p.purchase_date DESC
    `, [pharmacyId]);
    const headers = ["Invoice","Customer","Mobile","Total (₹)","Discount (₹)","Date","Items"];
    const rows = result.rows.map(r => [
      r.invoice_number, r.full_name, r.mobile, r.total_amount, r.discount_amount,
      new Date(r.purchase_date).toLocaleDateString("en-IN"),
      JSON.stringify(r.items)
    ]);
    sendCSV(res, `MedTrack_Purchases_${Date.now()}.csv`, toCSV(headers, rows));
  } catch (err) {
    res.status(500).json({ error: "Export failed" });
  }
});

module.exports = router;
