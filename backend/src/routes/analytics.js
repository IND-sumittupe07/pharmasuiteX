const express = require("express");
const router  = express.Router();
const { query } = require("../db/db");

const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "No token" });
  try {
    const jwt = require("jsonwebtoken");
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch { res.status(401).json({ error: "Invalid token" }); }
};

// GET /api/analytics/dashboard
router.get("/dashboard", authenticate, async (req, res) => {
  const { pharmacyId } = req.user;

  try {
    // Run all queries safely with try/catch on each
    const [
      customersRes,
      activeRes,
      refillsRes,
      revenueRes,
      growthRes,
      conditionRes,
      medicinesRes,
      doctorsRes,
    ] = await Promise.all([

      // Total customers
      query(
        `SELECT COUNT(*) as count FROM customers WHERE pharmacy_id=$1 AND is_active=true`,
        [pharmacyId]
      ).catch(() => ({ rows:[{count:0}] })),

      // Active in last 30 days
      query(
        `SELECT COUNT(DISTINCT customer_id) as count FROM purchases
         WHERE pharmacy_id=$1 AND purchase_date >= NOW() - INTERVAL '30 days'`,
        [pharmacyId]
      ).catch(() => ({ rows:[{count:0}] })),

      // Refills due (medicines expiring in next 7 days)
      query(
        `SELECT COUNT(*) as count FROM customer_medicines
         WHERE pharmacy_id=$1 AND is_active=true
         AND (start_date + duration_days) BETWEEN NOW() AND NOW() + INTERVAL '7 days'`,
        [pharmacyId]
      ).catch(() => ({ rows:[{count:0}] })),

      // Total revenue
      query(
        `SELECT COALESCE(SUM(total_amount),0) as total FROM purchases WHERE pharmacy_id=$1`,
        [pharmacyId]
      ).catch(() => ({ rows:[{total:0}] })),

      // Monthly growth (last 6 months)
      query(
        `SELECT TO_CHAR(created_at,'Mon YYYY') as month,
                COUNT(*) as new_customers
         FROM customers
         WHERE pharmacy_id=$1 AND is_active=true
         AND created_at >= NOW() - INTERVAL '6 months'
         GROUP BY TO_CHAR(created_at,'Mon YYYY'), DATE_TRUNC('month',created_at)
         ORDER BY DATE_TRUNC('month',created_at)`,
        [pharmacyId]
      ).catch(() => ({ rows:[] })),

      // Condition mix
      query(
        `SELECT medical_condition, COUNT(*) as count
         FROM customers
         WHERE pharmacy_id=$1 AND is_active=true AND medical_condition IS NOT NULL
         GROUP BY medical_condition
         ORDER BY count DESC
         LIMIT 6`,
        [pharmacyId]
      ).catch(() => ({ rows:[] })),

      // Top medicines
      query(
        `SELECT m.name, m.category, COUNT(DISTINCT cm.customer_id) as patient_count
         FROM customer_medicines cm
         JOIN medicines m ON cm.medicine_name = m.name AND m.pharmacy_id=$1
         WHERE cm.pharmacy_id=$1 AND cm.is_active=true
         GROUP BY m.name, m.category
         ORDER BY patient_count DESC
         LIMIT 5`,
        [pharmacyId]
      ).catch(() => ({ rows:[] })),

      // Doctor referrals
      query(
        `SELECT d.name, d.speciality, COUNT(DISTINCT c.id) as patient_count
         FROM customers c
         JOIN doctors d ON c.doctor_id = d.id
         WHERE c.pharmacy_id=$1 AND c.is_active=true
         GROUP BY d.name, d.speciality
         ORDER BY patient_count DESC
         LIMIT 5`,
        [pharmacyId]
      ).catch(() => ({ rows:[] })),
    ]);

    res.json({
      totalCustomers:  parseInt(customersRes.rows[0]?.count) || 0,
      activeCustomers: parseInt(activeRes.rows[0]?.count)    || 0,
      refillsDue:      parseInt(refillsRes.rows[0]?.count)   || 0,
      totalRevenue:    parseFloat(revenueRes.rows[0]?.total) || 0,
      monthlyGrowth:   growthRes.rows   || [],
      conditionMix:    conditionRes.rows || [],
      topMedicines:    medicinesRes.rows || [],
      doctorReferrals: doctorsRes.rows   || [],
    });

  } catch (err) {
    console.error("Analytics dashboard error:", err);
    // Return empty data instead of 500 error
    res.json({
      totalCustomers: 0,
      activeCustomers: 0,
      refillsDue: 0,
      totalRevenue: 0,
      monthlyGrowth: [],
      conditionMix: [],
      topMedicines: [],
      doctorReferrals: [],
    });
  }
});

module.exports = router;
