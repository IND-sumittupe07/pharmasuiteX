const express = require("express");
const { query } = require("../db/db");
const { authenticate, requireOwner } = require("../middleware/auth");
const { getUsage } = require("../middleware/planLimits");
const PLANS = require("../config/plans");

const router = express.Router();
router.use(authenticate);

// GET /api/plans
router.get("/", (req, res) => {
  const plans = Object.values(PLANS).map(p => ({
    id:p.id, name:p.name, price:p.price, priceLabel:p.priceLabel,
    duration:p.duration, badge:p.badge, color:p.color,
    features:p.features, limits:p.limits,
  }));
  res.json(plans);
});

// GET /api/plans/usage
router.get("/usage", getUsage);

// GET /api/plans/status — Check current plan + days left
router.get("/status", async (req, res) => {
  const { pharmacyId } = req.user;
  try {
    const result = await query(
      "SELECT plan, plan_expires_at FROM pharmacies WHERE id=$1", [pharmacyId]
    );
    const row = result.rows[0];
    const now = new Date();
    const expiresAt = row.plan_expires_at ? new Date(row.plan_expires_at) : null;
    const daysLeft = expiresAt ? Math.ceil((expiresAt - now)/(1000*60*60*24)) : 0;
    const isExpired = expiresAt ? expiresAt < now : true;
    res.json({ plan: row.plan, expiresAt, daysLeft, isExpired });
  } catch (err) {
    res.status(500).json({ error: "Failed to get plan status" });
  }
});

// POST /api/plans/create-order — Create Razorpay order
router.post("/create-order", requireOwner, async (req, res) => {
  const { planId } = req.body;
  const plan = PLANS[planId];
  if (!plan || !plan.price) return res.status(400).json({ error: "Invalid plan or free plan" });

  const keyId     = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret || keyId.trim() === "") {
    return res.status(400).json({ error: "Razorpay not configured. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to .env" });
  }

  try {
    const Razorpay = require("razorpay");
    const instance = new Razorpay({ key_id: keyId, key_secret: keySecret });
    const order = await instance.orders.create({
      amount: plan.price * 100,
      currency: "INR",
      receipt: `mt_${req.user.pharmacyId.slice(-8)}_${Date.now()}`,
      notes: { pharmacyId: req.user.pharmacyId, planId },
    });
    res.json({ orderId: order.id, amount: order.amount, currency: order.currency, keyId, planId, planName: plan.name });
  } catch (err) {
    console.error("Razorpay order error:", err);
    res.status(500).json({ error: "Failed to create payment order: " + err.message });
  }
});

// POST /api/plans/verify-payment — Verify + activate
router.post("/verify-payment", requireOwner, async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, planId } = req.body;
  const { pharmacyId } = req.user;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keySecret) return res.status(400).json({ error: "Razorpay not configured" });

  try {
    const crypto = require("crypto");
    const expected = crypto.createHmac("sha256", keySecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`).digest("hex");

    if (expected !== razorpay_signature) {
      return res.status(400).json({ error: "Payment verification failed" });
    }

    // Activate plan — 30 days from now
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    await query(
      "UPDATE pharmacies SET plan=$1, plan_expires_at=$2 WHERE id=$3",
      [planId, expiresAt, pharmacyId]
    );

    // Log payment
    await query(
      `INSERT INTO payment_logs (pharmacy_id, plan_id, amount, razorpay_order_id, razorpay_payment_id, status)
       VALUES ($1,$2,$3,$4,$5,'success') ON CONFLICT DO NOTHING`,
      [pharmacyId, planId, PLANS[planId]?.price || 0, razorpay_order_id, razorpay_payment_id]
    ).catch(() => {});

    res.json({
      success: true,
      message: `🎉 ${PLANS[planId]?.name} plan activated successfully!`,
      plan: planId,
      expiresAt,
      daysLeft: 30,
    });
  } catch (err) {
    console.error("Verify error:", err);
    res.status(500).json({ error: "Payment verification failed" });
  }
});

// POST /api/plans/upgrade — Direct upgrade (trial or testing)
router.post("/upgrade", requireOwner, async (req, res) => {
  const { pharmacyId } = req.user;
  const { planId } = req.body;
  if (!PLANS[planId]) return res.status(400).json({ error: "Invalid plan" });

  const days = planId === "trial" ? 15 : 30;
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + days);

  try {
    await query(
      "UPDATE pharmacies SET plan=$1, plan_expires_at=$2 WHERE id=$3",
      [planId, expiresAt, pharmacyId]
    );
    res.json({
      success: true,
      message: `${PLANS[planId].name} activated!`,
      plan: planId,
      expiresAt,
      daysLeft: days,
    });
  } catch (err) {
    res.status(500).json({ error: "Upgrade failed" });
  }
});

module.exports = router;
