require("dotenv").config();
const express = require("express");
const cors    = require("cors");
const helmet  = require("helmet");
const rateLimit = require("express-rate-limit");
const cron    = require("node-cron");

const authRoutes     = require("./routes/auth");
const customerRoutes = require("./routes/customers");
const medicineRoutes = require("./routes/medicines");
const reminderRoutes = require("./routes/reminders");
const campaignRoutes = require("./routes/campaigns");
const analyticsRoutes = require("./routes/analytics");
const exportRoutes   = require("./routes/export");
const planRoutes     = require("./routes/plans");
const invoiceRoutes  = require("./routes/invoice");
const supplierRoutes = require("./routes/suppliers");
const expiryRoutes   = require("./routes/expiry");
const { sendDailyReminders } = require("./services/reminderService");

const app = express();

// ─── Trust Proxy (fixes rate-limit warning) ───────────────────
app.set("trust proxy", 1);

// ─── Security Headers ─────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
}));

// ─── CORS ─────────────────────────────────────────────────────
app.use(cors({
  origin: true,
  credentials: true,
}));

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// ─── Rate Limiting ────────────────────────────────────────────
// Global: 300 req / 15 min
app.use("/api/", rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Please slow down." },
}));

// Login: max 10 attempts / 15 min (brute force protection)
app.use("/api/auth/login", rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: "Too many login attempts. Try again in 15 minutes." },
  skipSuccessfulRequests: true,
}));

// Register: max 5 per hour
app.use("/api/auth/register", rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { error: "Too many registrations from this IP." },
}));

// ─── Request Logger (dev only) ────────────────────────────────
if (process.env.NODE_ENV !== "production") {
  app.use((req, res, next) => {
    const start = Date.now();
    res.on("finish", () => {
      const ms = Date.now() - start;
      const color = res.statusCode >= 400 ? "\x1b[31m" : "\x1b[32m";
      console.log(`${color}${req.method} ${req.path} ${res.statusCode} ${ms}ms\x1b[0m`);
    });
    next();
  });
}

// ─── Routes ───────────────────────────────────────────────────
app.use("/api/auth",      authRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/medicines", medicineRoutes);
app.use("/api/reminders", reminderRoutes);
app.use("/api/campaigns", campaignRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/export",    exportRoutes);
app.use("/api/plans",     planRoutes);
app.use("/api/invoice",   invoiceRoutes);
app.use("/api/suppliers", supplierRoutes);
app.use("/api/expiry",    expiryRoutes);

// ─── Health Check ─────────────────────────────────────────────
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
    uptime: Math.floor(process.uptime()) + "s",
  });
});

// ─── 404 Handler ──────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// ─── Global Error Handler ─────────────────────────────────────
app.use((err, req, res, next) => {
  console.error("🔴 Server Error:", err.message);
  if (process.env.NODE_ENV !== "production") console.error(err.stack);
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === "production"
      ? "Something went wrong. Please try again."
      : err.message,
  });
});

// ─── Cron: Daily Reminders 9AM IST ───────────────────────────
cron.schedule("30 3 * * *", async () => {
  console.log("⏰ Running daily refill reminder job...");
  try {
    await sendDailyReminders();
    console.log("✅ Daily reminders sent");
  } catch (err) {
    console.error("❌ Reminder job failed:", err.message);
  }
}, { timezone: "UTC" });

// ─── Cron: Subscription Renewal Reminders (7 days before) ────
cron.schedule("0 4 * * *", async () => {
  try {
    const { query } = require("./db/db");
    const expiring = await query(`
      SELECT p.id, p.name, p.plan, p.plan_expires_at,
             u.mobile, u.name as owner_name
      FROM pharmacies p
      JOIN users u ON u.pharmacy_id = p.id AND u.role = 'owner'
      WHERE p.plan != 'free'
        AND p.plan_expires_at IS NOT NULL
        AND p.plan_expires_at BETWEEN NOW() AND NOW() + INTERVAL '7 days'
    `);
    if (expiring.rows.length > 0) {
      console.log(`⏰ ${expiring.rows.length} subscriptions expiring in 7 days`);
      // TODO: send renewal reminders via SMS when Fast2SMS configured
    }
  } catch (err) {
    console.error("Renewal check failed:", err.message);
  }
}, { timezone: "UTC" });

// ─── Start Server ─────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`\n🚀 MedTrack API running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`📡 Health: http://localhost:${PORT}/api/health\n`);
});

module.exports = app;