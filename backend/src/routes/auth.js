const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { query } = require("../db/db");
const PLANS = require("../config/plans");

// Register endpoint
router.post("/register", async (req, res) => {
  const { pharmacyName, ownerName, mobile, email, password, city, state, selectedPlan } = req.body;
  
  // Validation
  if (!pharmacyName || !ownerName || !mobile || !password) {
    return res.status(400).json({ error: "pharmacyName, ownerName, mobile, password required" });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: "Password must be at least 8 characters" });
  }

  // Determine plan (default to 'free' for trial)
  const planId = selectedPlan && PLANS[selectedPlan] ? selectedPlan : "free";
  const plan = PLANS[planId] || PLANS["free"];

  // Set expiry: free = 15 days, paid = 30 days from now
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + (planId === "free" ? 15 : 30));

  try {
    // Insert pharmacy
    const pharmaRes = await query(
      `INSERT INTO pharmacies (name, owner_name, mobile, email, city, state, plan, plan_expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
      [pharmacyName, ownerName, mobile, email || null, city || null, state || null, planId, expiresAt]
    );
    const pharmacyId = pharmaRes.rows[0].id;

    // Hash password and insert user
    const hash = await bcrypt.hash(password, 12);
    const userRes = await query(
      `INSERT INTO users (pharmacy_id, name, mobile, email, password_hash, role)
       VALUES ($1, $2, $3, $4, $5, 'owner') RETURNING id, name, role`,
      [pharmacyId, ownerName, mobile, email || null, hash]
    );
    const user = userRes.rows[0];

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, pharmacyId, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    // Return success response
    res.status(201).json({
      token,
      user: { id: user.id, name: user.name, role: user.role, pharmacyId, plan: planId, pharmacyName },
      planSelected: planId,
      requiresPayment: planId !== "free" && (plan.price || 0) > 0,
      trialDays: 15,
      expiresAt,
    });
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({ error: "Mobile number already registered" });
    }
    console.error("Register error:", err);
    res.status(500).json({ error: "Registration failed" });
  }
});

// Login endpoint
router.post("/login", async (req, res) => {
  const { mobile, password } = req.body;
  if (!mobile || !password) {
    return res.status(400).json({ error: "mobile and password required" });
  }

  try {
    const userRes = await query(
      `SELECT u.id, u.name, u.role, u.password_hash, p.id as pharmacyId, p.name as pharmacyName, p.plan
       FROM users u
       JOIN pharmacies p ON u.pharmacy_id = p.id
       WHERE u.mobile = $1`,
      [mobile]
    );

    if (userRes.rows.length === 0) {
      return res.status(401).json({ error: "Invalid mobile or password" });
    }

    const user = userRes.rows[0];
    const validPassword = await bcrypt.compare(password, user.password_hash);

    if (!validPassword) {
      return res.status(401).json({ error: "Invalid mobile or password" });
    }

    const token = jwt.sign(
      { userId: user.id, pharmacyId: user.pharmacyid, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
        pharmacyId: user.pharmacyid,
        pharmacyName: user.pharmacyname,
        plan: user.plan,
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Login failed" });
  }
});

module.exports = router;
