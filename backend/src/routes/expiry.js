const express = require("express");
const { query } = require("../db/db");
const { authenticate } = require("../middleware/auth");

const router = express.Router();
router.use(authenticate);

router.get("/", async (req, res) => {
  const { pharmacyId } = req.user;
  const { days = 365, filter = "all" } = req.query;
  try {
    // Fetch batches WITHOUT joining suppliers (so it works even if suppliers table is missing)
    let sql = `
      SELECT mb.*,
         (mb.expiry_date - CURRENT_DATE) as days_to_expiry
      FROM medicine_batches mb
      WHERE mb.pharmacy_id=$1 AND mb.quantity > 0
    `;
    const params = [pharmacyId];
    if (filter === "expired") {
      sql += " AND mb.expiry_date < CURRENT_DATE";
    } else if (filter === "expiring") {
      sql += ` AND mb.expiry_date >= CURRENT_DATE AND mb.expiry_date <= CURRENT_DATE + ($2 * INTERVAL '1 day')`;
      params.push(days);
    }
    sql += " ORDER BY mb.expiry_date ASC";
    const result = await query(sql, params);
    let rows = result.rows;

    // Try to enrich with supplier names (separate query — graceful if suppliers table missing)
    try {
      const supplierIds = [...new Set(rows.filter(r => r.supplier_id).map(r => r.supplier_id))];
      if (supplierIds.length > 0) {
        const suppResult = await query(
          `SELECT id, name FROM suppliers WHERE id = ANY($1)`,
          [supplierIds]
        );
        const suppMap = Object.fromEntries(suppResult.rows.map(s => [s.id, s.name]));
        rows = rows.map(r => ({ ...r, supplier_name: suppMap[r.supplier_id] || null }));
      }
    } catch (suppErr) {
      // suppliers table may not exist — rows already have supplier_name = null
    }

    res.json(rows);
  } catch (err) {
    console.error("Expiry error:", err);
    res.status(500).json({ error: "Failed to fetch expiry data" });
  }
});

router.get("/summary", async (req, res) => {
  const { pharmacyId } = req.user;
  try {
    const [expired, exp30, exp90, totalBatches] = await Promise.all([
      query("SELECT COUNT(*) FROM medicine_batches WHERE pharmacy_id=$1 AND expiry_date < CURRENT_DATE AND quantity > 0", [pharmacyId]),
      query("SELECT COUNT(*) FROM medicine_batches WHERE pharmacy_id=$1 AND expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days' AND quantity > 0", [pharmacyId]),
      query("SELECT COUNT(*) FROM medicine_batches WHERE pharmacy_id=$1 AND expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '90 days' AND quantity > 0", [pharmacyId]),
      query("SELECT COUNT(*) FROM medicine_batches WHERE pharmacy_id=$1 AND quantity > 0", [pharmacyId]),
    ]);
    res.json({
      expired: parseInt(expired.rows[0].count),
      expiring30: parseInt(exp30.rows[0].count),
      expiring90: parseInt(exp90.rows[0].count),
      totalBatches: parseInt(totalBatches.rows[0].count),
    });
  } catch (err) {
    res.status(500).json({ error: "Failed" });
  }
});

router.post("/batch", async (req, res) => {
  const { pharmacyId } = req.user;
  const { medicineId, medicineName, batchNumber, expiryDate, quantity, purchasePrice, sellingPrice, supplierId } = req.body;
  if (!medicineName || !batchNumber || !expiryDate || !quantity) {
    return res.status(400).json({ error: "medicineName, batchNumber, expiryDate, quantity required" });
  }
  try {
    const result = await query(
      `INSERT INTO medicine_batches (pharmacy_id, medicine_id, medicine_name, batch_number, expiry_date, quantity, purchase_price, selling_price, supplier_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [pharmacyId, medicineId||null, medicineName, batchNumber, expiryDate,
       parseInt(quantity), parseFloat(purchasePrice)||0, parseFloat(sellingPrice)||0, supplierId||null]
    );
    if (medicineId) {
      await query("UPDATE medicines SET stock_qty = stock_qty + $1 WHERE id=$2 AND pharmacy_id=$3",
        [parseInt(quantity), medicineId, pharmacyId]);
    }
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Add batch error:", err);
    res.status(500).json({ error: "Failed to add batch" });
  }
});

module.exports = router;