const { Router } = require('express');
const db = require('../db/connection');
const { authenticate, authorize } = require('../middleware/auth');
const { getAdvisory } = require('../services/advisory.service');

const router = Router();

router.patch('/profile', authenticate, (req, res) => {
  try {
    const { name, upazila, cropType, soilType } = req.body;
    const fields = [];
    const params = [];
    if (name) { fields.push('name = ?'); params.push(name); }
    if (upazila) { fields.push('upazila = ?'); params.push(upazila); }
    if (cropType) { fields.push('crop_type = ?'); params.push(cropType); }
    if (soilType) { fields.push('soil_type = ?'); params.push(soilType); }
    if (fields.length === 0) return res.status(400).json({ error: 'No fields to update' });
    params.push(req.user.id);
    db.prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`).run(...params);
    const user = db.prepare(`SELECT id, role, phone, name, upazila FROM users WHERE id = ?`).get(req.user.id);
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/me', authenticate, (req, res) => {
  try {
    const user = db.prepare(`SELECT id, role, phone, name, upazila FROM users WHERE id = ?`).get(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/dashboard', authenticate, authorize('farmer'), (req, res) => {
  try {
    const totalScans = db.prepare(`SELECT COUNT(*) AS count FROM scan_logs WHERE farmer_id = ?`).get(req.user.id);
    const totalComplaints = db.prepare(`SELECT COUNT(*) AS count FROM complaints WHERE farmer_id = ?`).get(req.user.id);
    const totalAdvisories = db.prepare(`SELECT COUNT(*) AS count FROM advisory_logs WHERE farmer_id = ?`).get(req.user.id);
    const pendingComplaints = db.prepare(`SELECT COUNT(*) AS count FROM complaints WHERE farmer_id = ? AND status IN ('filed','under_review','escalated')`).get(req.user.id);
    const recentScans = db.prepare(`SELECT s.*, b.product_name FROM scan_logs s JOIN batches b ON s.batch_id = b.id WHERE s.farmer_id = ? ORDER BY s.scanned_at DESC LIMIT 10`).all(req.user.id);
    const recentAdvisories = db.prepare(`SELECT al.*, a.crop_type, a.condition_rule, a.message_template FROM advisory_logs al JOIN advisories a ON al.advisory_id = a.id WHERE al.farmer_id = ? ORDER BY al.sent_at DESC LIMIT 5`).all(req.user.id);
    const user = db.prepare(`SELECT id, role, phone, name, upazila, crop_type, soil_type FROM users WHERE id = ?`).get(req.user.id);

    res.json({
      stats: {
        totalScans: totalScans.count,
        totalComplaints: totalComplaints.count,
        totalAdvisories: totalAdvisories.count,
        pendingComplaints: pendingComplaints.count,
      },
      profile: user,
      recentScans,
      recentAdvisories,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/advisory', authenticate, authorize('farmer'), async (req, res) => {
  try {
    const user = db.prepare(`SELECT * FROM users WHERE id = ?`).get(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (!user.crop_type) return res.status(400).json({ error: 'No crop type set. Update your profile first.' });

    const advisory = await getAdvisory(user.crop_type, user.soil_type, user.upazila);
    res.json(advisory);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
