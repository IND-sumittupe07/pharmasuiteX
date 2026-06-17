const express = require("express");
const { query } = require("../db/db");
const { authenticate } = require("../middleware/auth");
const router = express.Router();
router.use(authenticate);

// ... keep your existing routes (GET /suppliers, POST /purchase-orders, etc.)

// Add this status toggle route at the very end of the file
router.put("/purchase-orders/:id/status", async (req, res) => {
  const { pharmacyId } = req.user;
  const { status } = req.body;
  const { id } = req.params;

  try {
    const result = await query(
      "UPDATE purchase_orders SET payment_status = $1 WHERE id = $2 AND pharmacy_id = $3 RETURNING *",
      [status, id, pharmacyId]
    );

    if (result.rowCount === 0) return res.status(404).json({ error: "Order not found" });
    res.json({ success: true, order: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: "Failed to update status" });
  }
});

module.exports = router;
