const https = require('https');

async function sendSms(phone, message) {
  const apiKey = process.env.SMS_API_KEY;
  const apiUrl = process.env.SMS_API_URL;

  if (!apiKey || !apiUrl) {
    console.log(`[SMS] Mock send to ${phone}: ${message}`);
    return { success: true, mock: true };
  }

  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({ to: phone, text: message, api_key: apiKey });
    const url = new URL(apiUrl);
    const options = {
      hostname: url.hostname,
      path: url.pathname,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => resolve({ success: true, response: data }));
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

module.exports = { sendSms };
