const { Router } = require('express');
const db = require('../db/connection');
const { authenticate, authorize } = require('../middleware/auth');

const router = Router();

router.get('/dashboard', authenticate, authorize('dealer', 'admin'), (req, res) => {
  try {
    const dealer = db.prepare(`SELECT id FROM dealers WHERE user_id = ?`).get(req.user.id);
    if (!dealer) return res.status(404).json({ error: 'Dealer not found' });

    const totalBatches = db.prepare(`SELECT COUNT(*) AS count FROM batches WHERE dealer_id = ?`).get(dealer.id);
    const flaggedBatches = db.prepare(`SELECT COUNT(*) AS count FROM batches WHERE dealer_id = ? AND status = 'flagged'`).get(dealer.id);
    const totalScans = db.prepare(`SELECT COUNT(*) AS count FROM scan_logs sl JOIN batches b ON sl.batch_id = b.id WHERE b.dealer_id = ?`).get(dealer.id);
    const pendingComplaints = db.prepare(`SELECT COUNT(*) AS count FROM complaints c JOIN batches b ON c.batch_id = b.id WHERE b.dealer_id = ? AND c.status IN ('filed','under_review')`).get(dealer.id);

    res.json({
      totalBatches: totalBatches.count,
      flaggedBatches: flaggedBatches.count,
      totalScans: totalScans.count,
      pendingComplaints: pendingComplaints.count,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
