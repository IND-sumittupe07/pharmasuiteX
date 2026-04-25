const express = require("express");
const bcrypt  = require("bcryptjs");
const jwt     = require("jsonwebtoken");
const { query } = require("../db/db");
const { authenticate } = require("../middleware/auth");
const PLANS = require("../config/plans");

const router = express.Router();

// POST /api/auth/register — Step 1: create account
router.post("/register", async (req, res) => {
  const { pharmacyName, ownerName, mobile, email, password, city, state, selectedPlan } = req.body;
  if (!pharmacyName || !ownerName || !mobile || !password)
    return res.status(400).json({ error: "pharmacyName, ownerName, mobile, password required" });
  if (password.length < 8)
    return res.status(400).json({ error: "Password must be at least 8 characters" });

  const planId = selectedPlan && PLANS[selectedPlan] ? selectedPlan : "trial";
  const plan   = PLANS[planId] || PLANS["trial"];

  // Set expiry: trial = 15 days, paid = 30 days from now
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + (planId === "trial" || planId === "free" ? 15 : 30));

  try {
    const pharmaRes = await query(
      `INSERT INTO pharmacies (name, owner_name, mobile, email, city, state, plan, plan_expires_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
      [pharmacyName, ownerName, mobile, email||null, city||null, state||null, planId, expiresAt]
    );
    const pharmacyId = pharmaRes.rows[0].id;

    const hash = await bcrypt.hash(password, 12);
    const userRes = await query(
      `INSERT INTO users (pharmacy_id, name, mobile, email, password_hash, role)
       VALUES ($1,$2,$3,$4,$5,'owner') RETURNING id, name, role`,
      [pharmacyId, ownerName, mobile, email||null, hash]
    );
    const user = userRes.rows[0];

    const token = jwt.sign(
      { userId: user.id, pharmacyId, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(201).json({
      token,
      user: { id: user.id, name: user.name, role: user.role, pharmacyId, plan: planId, pharmacyName },
      planSelected: planId,
      requiresPayment: planId !== "trial" && planId !== "free" && (plan.price || 0) > 0,
      trialDays: 15,
      expiresAt,
    });
  } catch (err) {
    if (err.code === "23505") return res.status(409).json({ error: "Mobile number already registered" });
    console.error("Register error:", err);
    res.status(500).json({ error: "Registration failed" });
  }
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  const { mobile, password } = req.body;
  if (!mobile || !password) return res.status(400).json({ error: "mobile and password required" });
  try {
    const result = await query(
      `SELECT u.id, u.name, u.password_hash, u.role, u.pharmacy_id, u.is_active,
              p.name as pharmacy_name, p.plan, p.plan_expires_at, p.is_active as pharmacy_active
       FROM users u JOIN pharmacies p ON p.id = u.pharmacy_id
       WHERE u.mobile=$1 AND p.is_active=true`,
      [mobile]
    );
    if (result.rows.length === 0) return res.status(401).json({ error: "Invalid mobile or password" });
    const user = result.rows[0];
    if (!user.is_active) return res.status(401).json({ error: "Account deactivated" });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: "Invalid mobile or password" });

    await query("UPDATE users SET last_login=NOW() WHERE id=$1", [user.id]);

    // Check plan expiry
    const now = new Date();
    const expiresAt = user.plan_expires_at ? new Date(user.plan_expires_at) : null;
    const isExpired = expiresAt && expiresAt < now;
    const daysLeft  = expiresAt ? Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24)) : 0;

    const token = jwt.sign(
      { userId: user.id, pharmacyId: user.pharmacy_id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
        pharmacyId: user.pharmacy_id,
        pharmacyName: user.pharmacy_name,
        plan: user.plan,
        planExpiresAt: user.plan_expires_at,
        isExpired,
        daysLeft,
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Login failed" });
  }
});

// GET /api/auth/me
router.get("/me", authenticate, async (req, res) => {
  try {
    const result = await query(
      `SELECT u.id, u.name, u.mobile, u.email, u.role,
              p.id as pharmacy_id, p.name as pharmacy_name, p.city, p.state,
              p.address, p.plan, p.plan_expires_at, p.license_number, p.gst_number
       FROM users u JOIN pharmacies p ON p.id = u.pharmacy_id
       WHERE u.id=$1`,
      [req.user.userId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "User not found" });
    const row = result.rows[0];
    const now = new Date();
    const expiresAt = row.plan_expires_at ? new Date(row.plan_expires_at) : null;
    row.isExpired = expiresAt ? expiresAt < now : false;
    row.daysLeft  = expiresAt ? Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24)) : 0;
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch user" });
  }
});

// POST /api/auth/change-password
router.post("/change-password", authenticate, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) return res.status(400).json({ error: "Both passwords required" });
  if (newPassword.length < 8) return res.status(400).json({ error: "Min 8 characters" });
  try {
    const result = await query("SELECT password_hash FROM users WHERE id=$1", [req.user.userId]);
    const valid = await bcrypt.compare(currentPassword, result.rows[0].password_hash);
    if (!valid) return res.status(401).json({ error: "Current password incorrect" });
    const hash = await bcrypt.hash(newPassword, 12);
    await query("UPDATE users SET password_hash=$1 WHERE id=$2", [hash, req.user.userId]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to change password" });
  }
});

// PUT /api/auth/pharmacy — Update profile + API keys
router.put("/pharmacy", authenticate, async (req, res) => {
  const { pharmacyId } = req.user;
  const { name, ownerName, city, state, email, licenseNumber, gstNumber, address, fast2smsKey, interaktKey } = req.body;
  if (!name || !ownerName) return res.status(400).json({ error: "Name and owner name required" });
  try {
    await query(
      `UPDATE pharmacies SET name=$1, owner_name=$2, city=$3, state=$4, email=$5,
       license_number=$6, gst_number=$7, address=$8,
       fast2sms_key=COALESCE(NULLIF($9,''), fast2sms_key),
       interakt_key=COALESCE(NULLIF($10,''), interakt_key),
       updated_at=NOW() WHERE id=$11`,
      [name, ownerName, city||null, state||null, email||null,
       licenseNumber||null, gstNumber||null, address||null,
       fast2smsKey||null, interaktKey||null, pharmacyId]
    );
    await query("UPDATE users SET name=$1 WHERE id=$2", [ownerName, req.user.userId]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to update profile" });
  }
});

// POST /api/auth/check-expiry — Check plan status
router.get("/plan-status", authenticate, async (req, res) => {
  const { pharmacyId } = req.user;
  try {
    const result = await query(
      "SELECT plan, plan_expires_at FROM pharmacies WHERE id=$1",
      [pharmacyId]
    );
    const row = result.rows[0];
    const now = new Date();
    const expiresAt = row.plan_expires_at ? new Date(row.plan_expires_at) : null;
    const isExpired = expiresAt ? expiresAt < now : false;
    const daysLeft  = expiresAt ? Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24)) : 0;
    res.json({ plan: row.plan, expiresAt, isExpired, daysLeft });
  } catch (err) {
    res.status(500).json({ error: "Failed" });
  }
});

module.exports = router;