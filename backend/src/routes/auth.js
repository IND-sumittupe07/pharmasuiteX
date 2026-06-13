const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { query } = require("../db/db");
const PLANS = require("../config/plans");

// Middleware: Verify JWT
const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "No token provided" });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (err) {
    res.status(401).json({ error: "Invalid token" });
  }
};

// Register endpoint
router.post("/register", async (req, res) => {
  const { pharmacyName, ownerName, mobile, email, password, city, state, selectedPlan } = req.body;
  
  if (!pharmacyName || !ownerName || !mobile || !password) {
    return res.status(400).json({ error: "pharmacyName, ownerName, mobile, password required" });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: "Password must be at least 8 characters" });
  }

  const planId = selectedPlan && PLANS[selectedPlan] ? selectedPlan : "free";
  const plan = PLANS[planId] || PLANS["free"];

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + (planId === "free" ? 15 : 30));

  try {
    const pharmaRes = await query(
      `INSERT INTO pharmacies (name, owner_name, mobile, email, city, state, plan, plan_expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
      [pharmacyName, ownerName, mobile, email || null, city || null, state || null, planId, expiresAt]
    );
    const pharmacyId = pharmaRes.rows[0].id;

    const hash = await bcrypt.hash(password, 12);
    const userRes = await query(
      `INSERT INTO users (pharmacy_id, name, mobile, email, password_hash, role)
       VALUES ($1, $2, $3, $4, $5, 'owner') RETURNING id, name, role`,
      [pharmacyId, ownerName, mobile, email || null, hash]
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

// Get current user & pharmacy (for Settings page)
router.get("/me", authenticate, async (req, res) => {
  try {
    const userRes = await query(
      `SELECT u.id, u.name, u.mobile, u.email, u.role,
              p.id as pharmacy_id, p.name as pharmacy_name, p.owner_name, p.city, p.state, p.address,
              p.license_number, p.gst_number, p.plan, p.plan_expires_at, p.fast2sms_key, p.interakt_key
       FROM users u
       JOIN pharmacies p ON u.pharmacy_id = p.id
       WHERE u.id = $1`,
      [req.user.userId]
    );

    if (userRes.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const user = userRes.rows[0];
    res.json({
      id: user.id,
      name: user.name,
      mobile: user.mobile,
      email: user.email,
      role: user.role,
      pharmacy_id: user.pharmacy_id,
      pharmacy_name: user.pharmacy_name,
      owner_name: user.owner_name,
      city: user.city,
      state: user.state,
      address: user.address,
      license_number: user.license_number,
      gst_number: user.gst_number,
      plan: user.plan,
      plan_expires_at: user.plan_expires_at,
      fast2sms_key: user.fast2sms_key || "",
      interakt_key: user.interakt_key || "",
    });
  } catch (err) {
    console.error("Get me error:", err);
    res.status(500).json({ error: "Failed to fetch user data" });
  }
});

// Update pharmacy info (FIXED - includes all fields)
router.put("/pharmacy", authenticate, async (req, res) => {
  const { name, ownerName, mobile, email, city, state, address, licenseNumber, gstNumber, fast2smsKey, interaktKey } = req.body;

  try {
    const result = await query(
      `UPDATE pharmacies 
       SET name = COALESCE($1, name),
           owner_name = COALESCE($2, owner_name),
           mobile = COALESCE($3, mobile),
           email = COALESCE($4, email),
           city = COALESCE($5, city),
           state = COALESCE($6, state),
           address = COALESCE($7, address),
           license_number = COALESCE($8, license_number),
           gst_number = COALESCE($9, gst_number),
           fast2sms_key = COALESCE($10, fast2sms_key),
           interakt_key = COALESCE($11, interakt_key),
           updated_at = NOW()
       WHERE id = $12
       RETURNING id, name, owner_name, mobile, email, city, state, address, license_number, gst_number, fast2sms_key, interakt_key`,
      [name, ownerName, mobile, email, city, state, address, licenseNumber, gstNumber, fast2smsKey, interaktKey, req.user.pharmacyId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Pharmacy not found" });
    }

    res.json({ message: "Pharmacy updated successfully", data: result.rows[0] });
  } catch (err) {
    console.error("Update pharmacy error:", err);
    res.status(500).json({ error: "Failed to update pharmacy" });
  }
});

// Change password (for Settings page)
router.post("/change-password", authenticate, async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword || newPassword.length < 8) {
    return res.status(400).json({ error: "Invalid password format" });
  }

  try {
    const userRes = await query(
      `SELECT password_hash FROM users WHERE id = $1`,
      [req.user.userId]
    );

    if (userRes.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const validPassword = await bcrypt.compare(currentPassword, userRes.rows[0].password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: "Current password is incorrect" });
    }

    const hash = await bcrypt.hash(newPassword, 12);
    await query(
      `UPDATE users SET password_hash = $1 WHERE id = $2`,
      [hash, req.user.userId]
    );

    res.json({ message: "Password changed successfully" });
  } catch (err) {
    console.error("Change password error:", err);
    res.status(500).json({ error: "Failed to change password" });
  }
});

module.exports = router;
