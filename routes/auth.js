const { Router } = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const db = require('../db/connection');

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'fieldflow-dev-secret';

function uuid() { return crypto.randomUUID(); }

router.post('/register', async (req, res) => {
  try {
    const { role, phone, name, upazila, password, licenseNo, businessName } = req.body;
    if (!role || !phone || !name || !password) {
      return res.status(400).json({ error: 'role, phone, name, password required' });
    }
    const hash = await bcrypt.hash(password, 10);
    const id = uuid();

    const existing = db.prepare(`SELECT id FROM users WHERE phone = ?`).get(phone);
    if (existing) return res.status(409).json({ error: 'Phone already registered' });

    db.prepare(`INSERT INTO users (id, role, phone, name, upazila, password_hash) VALUES (?,?,?,?,?,?)`).run(id, role, phone, name, upazila || null, hash);

    if (role === 'dealer') {
      const dealerId = uuid();
      db.prepare(`INSERT INTO dealers (id, user_id, license_no, business_name) VALUES (?,?,?,?)`).run(dealerId, id, licenseNo || `LIC-${Date.now()}`, businessName || name);
    }

    const token = jwt.sign({ id, role, phone }, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ user: { id, role, phone, name, upazila }, token });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/login', (req, res) => {
  const form = `
<!DOCTYPE html><html><head><title>Login - FieldFlow</title><style>
body{font-family:sans-serif;background:#0f2a1d;color:#fff;display:flex;justify-content:center;align-items:center;height:100vh;margin:0}
.card{background:#1a3a2b;padding:40px;border-radius:16px;width:360px}
h1{color:#4caf50;text-align:center;margin-bottom:24px}
label{color:#a0c0b0;display:block;margin-bottom:4px;font-size:0.9em}
input{width:100%;padding:12px;margin-bottom:16px;border:1px solid #2a4a3a;border-radius:8px;background:#0f2a1d;color:#fff;box-sizing:border-box}
button{width:100%;padding:12px;background:#4caf50;border:none;border-radius:8px;color:#fff;font-size:1em;cursor:pointer}
button:hover{background:#388e3c}.error{color:#ef5350;margin-bottom:12px;text-align:center}
</style></head><body>
<div class="card"><h1>FieldFlow</h1>
<form method="POST" action="/auth/login">
<p id="err" class="error"></p>
<label>Phone</label><input name="phone" required>
<label>Password</label><input name="password" type="password" required>
<button type="submit">Login</button></form></div>
</body></html>`;
  res.send(form);
});

router.post('/login', async (req, res) => {
  const isForm = req.headers['content-type']?.includes('application/x-www-form-urlencoded');
  const errPage = (msg) => res.send(`<!DOCTYPE html><html><head><title>Login - FieldFlow</title><style>body{font-family:sans-serif;background:#0f2a1d;color:#fff;display:flex;justify-content:center;align-items:center;height:100vh}.card{background:#1a3a2b;padding:40px;border-radius:16px;width:360px}h1{color:#4caf50;text-align:center;margin-bottom:24px}.error{color:#ef5350;text-align:center;margin-bottom:12px}label{color:#a0c0b0;display:block;margin-bottom:4px}input{width:100%;padding:12px;margin-bottom:16px;border:1px solid #2a4a3a;border-radius:8px;background:#0f2a1d;color:#fff;box-sizing:border-box}button{width:100%;padding:12px;background:#4caf50;border:none;border-radius:8px;color:#fff;font-size:1em;cursor:pointer}</style></head><body><div class="card"><h1>FieldFlow</h1><div class="error">${msg}</div><form method="POST" action="/auth/login"><label>Phone</label><input name="phone" required><label>Password</label><input name="password" type="password" required><button type="submit">Login</button></form></div></body></html>`);
  try {
    const { phone, password } = req.body;
    if (!phone || !password) {
      if (isForm) return errPage('Phone and password required');
      return res.status(400).json({ error: 'phone and password required' });
    }
    const user = db.prepare(`SELECT * FROM users WHERE phone = ?`).get(phone);
    if (!user) {
      if (isForm) return errPage('Invalid phone or password');
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      if (isForm) return errPage('Invalid phone or password');
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = jwt.sign({ id: user.id, role: user.role, phone: user.phone }, JWT_SECRET, { expiresIn: '7d' });

    if (isForm) {
      const redirectMap = { admin: '/admin-portal', dealer: '/dashboard', farmer: '/farmer-portal', supplier: '/supplier-portal' };
      const redirect = redirectMap[user.role] || '/dashboard';
      res.send(`<!DOCTYPE html><html><body><script>localStorage.setItem('token','${token}');window.location.href='${redirect}';</script></body></html>`);
    } else {
      res.json({ user: { id: user.id, role: user.role, phone: user.phone, name: user.name, upazila: user.upazila }, token });
    }
  } catch (err) {
    if (isForm) return errPage('Server error, try again');
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
