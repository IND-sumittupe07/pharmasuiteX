const express = require("express");
const { query } = require("../db/db");
const { authenticate } = require("../middleware/auth");

const router = express.Router();
router.use(authenticate);

const generateInvoiceNumber = async (pharmacyId) => {
  const res = await query("SELECT COUNT(*) FROM purchases WHERE pharmacy_id=$1", [pharmacyId]);
  const count = parseInt(res.rows[0].count) + 1;
  const d = new Date();
  const yr = d.getFullYear().toString().slice(-2);
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  return `INV-${yr}${mo}-${String(count).padStart(4, "0")}`;
};

// POST /api/invoice/create
router.post("/create", async (req, res) => {
  const { pharmacyId } = req.user;
  const { customerId, items, paymentMode="cash", discountAmount=0, prescriptionNumber, notes, doctorId, isGstInvoice=true } = req.body;
  if (!customerId || !items || items.length === 0) {
    return res.status(400).json({ error: "customerId and items required" });
  }
  try {
    let subtotal = 0, totalGst = 0;
    const processedItems = items.map(item => {
      const itemTotal = (parseFloat(item.quantity)||0) * (parseFloat(item.unitPrice)||0);
      const gstPct = parseFloat(item.gstPercent)||0;
      const gstAmount = isGstInvoice ? (itemTotal * gstPct) / (100 + gstPct) : 0;
      subtotal += itemTotal - gstAmount;
      totalGst += gstAmount;
      return { ...item, itemTotal: parseFloat(itemTotal.toFixed(2)), gstAmount: parseFloat(gstAmount.toFixed(2)), cgst: parseFloat((gstAmount/2).toFixed(2)), sgst: parseFloat((gstAmount/2).toFixed(2)) };
    });
    const disc = parseFloat(discountAmount) || 0;
    const totalAmount = subtotal + totalGst - disc;
    const invoiceNumber = await generateInvoiceNumber(pharmacyId);

    const result = await query(
      `INSERT INTO purchases (pharmacy_id, customer_id, invoice_number, items, subtotal, gst_amount, cgst_amount, sgst_amount, total_amount, discount_amount, payment_mode, prescription_number, notes, doctor_id, is_gst_invoice, purchase_date)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,CURRENT_DATE) RETURNING *`,
      [pharmacyId, customerId, invoiceNumber, JSON.stringify(processedItems),
       parseFloat(subtotal.toFixed(2)), parseFloat(totalGst.toFixed(2)),
       parseFloat((totalGst/2).toFixed(2)), parseFloat((totalGst/2).toFixed(2)),
       parseFloat(totalAmount.toFixed(2)), disc, paymentMode,
       prescriptionNumber||null, notes||null, doctorId||null, isGstInvoice]
    );

    await query("UPDATE customers SET total_spend = total_spend + $1 WHERE id = $2", [totalAmount, customerId]);

    for (const item of processedItems) {
      if (item.medicineId) {
        await query("UPDATE medicines SET stock_qty = GREATEST(0, stock_qty - $1) WHERE id=$2 AND pharmacy_id=$3", [item.quantity, item.medicineId, pharmacyId]);
      }
    }

    res.status(201).json({
      success: true, invoice: result.rows[0], invoiceNumber,
      summary: { subtotal: parseFloat(subtotal.toFixed(2)), cgst: parseFloat((totalGst/2).toFixed(2)), sgst: parseFloat((totalGst/2).toFixed(2)), totalGst: parseFloat(totalGst.toFixed(2)), discount: disc, totalAmount: parseFloat(totalAmount.toFixed(2)) }
    });
  } catch (err) {
    console.error("Invoice create error:", err);
    res.status(500).json({ error: "Failed to create invoice" });
  }
});

// GET /api/invoice — List (MUST be before /:id)
router.get("/", async (req, res) => {
  const { pharmacyId } = req.user;
  const { search, from, to, paymentMode } = req.query;
  try {
    let sql = `SELECT p.id, p.invoice_number, p.total_amount, p.gst_amount, p.discount_amount, p.payment_mode, p.purchase_date, p.is_gst_invoice, c.full_name, c.mobile
               FROM purchases p JOIN customers c ON c.id = p.customer_id WHERE p.pharmacy_id=$1`;
    const params = [pharmacyId];
    let i = 2;
    if (search) { sql += ` AND (c.full_name ILIKE $${i} OR p.invoice_number ILIKE $${i})`; params.push(`%${search}%`); i++; }
    if (from)   { sql += ` AND p.purchase_date >= $${i}`; params.push(from); i++; }
    if (to)     { sql += ` AND p.purchase_date <= $${i}`; params.push(to); i++; }
    if (paymentMode) { sql += ` AND p.payment_mode = $${i}`; params.push(paymentMode); i++; }
    sql += " ORDER BY p.created_at DESC LIMIT 100";
    const result = await query(sql, params);
    res.json(result.rows);
  } catch (err) {
    console.error("Invoice list error:", err);
    res.status(500).json({ error: "Failed to fetch invoices" });
  }
});

// GET /api/invoice/:id/pdf
router.get("/:id/pdf", async (req, res) => {
  const { pharmacyId } = req.user;
  try {
    const result = await query(`
      SELECT p.*, c.full_name, c.mobile, c.address as customer_address, c.city as customer_city,
             d.name as doctor_name,
             ph.name as pharmacy_name, ph.address as pharmacy_address, ph.city as pharmacy_city,
             ph.gst_number as pharmacy_gst, ph.license_number as pharmacy_license,
             ph.mobile as pharmacy_mobile, ph.owner_name
      FROM purchases p
      JOIN customers c ON c.id = p.customer_id
      JOIN pharmacies ph ON ph.id = p.pharmacy_id
      LEFT JOIN doctors d ON d.id = p.doctor_id
      WHERE p.id=$1 AND p.pharmacy_id=$2
    `, [req.params.id, pharmacyId]);
    if (result.rows.length === 0) return res.status(404).json({ error: "Not found" });

    const inv = result.rows[0];
    const items = typeof inv.items === "string" ? JSON.parse(inv.items) : inv.items;
    const PDFDocument = require("pdfkit");
    const doc = new PDFDocument({ size: "A4", margin: 40 });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="Invoice-${inv.invoice_number}.pdf"`);
    doc.pipe(res);

    // Header
    doc.fontSize(20).font("Helvetica-Bold").fillColor("#1e293b").text(inv.pharmacy_name, 40, 40);
    doc.fontSize(9).font("Helvetica").fillColor("#666")
      .text(inv.pharmacy_address || "", 40, 65)
      .text(`${inv.pharmacy_city||""} | GST: ${inv.pharmacy_gst||"N/A"} | License: ${inv.pharmacy_license||"N/A"}`, 40, 78)
      .text(`Mobile: ${inv.pharmacy_mobile||""}`, 40, 91);

    doc.fontSize(14).font("Helvetica-Bold").fillColor("#2563eb")
      .text(inv.is_gst_invoice ? "TAX INVOICE" : "CASH MEMO", 350, 40, { align:"right", width:200 });
    doc.fontSize(9).font("Helvetica").fillColor("#666")
      .text(`Invoice: ${inv.invoice_number}`, 350, 60, { align:"right", width:200 })
      .text(`Date: ${new Date(inv.purchase_date).toLocaleDateString("en-IN")}`, 350, 73, { align:"right", width:200 })
      .text(`Payment: ${(inv.payment_mode||"cash").toUpperCase()}`, 350, 86, { align:"right", width:200 });

    doc.moveTo(40,110).lineTo(555,110).strokeColor("#2563eb").lineWidth(2).stroke();

    doc.fontSize(9).font("Helvetica-Bold").fillColor("#1e293b").text("BILL TO:", 40, 122);
    doc.fontSize(10).font("Helvetica-Bold").text(inv.full_name, 40, 135);
    doc.fontSize(9).font("Helvetica").fillColor("#666").text(`Mobile: ${inv.mobile}`, 40, 148);
    if (inv.doctor_name) doc.text(`Doctor: Dr. ${inv.doctor_name}`, 40, 161);

    // Table
    const tableTop = 185;
    doc.rect(40, tableTop, 515, 20).fill("#2563eb");
    doc.fontSize(8).font("Helvetica-Bold").fillColor("white")
      .text("#", 45, tableTop+6).text("Medicine", 65, tableTop+6).text("HSN", 270, tableTop+6)
      .text("Qty", 310, tableTop+6).text("Rate", 345, tableTop+6).text("GST%", 390, tableTop+6)
      .text("GST Amt", 428, tableTop+6).text("Total", 490, tableTop+6);

    let y = tableTop + 25;
    items.forEach((item, i) => {
      doc.rect(40, y-4, 515, 18).fill(i%2===0?"#f8fafc":"white");
      doc.fontSize(8).font("Helvetica").fillColor("#1e293b")
        .text(String(i+1), 45, y)
        .text(item.name||item.medicineName||"", 65, y, { width:200 })
        .text(item.hsnCode||"3004", 270, y)
        .text(String(item.quantity||1), 315, y)
        .text(`₹${parseFloat(item.unitPrice||0).toFixed(2)}`, 340, y)
        .text(`${item.gstPercent||0}%`, 393, y)
        .text(`₹${parseFloat(item.gstAmount||0).toFixed(2)}`, 428, y)
        .text(`₹${parseFloat(item.itemTotal||0).toFixed(2)}`, 485, y);
      y += 18;
    });

    y += 10;
    doc.moveTo(40,y).lineTo(555,y).strokeColor("#e2e8f0").lineWidth(1).stroke();
    y += 10;

    const subtotal = parseFloat(inv.subtotal||0);
    const cgst = parseFloat(inv.cgst_amount||0);
    const sgst = parseFloat(inv.sgst_amount||0);
    const disc = parseFloat(inv.discount_amount||0);

    [["Subtotal (excl. GST)", `₹${subtotal.toFixed(2)}`], ["CGST (6%)", `₹${cgst.toFixed(2)}`], ["SGST (6%)", `₹${sgst.toFixed(2)}`],
     ...(disc>0 ? [["Discount", `-₹${disc.toFixed(2)}`]] : [])
    ].forEach(([l,v]) => {
      doc.fontSize(9).font("Helvetica").fillColor("#64748b").text(l, 350, y).text(v, 490, y, { align:"right", width:60 });
      y += 15;
    });

    doc.moveTo(350,y).lineTo(555,y).strokeColor("#2563eb").lineWidth(1.5).stroke();
    y += 6;
    doc.fontSize(12).font("Helvetica-Bold").fillColor("#1e293b")
      .text("TOTAL", 350, y).text(`₹${parseFloat(inv.total_amount).toFixed(2)}`, 490, y, { align:"right", width:60 });

    doc.fontSize(8).font("Helvetica").fillColor("#94a3b8")
      .text("Thank you for your purchase! 💊", 40, 760, { align:"center", width:515 })
      .text("Computer generated invoice — no signature required.", 40, 773, { align:"center", width:515 });

    doc.end();
  } catch (err) {
    console.error("PDF error:", err);
    res.status(500).json({ error: "Failed to generate PDF" });
  }
});

// GET /api/invoice/:id — Single invoice
router.get("/:id", async (req, res) => {
  const { pharmacyId } = req.user;
  try {
    const result = await query(`
      SELECT p.*, c.full_name, c.mobile, d.name as doctor_name,
             ph.name as pharmacy_name, ph.gst_number as pharmacy_gst
      FROM purchases p
      JOIN customers c ON c.id = p.customer_id
      JOIN pharmacies ph ON ph.id = p.pharmacy_id
      LEFT JOIN doctors d ON d.id = p.doctor_id
      WHERE p.id=$1 AND p.pharmacy_id=$2
    `, [req.params.id, pharmacyId]);
    if (result.rows.length === 0) return res.status(404).json({ error: "Not found" });
    const inv = result.rows[0];
    inv.items = typeof inv.items === "string" ? JSON.parse(inv.items) : inv.items;
    res.json(inv);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch invoice" });
  }
});

module.exports = router;
