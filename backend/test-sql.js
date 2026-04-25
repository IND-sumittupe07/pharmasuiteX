require("dotenv").config({ path: __dirname + "/.env" });
const {pool} = require('./src/db/db');
const sql = `
  SELECT mb.*,
         (mb.expiry_date - CURRENT_DATE) as days_to_expiry
  FROM medicine_batches mb
  WHERE mb.pharmacy_id='389bfc02-e010-47e3-94a4-01845b41a497' AND mb.quantity > 0
  ORDER BY mb.expiry_date ASC
`;
pool.query(sql).then(r => {
  console.log('Success! Rows:', r.rows.length);
  console.log(r.rows);
}).catch(e => {
  console.log('SQL Error:', e.message);
  console.log(e.stack);
}).finally(() => pool.end());

