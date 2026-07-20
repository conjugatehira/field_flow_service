const { Router } = require('express');
const db = require('../db/connection');
const { authenticate, authorize } = require('../middleware/auth');

const router = Router();

router.get('/users', authenticate, authorize('admin'), (req, res) => {
  try {
    const users = db.prepare(`SELECT id, role, phone, name, upazila, created_at FROM users ORDER BY created_at DESC`).all();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
