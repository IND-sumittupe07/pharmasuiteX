const axios = require('axios');
async function test() {
  try {
    const login = await axios.post('http://localhost:5000/api/auth/login', { mobile: '9876543210', password: 'demo1234' });
    const token = login.data.token;
    const res = await axios.get('http://localhost:5000/api/expiry?filter=all&days=365', { headers: { Authorization: 'Bearer ' + token } });
    console.log('Success:', res.data.length, 'batches');
  } catch(e) {
    console.log('Error:', e.response?.status, JSON.stringify(e.response?.data || e.message, null, 2));
  }
}
test();

