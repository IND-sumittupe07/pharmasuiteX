const { query } = require("../db/db");
const PLANS = require("../config/plans");

// ── Check if plan is expired ─────────────────────────────────────────────────
const checkPlanExpiry = async (req, res, next) => {
  try {
    const { pharmacyId } = req.user;
    const result = await query(
      "SELECT plan, plan_expires_at FROM pharmacies WHERE id=$1",
      [pharmacyId]
    );
    if (result.rows.length === 0) return res.status(401).json({ error: "Pharmacy not found" });

    const { plan, plan_expires_at } = result.rows[0];

    // Check if plan is expired
    if (plan_expires_at && new Date(plan_expires_at) < new Date()) {
      return res.status(403).json({
        error: "PLAN_EXPIRED",
        message: "Your plan has expired. Please renew to continue.",
        plan,
        expiredAt: plan_expires_at,
      });
    }
    next();
  } catch (err) {
    next();
  }
};

// ── Check usage limits ────────────────────────────────────────────────────────
const checkLimit = (resource) => async (req, res, next) => {
  try {
    const { pharmacyId } = req.user;
    const result = await query(
      "SELECT plan, plan_expires_at FROM pharmacies WHERE id=$1",
      [pharmacyId]
    );
    const { plan, plan_expires_at } = result.rows[0];

    // Check expiry first
    if (plan_expires_at && new Date(plan_expires_at) < new Date()) {
      return res.status(403).json({
        error: "PLAN_EXPIRED",
        message: "Your plan has expired. Please renew to continue.",
      });
    }

    const planConfig = PLANS[plan] || PLANS.trial;
    const limit = planConfig.limits[resource];
    if (!limit || limit === Infinity || limit === -1) return next();

    let count = 0;
    if (resource === "customers") {
      const r = await query("SELECT COUNT(*) FROM customers WHERE pharmacy_id=$1 AND is_active=true", [pharmacyId]);
      count = parseInt(r.rows[0].count);
    } else if (resource === "campaigns") {
      const r = await query("SELECT COUNT(*) FROM campaigns WHERE pharmacy_id=$1", [pharmacyId]);
      count = parseInt(r.rows[0].count);
    }

    if (count >= limit) {
      return res.status(403).json({
        error: "PLAN_LIMIT_REACHED",
        message: `You've reached the ${resource} limit for your ${plan} plan.`,
        current: count, limit, plan,
        upgradeRequired: true,
      });
    }
    next();
  } catch (err) {
    next();
  }
};

// ── Get full usage stats ──────────────────────────────────────────────────────
const getUsage = async (req, res) => {
  const { pharmacyId } = req.user;
  try {
    const pharma = await query(
      "SELECT plan, plan_expires_at FROM pharmacies WHERE id=$1",
      [pharmacyId]
    );
    const { plan, plan_expires_at } = pharma.rows[0];
    const planConfig = PLANS[plan] || PLANS.trial;

    // Check if expired
    const isExpired = plan_expires_at && new Date(plan_expires_at) < new Date();
    const daysLeft = plan_expires_at
      ? Math.max(0, Math.ceil((new Date(plan_expires_at) - new Date()) / (1000 * 60 * 60 * 24)))
      : null;

    const [customers, campaigns] = await Promise.all([
      query("SELECT COUNT(*) FROM customers WHERE pharmacy_id=$1 AND is_active=true", [pharmacyId]),
      query("SELECT COUNT(*) FROM campaigns WHERE pharmacy_id=$1", [pharmacyId]),
    ]);

    res.json({
      plan,
      planExpiresAt: plan_expires_at,
      isExpired,
      daysLeft,
      customers: {
        used: parseInt(customers.rows[0].count),
        limit: planConfig.limits.customers === Infinity ? -1 : planConfig.limits.customers,
      },
      campaigns: {
        used: parseInt(campaigns.rows[0].count),
        limit: planConfig.limits.campaigns === Infinity ? -1 : planConfig.limits.campaigns,
      },
      features: {
        exports: planConfig.limits.exports,
        analytics: planConfig.limits.analytics,
        autoReminders: planConfig.limits.autoReminders,
        multiStaff: planConfig.limits.multiStaff,
        gstInvoice: true,
        suppliers: true,
        expiryTracking: true,
      },
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to get usage" });
  }
};

module.exports = { checkLimit, checkPlanExpiry, getUsage };
