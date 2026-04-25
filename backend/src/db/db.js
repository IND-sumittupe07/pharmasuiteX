const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production"
    ? { rejectUnauthorized: false }
    : false,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on("connect", () => {
  if (process.env.NODE_ENV !== "production") {
    console.log("📦 DB connected");
  }
});

pool.on("error", (err) => {
  console.error("❌ DB pool error:", err);
});

const query = (text, params) => pool.query(text, params);

module.exports = { pool, query };
