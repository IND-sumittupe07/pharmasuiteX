const express = require("express");
const { query } = require("../db/db");
const { authenticate } = require("../middleware/auth");

const router = express.Router();
router.use(authenticate);

router.get("/dashboard", async (req, res) => {
  const { pharmacyId } = req.user;
  try {
    const [
      totalCustomers, activeCustomers, refillsDue, totalRevenue,
      topMedicines, conditionMix, monthlyGrowth, doctorReferrals,
      recentPurchases, lowStock, expiryAlert
    ] = await Promise.all([

      query("SELECT COUNT(*) FROM customers WHERE pharmacy_id=$1 AND is_active=true", [pharmacyId]),

      query(`SELECT COUNT(DISTINCT customer_id) FROM purchases
             WHERE pharmacy_id=$1 AND purchase_date >= CURRENT_DATE - INTERVAL '30 days'`, [pharmacyId]),

      query(`SELECT COUNT(DISTINCT customer_id) FROM customer_medicines
             WHERE pharmacy_id=$1 AND is_active=true
             AND (start_date + (duration_days - 5) * INTERVAL '1 day') <= CURRENT_DATE + INTERVAL '5 days'`, [pharmacyId]),

      query("SELECT COALESCE(SUM(total_amount),0) as total FROM purchases WHERE pharmacy_id=$1", [pharmacyId]),

      query(`SELECT medicine_name as name, category, COUNT(*) as patient_count
             FROM customer_medicines WHERE pharmacy_id=$1 AND is_active=true
             GROUP BY medicine_name, category ORDER BY patient_count DESC LIMIT 8`, [pharmacyId]),

      query(`SELECT medical_condition, COUNT(*) as count
             FROM customers WHERE pharmacy_id=$1 AND is_active=true AND medical_condition IS NOT NULL
             GROUP BY medical_condition ORDER BY count DESC LIMIT 6`, [pharmacyId]),

      query(`SELECT TO_CHAR(DATE_TRUNC('month', created_at),'Mon YYYY') as month,
                    COUNT(*) as new_customers
             FROM customers WHERE pharmacy_id=$1
             GROUP BY DATE_TRUNC('month', created_at)
             ORDER BY DATE_TRUNC('month', created_at) DESC LIMIT 7`, [pharmacyId]),

      query(`SELECT d.name, d.speciality, COUNT(c.id) as patient_count
             FROM doctors d JOIN customers c ON c.doctor_id = d.id
             WHERE d.pharmacy_id=$1 AND c.is_active=true
             GROUP BY d.id, d.name, d.speciality ORDER BY patient_count DESC`, [pharmacyId]),

      query(`SELECT p.*, c.full_name FROM purchases p
             JOIN customers c ON c.id = p.customer_id
             WHERE p.pharmacy_id=$1 ORDER BY p.created_at DESC LIMIT 5`, [pharmacyId]),

      query(`SELECT COUNT(*) FROM medicines
             WHERE pharmacy_id=$1 AND stock_qty <= low_stock_alert AND stock_qty >= 0`, [pharmacyId]),

      query(`SELECT COUNT(*) FROM medicine_batches
             WHERE pharmacy_id=$1 AND expiry_date <= CURRENT_DATE + INTERVAL '30 days'
             AND expiry_date >= CURRENT_DATE AND quantity > 0`, [pharmacyId]),
    ]);

    res.json({
      totalCustomers: parseInt(totalCustomers.rows[0].count),
      activeCustomers: parseInt(activeCustomers.rows[0].count),
      refillsDue: parseInt(refillsDue.rows[0].count),
      totalRevenue: parseFloat(totalRevenue.rows[0].total),
      topMedicines: topMedicines.rows,
      conditionMix: conditionMix.rows,
      monthlyGrowth: monthlyGrowth.rows.reverse(),
      doctorReferrals: doctorReferrals.rows,
      recentPurchases: recentPurchases.rows,
      lowStockCount: parseInt(lowStock.rows[0].count),
      expiryAlertCount: parseInt(expiryAlert.rows[0].count),
    });
  } catch (err) {
    console.error("Analytics error:", err);
    res.status(500).json({ error: "Failed to fetch analytics" });
  }
});

router.get("/revenue", async (req, res) => {
  const { pharmacyId } = req.user;
  try {
    const result = await query(`
      SELECT TO_CHAR(DATE_TRUNC('month', purchase_date),'Mon YYYY') as month,
             COALESCE(SUM(total_amount),0) as revenue,
             COUNT(*) as transactions
      FROM purchases WHERE pharmacy_id=$1
      GROUP BY DATE_TRUNC('month', purchase_date)
      ORDER BY DATE_TRUNC('month', purchase_date) DESC LIMIT 12
    `, [pharmacyId]);
    res.json(result.rows.reverse());
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch revenue" });
  }
});

module.exports = router;
