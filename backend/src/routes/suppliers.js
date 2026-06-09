const express = require("express");
const { query } = require("../db/db");
const { authenticate } = require("../middleware/auth");

const router = express.Router();
router.use(authenticate);

// GET /api/suppliers
router.get("/", async (req, res) => {
  const { pharmacyId } = req.user;
  try {
    const result = await query(`
      SELECT s.*,
             COUNT(po.id) as total_orders,
             COALESCE(SUM(po.total_amount),0) as total_purchased
      FROM suppliers s
      LEFT JOIN purchase_orders po ON po.supplier_id = s.id
      WHERE s.pharmacy_id=$1 AND s.is_active=true
      GROUP BY s.id ORDER BY s.name
    `, [pharmacyId]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch suppliers" });
  }
});

// POST /api/suppliers
router.post("/", async (req, res) => {
  const { pharmacyId } = req.user;
  const { name, contactPerson, mobile, email, gstNumber, drugLicense, address, city, creditDays } = req.body;
  if (!name) return res.status(400).json({ error: "Supplier name required" });
  try {
    const result = await query(
      `INSERT INTO suppliers (pharmacy_id,name,contact_person,mobile,email,gst_number,drug_license,address,city,credit_days)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [pharmacyId,name,contactPerson||null,mobile||null,email||null,gstNumber||null,drugLicense||null,address||null,city||null,creditDays||30]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Failed to add supplier" });
  }
});

// PUT /api/suppliers/:id
router.put("/:id", async (req, res) => {
  const { pharmacyId } = req.user;
  const { name, contactPerson, mobile, email, gstNumber, drugLicense, address, city, creditDays } = req.body;
  try {
    const result = await query(
      `UPDATE suppliers SET name=$1,contact_person=$2,mobile=$3,email=$4,gst_number=$5,
       drug_license=$6,address=$7,city=$8,credit_days=$9 WHERE id=$10 AND pharmacy_id=$11 RETURNING *`,
      [name,contactPerson,mobile,email,gstNumber,drugLicense,address,city,creditDays||30,req.params.id,pharmacyId]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Failed to update supplier" });
  }
});

// DELETE /api/suppliers/:id
router.delete("/:id", async (req, res) => {
  const { pharmacyId } = req.user;
  try {
    await query("UPDATE suppliers SET is_active=false WHERE id=$1 AND pharmacy_id=$2", [req.params.id, pharmacyId]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete" });
  }
});

// GET /api/suppliers/purchase-orders
router.get("/purchase-orders", async (req, res) => {
  const { pharmacyId } = req.user;
  try {
    const result = await query(`
      SELECT po.*, s.name as supplier_name, s.mobile as supplier_mobile
      FROM purchase_orders po
      LEFT JOIN suppliers s ON s.id = po.supplier_id
      WHERE po.pharmacy_id=$1 ORDER BY po.created_at DESC LIMIT 50
    `, [pharmacyId]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch purchase orders" });
  }
});

// POST /api/suppliers/purchase-orders
router.post("/purchase-orders", async (req, res) => {
  const { pharmacyId, userId } = req.user;
  const { supplierId, invoiceNumber, invoiceDate, items, discountAmount, notes } = req.body;
  if (!items || items.length === 0) return res.status(400).json({ error: "Items required" });

  try {
    // Calculate totals
    let subtotal = 0, gstTotal = 0;
    const processedItems = items.map(item => {
      const itemTotal = item.quantity * item.purchasePrice;
      const gstAmt = (itemTotal * (item.gstPercent || 12)) / 100;
      subtotal += itemTotal;
      gstTotal += gstAmt;
      return { ...item, itemTotal: parseFloat(itemTotal.toFixed(2)), gstAmount: parseFloat(gstAmt.toFixed(2)) };
    });
    const totalAmount = subtotal + gstTotal - (discountAmount || 0);

    // Generate PO number
    const countRes = await query("SELECT COUNT(*) FROM purchase_orders WHERE pharmacy_id=$1", [pharmacyId]);
    const poNumber = `PO-${new Date().getFullYear()}-${String(parseInt(countRes.rows[0].count)+1).padStart(4,"0")}`;

    const result = await query(
      `INSERT INTO purchase_orders (pharmacy_id,supplier_id,po_number,invoice_number,invoice_date,items,subtotal,gst_amount,total_amount,discount_amount,notes,created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [pharmacyId,supplierId||null,poNumber,invoiceNumber||null,invoiceDate||new Date(),
       JSON.stringify(processedItems),subtotal,gstTotal,totalAmount,discountAmount||0,notes||null,userId]
    );

    // Update stock for each item
    for (const item of processedItems) {
      if (item.medicineId) {
        await query(
          "UPDATE medicines SET stock_qty = stock_qty + $1 WHERE id=$2 AND pharmacy_id=$3",
          [item.quantity, item.medicineId, pharmacyId]
        );
        // Add batch record
        if (item.batchNumber && item.expiryDate) {
          await query(
            `INSERT INTO medicine_batches (pharmacy_id,medicine_id,medicine_name,batch_number,expiry_date,quantity,purchase_price,selling_price,supplier_id,purchase_order_id)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
            [pharmacyId,item.medicineId,item.name,item.batchNumber,item.expiryDate,
             item.quantity,item.purchasePrice,item.sellingPrice||0,supplierId||null,result.rows[0].id]
          );
        }
      }
    }

    res.status(201).json({ success: true, purchaseOrder: result.rows[0], poNumber });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create purchase order" });
  }
});

module.exports = router;
