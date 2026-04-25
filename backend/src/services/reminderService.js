const { query } = require("../db/db");
const { sendSMS } = require("./messagingService");

const sendDailyReminders = async () => {
  const pharmacies = await query(
    "SELECT id, name, fast2sms_key FROM pharmacies WHERE is_active=true AND plan IN ('premium','basic')"
  );

  let totalSent = 0, totalFailed = 0;

  for (const pharmacy of pharmacies.rows) {
    try {
      const dueCustomers = await query(`
        SELECT DISTINCT ON (c.id)
          c.id as customer_id, c.full_name, c.mobile,
          cm.medicine_name,
          EXTRACT(DAY FROM (cm.start_date + (cm.duration_days - 5) * INTERVAL '1 day') - CURRENT_DATE) as days_left
        FROM customer_medicines cm
        JOIN customers c ON c.id = cm.customer_id
        WHERE cm.pharmacy_id=$1
          AND cm.is_active=true
          AND c.is_active=true
          AND (cm.start_date + (cm.duration_days - 5) * INTERVAL '1 day') = CURRENT_DATE + INTERVAL '5 days'
        ORDER BY c.id, cm.start_date ASC
      `, [pharmacy.id]);

      for (const row of dueCustomers.rows) {
        const message = `Hello ${row.full_name} ji, your medicine (${row.medicine_name}) will finish in 5 days. Please visit ${pharmacy.name} for refill. Stay healthy! 💊`;
        try {
          const result = await sendSMS(row.mobile, message, pharmacy.fast2sms_key);
          await query(
            "INSERT INTO reminder_logs (pharmacy_id, customer_id, channel, message, status) VALUES ($1,$2,'sms',$3,$4)",
            [pharmacy.id, row.customer_id, message, result.status === "sent" ? "sent" : "failed"]
          );
          if (result.status === "sent") totalSent++;
          else totalFailed++;
        } catch (err) {
          totalFailed++;
          console.error(`Reminder failed for ${row.mobile}:`, err.message);
        }
      }
    } catch (err) {
      console.error(`Pharmacy ${pharmacy.id} reminder failed:`, err.message);
    }
  }

  return { totalSent, totalFailed };
};

module.exports = { sendDailyReminders };
