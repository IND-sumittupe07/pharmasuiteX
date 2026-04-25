// ─── MedTrack Database Backup Script ─────────────────────────────────────────
// Run manually: node src/db/backup.js
// Or add to cron for automated backups

require("dotenv").config({ path: require("path").join(__dirname, "../../.env") });
const { exec } = require("child_process");
const path = require("path");
const fs = require("fs");

const backupDir = path.join(__dirname, "../../../backups");
if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });

const date = new Date().toISOString().split("T")[0];
const filename = `medtrack_backup_${date}.sql`;
const filepath = path.join(backupDir, filename);

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error("❌ DATABASE_URL not set in .env");
  process.exit(1);
}

console.log(`📦 Starting backup: ${filename}`);
exec(`pg_dump "${dbUrl}" > "${filepath}"`, (err) => {
  if (err) {
    console.error("❌ Backup failed:", err.message);
    process.exit(1);
  }
  const size = (fs.statSync(filepath).size / 1024).toFixed(1);
  console.log(`✅ Backup complete: ${filename} (${size} KB)`);
  console.log(`📁 Saved to: ${filepath}`);

  // Delete backups older than 30 days
  const files = fs.readdirSync(backupDir)
    .filter(f => f.startsWith("medtrack_backup_"))
    .sort();
  if (files.length > 30) {
    const toDelete = files.slice(0, files.length - 30);
    toDelete.forEach(f => {
      fs.unlinkSync(path.join(backupDir, f));
      console.log(`🗑 Deleted old backup: ${f}`);
    });
  }
});
