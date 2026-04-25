require("dotenv").config({ path: require("path").join(__dirname, "../../.env") });
const { pool } = require("./db");

const removeDemo = async () => {
  const client = await pool.connect();
  try {
    console.log("🧹 Removing demo data...");
    await client.query("BEGIN");

    // Nullify FK references first
    await client.query(`UPDATE purchase_orders SET created_by = NULL WHERE created_by IN (SELECT id FROM users WHERE mobile IN ('9876543210', '9800000001'));`);
    await client.query(`UPDATE campaigns SET created_by = NULL WHERE created_by IN (SELECT id FROM users WHERE mobile IN ('9876543210', '9800000001'));`);

    // Delete demo users (owner + staff)
    const usersRes = await client.query(`
      DELETE FROM users 
      WHERE mobile IN ('9876543210', '9800000001') 
      RETURNING id, name, mobile, role;
    `);
    console.log(`✅ Deleted ${usersRes.rowCount} demo users:`);
    usersRes.rows.forEach(u => console.log(`   - ${u.name} (${u.mobile}) [${u.role}]`));

    // Delete demo pharmacy and all related data (cascades via FK constraints)
    const pharmacyRes = await client.query(`
      DELETE FROM pharmacies 
      WHERE mobile = '9876543210' 
      RETURNING id, name;
    `);
    if (pharmacyRes.rowCount > 0) {
      console.log(`✅ Deleted demo pharmacy: ${pharmacyRes.rows[0].name}`);
      console.log("   (All customers, medicines, purchases, campaigns also deleted via CASCADE)");
    } else {
      console.log("⚠️  No demo pharmacy found with mobile 9876543210");
    }

    await client.query("COMMIT");
    console.log("\n🎉 Demo data removed successfully!");
    console.log("──────────────────────────────────────");
    console.log("🔑 Create a new account via Register page");
    console.log("──────────────────────────────────────\n");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Failed to remove demo data:", err.message);
    process.exit(1);
  } finally {
    client.release();
    pool.end();
  }
};

removeDemo();

