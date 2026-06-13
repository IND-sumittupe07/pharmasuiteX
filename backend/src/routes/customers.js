const express = require("express");
const router = express.Router();
const { query } = require("../db/db");

// Middleware: Verify JWT
const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "No token provided" });
  try {
    const jwt = require("jsonwebtoken");
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (err) {
    res.status(401).json({ error: "Invalid token" });
  }
};

// GET all customers for current pharmacy
router.get("/", authenticate, async (req, res) => {
  try {
    const result = await query(
      `SELECT c.id, c.full_name, c.mobile, c.age, c.gender, c.city, c.medical_condition, c.notes, c.customer_code,
              c.total_spend, c.created_at
       FROM customers c
       WHERE c.pharmacy_id = $1
       ORDER BY c.created_at DESC`,
      [req.user.pharmacyId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching customers:", err);
    res.status(500).json({ error: "Failed to fetch customers" });
  }
});

// GET single customer
router.get("/:id", authenticate, async (req, res) => {
  try {
    const result = await query(
      `SELECT c.* FROM customers c
       WHERE c.id = $1 AND c.pharmacy_id = $2`,
      [req.params.id, req.user.pharmacyId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Customer not found" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error fetching customer:", err);
    res.status(500).json({ error: "Failed to fetch customer" });
  }
});

// POST: Add new customer
router.post("/", authenticate, async (req, res) => {
  const { fullName, mobile, age, gender, city, medicalCondition, notes } = req.body;

  if (!fullName || !mobile) {
    return res.status(400).json({ error: "fullName and mobile required" });
  }

  try {
    const customerCode = `C${Date.now().toString().slice(-6)}`;
    
    const result = await query(
      `INSERT INTO customers (pharmacy_id, full_name, mobile, age, gender, city, medical_condition, notes, customer_code)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [req.user.pharmacyId, fullName, mobile, age || null, gender || "Male", city || null, medicalCondition || null, notes || "", customerCode]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({ error: "Mobile number already exists for this pharmacy" });
    }
    console.error("Error creating customer:", err);
    res.status(500).json({ error: "Failed to create customer" });
  }
});

// PUT: Update customer
router.put("/:id", authenticate, async (req, res) => {
  const { fullName, mobile, age, gender, city, medicalCondition, notes } = req.body;
  const customerId = req.params.id;

  // Verify customer belongs to this pharmacy
  try {
    const checkRes = await query(
      `SELECT id FROM customers WHERE id = $1 AND pharmacy_id = $2`,
      [customerId, req.user.pharmacyId]
    );
    
    if (checkRes.rows.length === 0) {
      return res.status(404).json({ error: "Customer not found" });
    }

    // Update customer
    const result = await query(
      `UPDATE customers 
       SET full_name = COALESCE($1, full_name),
           mobile = COALESCE($2, mobile),
           age = COALESCE($3, age),
           gender = COALESCE($4, gender),
           city = COALESCE($5, city),
           medical_condition = COALESCE($6, medical_condition),
           notes = COALESCE($7, notes),
           updated_at = NOW()
       WHERE id = $8 AND pharmacy_id = $9
       RETURNING *`,
      [fullName, mobile, age, gender, city, medicalCondition, notes, customerId, req.user.pharmacyId]
    );

    res.json(result.rows[0]);
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({ error: "Mobile number already in use" });
    }
    console.error("Error updating customer:", err);
    res.status(500).json({ error: "Failed to update customer" });
  }
});

// DELETE customer
router.delete("/:id", authenticate, async (req, res) => {
  try {
    const result = await query(
      `DELETE FROM customers WHERE id = $1 AND pharmacy_id = $2 RETURNING id`,
      [req.params.id, req.user.pharmacyId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Customer not found" });
    }

    res.json({ message: "Customer deleted" });
  } catch (err) {
    console.error("Error deleting customer:", err);
    res.status(500).json({ error: "Failed to delete customer" });
  }
});

module.exports = router;
