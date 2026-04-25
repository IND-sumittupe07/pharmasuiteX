const express = require("express");
const { query } = require("../db/db");
const { authenticate } = require("../middleware/auth");
const { sendSMS, sendWhatsApp, sendBulkSMS } = require("../services/messagingService");

const router = express.Router();
router.use(authenticate);

const TEMPLATES = [
  { id: "refill",   label: "Refill Reminder",   emoji: "💊", message: "Hello {name} ji, your medicines may be finishing soon. Please visit {store} for refill. Stay healthy! 🙏" },
  { id: "discount", label: "Discount Offer",    emoji: "🎁", message: "Hello {name} ji, {store} is offering special discount this week! Visit us for great savings on your medicines. 💊" },
  { id: "festival", label: "Festival Greeting", emoji: "🎉", message: "Hello {name} ji, {store} wishes you and your family good health and happiness! 🎉" },
  { id: "checkup",  label: "Health Checkup",    emoji: "🩺", message: "Hello {name} ji, time for your regular health checkup! {store} is here to help. Stay healthy. 🙏" },
  { id: "newstock", label: "New Stock Arrived", emoji: "📦", message: "Hello {name} ji, fresh stock of medicines now available at {store}. Visit us today! 💊" },
  { id: "custom",   label: "Custom Message",    emoji: "✏️", message: "" },
];

router.get("/templates", (req, res) => res.json(TEMPLATES));

router.get("/audience-preview", async (req, res) => {
  const { pharmacyId } = req.user;
  const { filter = "all", city = "" } = req.query;
  try {
    let sql = "SELECT COUNT(*) as count FROM customers WHERE pharmacy_id=$1 AND is_active=true";
    const params = [pharmacyId];
    let i = 2;
    if (filter && filter !== "all") {
      if (filter === "senior") sql += " AND age >= 60";
      else if (filter === "new") sql += " AND created_at >= NOW() - INTERVAL '30 days'";
      else if (filter === "highspend") sql += " AND total_spend >= 2000";
      else { sql += ` AND medical_condition ILIKE $${i}`; params.push(`%${filter}%`); i++; }
    }
    if (city && city !== "all") { sql += ` AND city ILIKE $${i}`; params.push(`%${city}%`); }
    const [countRes, namesRes, citiesRes] = await Promise.all([
      query(sql, params),
      query("SELECT full_name FROM customers WHERE pharmacy_id=$1 AND is_active=true ORDER BY RANDOM() LIMIT 5", [pharmacyId]),
      query("SELECT DISTINCT city FROM customers WHERE pharmacy_id=$1 AND is_active=true AND city IS NOT NULL ORDER BY city", [pharmacyId]),
    ]);
    res.json({
      count: parseInt(countRes.rows[0].count),
      sampleNames: namesRes.rows.map(r => r.full_name),
      cities: citiesRes.rows.map(r => r.city),
    });
  } catch (err) {
    res.status(500).json({ error: "Preview failed" });
  }
});

router.get("/", async (req, res) => {
  const { pharmacyId } = req.user;
  try {
    const result = await query(
      "SELECT c.*, u.name as created_by_name FROM campaigns c LEFT JOIN users u ON u.id = c.created_by WHERE c.pharmacy_id=$1 ORDER BY c.created_at DESC",
      [pharmacyId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch campaigns" });
  }
});

router.post("/", async (req, res) => {
  const { pharmacyId, userId } = req.user;
  const { name, message, targetFilter, channel, scheduledAt } = req.body;
  if (!name || !message || !channel) return res.status(400).json({ error: "name, message, channel required" });
  try {
    const result = await query(
      "INSERT INTO campaigns (pharmacy_id, name, message, target_filter, channel, scheduled_at, created_by) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *",
      [pharmacyId, name, message, targetFilter || "all", channel, scheduledAt || null, userId]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Failed to create campaign" });
  }
});

router.put("/:id", async (req, res) => {
  const { pharmacyId } = req.user;
  const { name, message, targetFilter, channel, scheduledAt } = req.body;
  try {
    const result = await query(
      "UPDATE campaigns SET name=$1,message=$2,target_filter=$3,channel=$4,scheduled_at=$5 WHERE id=$6 AND pharmacy_id=$7 AND status='draft' RETURNING *",
      [name, message, targetFilter || "all", channel, scheduledAt || null, req.params.id, pharmacyId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "Not found or already launched" });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Failed to update" });
  }
});

// POST /api/campaigns/:id/launch — Launch with real messaging
router.post("/:id/launch", async (req, res) => {
  const { pharmacyId } = req.user;
  try {
    const campRes = await query("SELECT * FROM campaigns WHERE id=$1 AND pharmacy_id=$2", [req.params.id, pharmacyId]);
    if (campRes.rows.length === 0) return res.status(404).json({ error: "Not found" });
    const campaign = campRes.rows[0];

    const pharmaRes = await query("SELECT name, fast2sms_key, interakt_key FROM pharmacies WHERE id=$1", [pharmacyId]);
    const pharmacy  = pharmaRes.rows[0];
    const storeName = pharmacy?.name || "MedTrack";

    // Get API keys (pharmacy-specific or fallback to env)
    const smsKey = pharmacy?.fast2sms_key || process.env.FAST2SMS_API_KEY;
    const waKey  = pharmacy?.interakt_key  || process.env.INTERAKT_API_KEY;

    // Build customer list
    let customerQuery = "SELECT full_name, mobile FROM customers WHERE pharmacy_id=$1 AND is_active=true";
    const params = [pharmacyId];
    let i = 2;
    const filter = campaign.target_filter?.toLowerCase();
    if (filter && filter !== "all") {
      if (filter === "senior") customerQuery += " AND age >= 60";
      else if (filter === "new") customerQuery += " AND created_at >= NOW() - INTERVAL '30 days'";
      else if (filter === "highspend") customerQuery += " AND total_spend >= 2000";
      else { customerQuery += ` AND medical_condition ILIKE $${i}`; params.push(`%${filter}%`); i++; }
    }

    const customers = await query(customerQuery, params);
    let sent = 0, failed = 0, skipped = 0;

    if (campaign.channel === "sms" || campaign.channel === "both") {
      // Bulk SMS via Fast2SMS
      if (smsKey && customers.rows.length > 0) {
        const numbers = customers.rows.map(c => c.mobile);
        const msg = campaign.message.replace(/{store}/gi, storeName).replace(/{name}/gi, "");
        const result = await sendBulkSMS(numbers, msg, smsKey);
        if (result.status === "sent") {
          sent += customers.rows.length;
        } else if (result.status === "skipped") {
          skipped += customers.rows.length;
        } else {
          failed += customers.rows.length;
        }
      } else {
        skipped += customers.rows.length;
      }
    }

    if (campaign.channel === "whatsapp" || campaign.channel === "both") {
      // Individual WhatsApp via Interakt (personalized)
      for (const c of customers.rows) {
        const msg = campaign.message.replace(/{name}/gi, c.full_name).replace(/{store}/gi, storeName);
        const result = await sendWhatsApp(c.mobile, msg, waKey);
        if (result.status === "sent") sent++;
        else if (result.status === "skipped") skipped++;
        else failed++;
      }
    }

    await query("UPDATE campaigns SET status='completed', total_sent=$1 WHERE id=$2", [sent, req.params.id]);

    res.json({
      success: true, sent, failed, skipped,
      total: customers.rows.length,
      note: skipped > 0 ? "Some messages skipped — configure API keys in Settings > Messaging" : null,
    });
  } catch (err) {
    console.error("Campaign launch error:", err);
    res.status(500).json({ error: "Failed to launch" });
  }
});

router.post("/:id/duplicate", async (req, res) => {
  const { pharmacyId, userId } = req.user;
  try {
    const orig = await query("SELECT * FROM campaigns WHERE id=$1 AND pharmacy_id=$2", [req.params.id, pharmacyId]);
    if (orig.rows.length === 0) return res.status(404).json({ error: "Not found" });
    const c = orig.rows[0];
    const result = await query(
      "INSERT INTO campaigns (pharmacy_id, name, message, target_filter, channel, created_by) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *",
      [pharmacyId, `${c.name} (Copy)`, c.message, c.target_filter, c.channel, userId]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Failed to duplicate" });
  }
});

router.delete("/:id", async (req, res) => {
  const { pharmacyId } = req.user;
  try {
    await query("DELETE FROM campaigns WHERE id=$1 AND pharmacy_id=$2", [req.params.id, pharmacyId]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete" });
  }
});

module.exports = router;
