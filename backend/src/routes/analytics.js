const express = require("express");
const router  = express.Router();
const { query } = require("../db/db");
const { authenticate } = require("../middleware/auth");

router.use(authenticate);

// GET /api/analytics/dashboard
router.get("/dashboard", async (req, res) => {
  const { pharmacyId } = req.user;
  try {
    const totalRes = await query(
      `SELECT COUNT(*) as count FROM customers WHERE pharmacy_id=$1 AND is_active=true`,
      [pharmacyId]
    ).catch(() => ({ rows: [{ count: 0 }] }));

    const activeRes = await query(
      `SELECT COUNT(DISTINCT customer_id) as count FROM purchases 
       WHERE pharmacy_id=$1 AND purchase_date >= NOW() - INTERVAL '30 days'`,
      [pharmacyId]
    ).catch(() => ({ rows: [{ count: 0 }] }));

    // ✅ FIXED: Proper interval cast + includes overdue (not just future 7 days)
    // Refill date = start_date + duration_days, minus 5-day early reminder
    const refillsRes = await query(
      `SELECT COUNT(*) as count FROM customer_medicines
       WHERE pharmacy_id=$1 AND is_active=true
       AND (start_date + (duration_days || ' days')::INTERVAL - INTERVAL '5 days')::DATE 
           <= CURRENT_DATE + INTERVAL '7 days'`,
      [pharmacyId]
    ).catch((e) => { console.error("refillsRes error:", e.message); return { rows: [{ count: 0 }] }; });

    const revenueRes = await query(
      `SELECT COALESCE(SUM(total_amount), 0) as total FROM purchases WHERE pharmacy_id=$1`,
      [pharmacyId]
    ).catch(() => ({ rows: [{ total: 0 }] }));

    const doctorsRes = await query(
      `SELECT d.name, d.speciality, COUNT(DISTINCT c.id) as patient_count
       FROM customers c
       JOIN doctors d ON c.doctor_id = d.id
       WHERE c.pharmacy_id=$1 AND c.is_active=true AND d.id IS NOT NULL
       GROUP BY d.name, d.speciality
       ORDER BY patient_count DESC LIMIT 5`,
      [pharmacyId]
    ).catch(() => ({ rows: [] }));

    const conditionRes = await query(
      `SELECT COALESCE(medical_condition,'Not specified') as medical_condition, COUNT(*) as count
       FROM customers WHERE pharmacy_id=$1 AND is_active=true
       GROUP BY medical_condition ORDER BY count DESC LIMIT 6`,
      [pharmacyId]
    ).catch(() => ({ rows: [] }));

    res.json({
      totalCustomers:  parseInt(totalRes.rows[0]?.count)   || 0,
      activeCustomers: parseInt(activeRes.rows[0]?.count)  || 0,
      refillsDue:      parseInt(refillsRes.rows[0]?.count) || 0,
      totalRevenue:    parseFloat(revenueRes.rows[0]?.total) || 0,
      doctorReferrals: doctorsRes.rows   || [],
      conditionMix:    conditionRes.rows || [],
    });
  } catch (err) {
    console.error("Analytics dashboard error:", err.message);
    res.json({
      totalCustomers: 0, activeCustomers: 0, refillsDue: 0,
      totalRevenue: 0, doctorReferrals: [], conditionMix: [],
    });
  }
});

// GET /api/analytics/revenue — Monthly revenue (last 6 months)
router.get("/revenue", async (req, res) => {
  const { pharmacyId } = req.user;
  try {
    const result = await query(
      `SELECT 
         TO_CHAR(DATE_TRUNC('month', purchase_date), 'Mon YYYY') as month,
         COALESCE(SUM(total_amount), 0) as revenue
       FROM purchases
       WHERE pharmacy_id = $1
       AND purchase_date >= NOW() - INTERVAL '6 months'
       GROUP BY DATE_TRUNC('month', purchase_date)
       ORDER BY DATE_TRUNC('month', purchase_date) ASC`,
      [pharmacyId]
    );

    const monthsMap = {};
    result.rows.forEach(r => { monthsMap[r.month] = parseFloat(r.revenue); });

    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setDate(1);
      d.setMonth(d.getMonth() - i);
      const label = d.toLocaleString("default", { month: "short", year: "numeric" });
      months.push({ month: label, revenue: monthsMap[label] || 0 });
    }
    res.json(months);
  } catch (err) {
    console.error("Analytics revenue error:", err.message);
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      months.push({ month: d.toLocaleString("default", { month: "short" }), revenue: 0 });
    }
    res.json(months);
  }
});

// ✅ NEW: GET /api/analytics/refills — Detailed list (used by Reminders page too)
router.get("/refills", async (req, res) => {
  const { pharmacyId } = req.user;
  try {
    const result = await query(
      `SELECT cm.id, cm.medicine_name, cm.dose, cm.quantity, cm.start_date, cm.duration_days,
              (cm.start_date + (cm.duration_days || ' days')::INTERVAL)::DATE as refill_date,
              ((cm.start_date + (cm.duration_days || ' days')::INTERVAL)::DATE - CURRENT_DATE) as days_left,
              c.id as customer_id, c.full_name, c.mobile
       FROM customer_medicines cm
       JOIN customers c ON c.id = cm.customer_id
       WHERE cm.pharmacy_id = $1 AND cm.is_active = true
       AND (cm.start_date + (cm.duration_days || ' days')::INTERVAL - INTERVAL '5 days')::DATE 
           <= CURRENT_DATE + INTERVAL '7 days'
       ORDER BY refill_date ASC`,
      [pharmacyId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Refills list error:", err.message);
    res.json([]);
  }
});

module.exports = router;
