const { Router } = require('express');
const crypto = require('crypto');
const db = require('../db/connection');
const { authenticate } = require('../middleware/auth');

const router = Router();
function uuid() { return crypto.randomUUID(); }

router.get('/', authenticate, (req, res) => {
  try {
    const rows = db.prepare(`SELECT * FROM suppliers ORDER BY name`).all();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', authenticate, (req, res) => {
  try {
    const { name, contact, address } = req.body;
    if (!name) return res.status(400).json({ error: 'name required' });
    const id = uuid();
    db.prepare(`INSERT INTO suppliers (id, name, contact, address) VALUES (?,?,?,?)`).run(id, name, contact || null, address || null);
    const supplier = db.prepare(`SELECT * FROM suppliers WHERE id = ?`).get(id);
    res.status(201).json(supplier);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
