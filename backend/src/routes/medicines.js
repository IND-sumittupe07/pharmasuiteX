const express = require("express");
const { query } = require("../db/db");
const { authenticate } = require("../middleware/auth");

const router = express.Router();
router.use(authenticate);

// GET /api/medicines
router.get("/", async (req, res) => {
  const { pharmacyId } = req.user;
  const { search, category, lowStock } = req.query;
  try {
    let sql = `
      SELECT m.*,
             COALESCE(cm.patient_count, 0) as patient_count
      FROM medicines m
      LEFT JOIN (
        SELECT medicine_name, COUNT(DISTINCT customer_id) as patient_count
        FROM customer_medicines WHERE pharmacy_id=$1 AND is_active=true
        GROUP BY medicine_name
      ) cm ON cm.medicine_name = m.name
      WHERE m.pharmacy_id=$1
    `;
    const params = [pharmacyId];
    let i = 2;
    if (search) { sql += ` AND (m.name ILIKE $${i} OR m.manufacturer ILIKE $${i})`; params.push(`%${search}%`); i++; }
    if (category && category !== "all") { sql += ` AND m.category ILIKE $${i}`; params.push(`%${category}%`); i++; }
    if (lowStock === "true") { sql += ` AND m.stock_qty <= m.low_stock_alert`; }
    sql += ` ORDER BY m.name ASC`;
    const result = await query(sql, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch medicines" });
  }
});

// GET /api/medicines/summary
router.get("/summary", async (req, res) => {
  const { pharmacyId } = req.user;
  try {
    const [total, lowStock, categories, totalValue] = await Promise.all([
      query("SELECT COUNT(*) FROM medicines WHERE pharmacy_id=$1", [pharmacyId]),
      query("SELECT COUNT(*) FROM medicines WHERE pharmacy_id=$1 AND stock_qty <= low_stock_alert", [pharmacyId]),
      query("SELECT DISTINCT category FROM medicines WHERE pharmacy_id=$1 AND category IS NOT NULL ORDER BY category", [pharmacyId]),
      query("SELECT COALESCE(SUM(stock_qty * price_per_unit),0) as value FROM medicines WHERE pharmacy_id=$1", [pharmacyId]),
    ]);
    res.json({
      total: parseInt(total.rows[0].count),
      lowStock: parseInt(lowStock.rows[0].count),
      categories: categories.rows.map(r => r.category),
      totalValue: parseFloat(totalValue.rows[0].value),
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch summary" });
  }
});

// GET /api/medicines/doctors
router.get("/doctors", async (req, res) => {
  const { pharmacyId } = req.user;
  try {
    const result = await query("SELECT * FROM doctors WHERE pharmacy_id=$1 ORDER BY name", [pharmacyId]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch doctors" });
  }
});

// POST /api/medicines
router.post("/", async (req, res) => {
  const { pharmacyId } = req.user;
  const { name, category, manufacturer, unit, costPrice, pricePerUnit, stockQty, lowStockAlert, description } = req.body;
  if (!name) return res.status(400).json({ error: "Medicine name required" });
  try {
    const result = await query(
      `INSERT INTO medicines (pharmacy_id, name, category, manufacturer, unit, cost_price, price_per_unit, stock_qty, low_stock_alert, description)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [pharmacyId, name, category || null, manufacturer || null, unit || "tablet",
       costPrice || 0, pricePerUnit || 0, stockQty || 0, lowStockAlert || 10, description || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === "23505") return res.status(409).json({ error: "Medicine already exists" });
    res.status(500).json({ error: "Failed to add medicine" });
  }
});

// PUT /api/medicines/:id
router.put("/:id", async (req, res) => {
  const { pharmacyId } = req.user;
  const { name, category, manufacturer, unit, costPrice, pricePerUnit, stockQty, lowStockAlert, description } = req.body;
  try {
    const result = await query(
      `UPDATE medicines SET name=$1, category=$2, manufacturer=$3, unit=$4, cost_price=$5,
       price_per_unit=$6, stock_qty=$7, low_stock_alert=$8, description=$9, updated_at=NOW()
       WHERE id=$10 AND pharmacy_id=$11 RETURNING *`,
      [name, category, manufacturer, unit, costPrice || 0, pricePerUnit || 0,
       stockQty || 0, lowStockAlert || 10, description, req.params.id, pharmacyId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "Not found" });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Failed to update medicine" });
  }
});

// PATCH /api/medicines/:id/stock  ── Quick stock update
router.patch("/:id/stock", async (req, res) => {
  const { pharmacyId } = req.user;
  const { adjustment, type } = req.body; // type: add | set
  try {
    let sql;
    if (type === "set") {
      sql = "UPDATE medicines SET stock_qty=$1, updated_at=NOW() WHERE id=$2 AND pharmacy_id=$3 RETURNING *";
    } else {
      sql = "UPDATE medicines SET stock_qty=GREATEST(0, stock_qty+$1), updated_at=NOW() WHERE id=$2 AND pharmacy_id=$3 RETURNING *";
    }
    const result = await query(sql, [adjustment, req.params.id, pharmacyId]);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Failed to update stock" });
  }
});

// DELETE /api/medicines/:id
router.delete("/:id", async (req, res) => {
  const { pharmacyId } = req.user;
  try {
    await query("DELETE FROM medicines WHERE id=$1 AND pharmacy_id=$2", [req.params.id, pharmacyId]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete medicine" });
  }
});

module.exports = router;
