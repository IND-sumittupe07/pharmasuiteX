const express = require("express");
const { query } = require("../db/db");
const { authenticate } = require("../middleware/auth");
const { sendSMS, sendWhatsApp } = require("../services/messagingService");

const router = express.Router();
router.use(authenticate);

router.get("/", async (req, res) => {
  const { pharmacyId } = req.user;
  const days = parseInt(req.query.days) || 7;
  try {
    const result = await query(`
      SELECT
        c.id as customer_id, c.full_name, c.mobile, c.medical_condition, c.city,
        d.name as doctor_name,
        cm.id as medicine_id, cm.medicine_name, cm.category, cm.dose,
        (cm.start_date + (cm.duration_days - 5) * INTERVAL '1 day')::date as next_refill_date,
        EXTRACT(DAY FROM (cm.start_date + (cm.duration_days - 5) * INTERVAL '1 day') - CURRENT_DATE) as days_left
      FROM customer_medicines cm
      JOIN customers c ON c.id = cm.customer_id
      LEFT JOIN doctors d ON d.id = c.doctor_id
      WHERE cm.pharmacy_id = $1
        AND cm.is_active = true
        AND c.is_active = true
        AND (cm.start_date + (cm.duration_days - 5) * INTERVAL '1 day') <= CURRENT_DATE + ($2 * INTERVAL '1 day')
      ORDER BY next_refill_date ASC
    `, [pharmacyId, days]);
    res.json(result.rows);
  } catch (err) {
    console.error("Reminders error:", err);
    res.status(500).json({ error: "Failed to fetch reminders" });
  }
});

router.post("/send", async (req, res) => {
  const { pharmacyId } = req.user;
  const { customerId, medicineName, channel } = req.body;
  if (!customerId || !channel) return res.status(400).json({ error: "customerId and channel required" });
  try {
    const custRes = await query("SELECT full_name, mobile FROM customers WHERE id=$1 AND pharmacy_id=$2", [customerId, pharmacyId]);
    if (custRes.rows.length === 0) return res.status(404).json({ error: "Customer not found" });
    const { full_name, mobile } = custRes.rows[0];
    const pharmaRes = await query("SELECT name FROM pharmacies WHERE id=$1", [pharmacyId]);
    const storeName = pharmaRes.rows[0]?.name || "MedTrack";
    const message = `Hello ${full_name} ji, your medicine ${medicineName || ""} may be finishing soon. Please visit ${storeName} for refill. Stay healthy! 🙏`;
    let smsStatus = null, waStatus = null;
    if (channel === "sms" || channel === "both") smsStatus = await sendSMS(mobile, message);
    if (channel === "whatsapp" || channel === "both") waStatus = await sendWhatsApp(mobile, message);
    await query(
      "INSERT INTO reminder_logs (pharmacy_id, customer_id, channel, message, status) VALUES ($1,$2,$3,$4,$5)",
      [pharmacyId, customerId, channel, message, "sent"]
    );
    res.json({ success: true, smsStatus, waStatus, message });
  } catch (err) {
    console.error("Send reminder error:", err);
    res.status(500).json({ error: "Failed to send reminder" });
  }
});

router.post("/send-bulk", async (req, res) => {
  const { pharmacyId } = req.user;
  const { channel = "sms", days = 5 } = req.body;
  try {
    const dueRes = await query(`
      SELECT DISTINCT c.id as customer_id, c.full_name, c.mobile,
             STRING_AGG(cm.medicine_name, ', ') as medicines
      FROM customer_medicines cm
      JOIN customers c ON c.id = cm.customer_id
      WHERE cm.pharmacy_id = $1 AND cm.is_active = true AND c.is_active = true
        AND (cm.start_date + (cm.duration_days - 5) * INTERVAL '1 day') <= CURRENT_DATE + ($2 * INTERVAL '1 day')
      GROUP BY c.id, c.full_name, c.mobile
    `, [pharmacyId, days]);
    const pharmaRes = await query("SELECT name FROM pharmacies WHERE id=$1", [pharmacyId]);
    const storeName = pharmaRes.rows[0]?.name || "MedTrack";
    let sent = 0, failed = 0;
    for (const row of dueRes.rows) {
      const message = `Hello ${row.full_name} ji, your medicines (${row.medicines}) may be finishing soon. Visit ${storeName} for refill. 💊`;
      try {
        if (channel === "sms" || channel === "both") await sendSMS(row.mobile, message);
        if (channel === "whatsapp" || channel === "both") await sendWhatsApp(row.mobile, message);
        await query(
          "INSERT INTO reminder_logs (pharmacy_id, customer_id, channel, message, status) VALUES ($1,$2,$3,$4,'sent')",
          [pharmacyId, row.customer_id, channel, message]
        );
        sent++;
      } catch { failed++; }
    }
    res.json({ success: true, sent, failed, total: dueRes.rows.length });
  } catch (err) {
    res.status(500).json({ error: "Bulk send failed" });
  }
});

router.get("/logs", async (req, res) => {
  const { pharmacyId } = req.user;
  try {
    const result = await query(`
      SELECT rl.*, c.full_name, c.mobile
      FROM reminder_logs rl
      JOIN customers c ON c.id = rl.customer_id
      WHERE rl.pharmacy_id = $1
      ORDER BY rl.sent_at DESC LIMIT 100
    `, [pharmacyId]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch logs" });
  }
});

module.exports = router;
