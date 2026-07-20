const { Router } = require('express');
const crypto = require('crypto');
const db = require('../db/connection');
const { authenticate } = require('../middleware/auth');
const { getAdvisory } = require('../services/advisory.service');
const { sendSms } = require('../services/sms.service');

const router = Router();
function uuid() { return crypto.randomUUID(); }

router.post('/generate', authenticate, async (req, res) => {
  try {
    const user = db.prepare(`SELECT * FROM users WHERE id = ?`).get(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const upazila = req.body.upazila || user.upazila;
    if (!user.crop_type) return res.status(400).json({ error: 'No crop type set. Update your profile first.' });

    const advisory = await getAdvisory(user.crop_type, user.soil_type, upazila);

    const advId = uuid();
    db.prepare(`INSERT INTO advisories (id, crop_type, soil_type, upazila, condition_rule, message_template) VALUES (?,?,?,?,?,?)`).run(
      advId, user.crop_type, user.soil_type || null, upazila, advisory.condition, advisory.message
    );
    db.prepare(`INSERT INTO advisory_logs (id, farmer_id, advisory_id, channel) VALUES (?,?,?,?)`).run(
      uuid(), req.user.id, advId, req.body.channel || 'app'
    );

    if (req.body.channel === 'sms' && user.phone) {
      await sendSms(user.phone, advisory.message);
    }

    res.json(advisory);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/history', authenticate, (req, res) => {
  try {
    const rows = db.prepare(
      `SELECT al.*, a.crop_type, a.condition_rule, a.message_template FROM advisory_logs al JOIN advisories a ON al.advisory_id = a.id WHERE al.farmer_id = ? ORDER BY al.sent_at DESC`
    ).all(req.user.id);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
