const { Router } = require('express');
const crypto = require('crypto');
const db = require('../db/connection');
const { authenticate } = require('../middleware/auth');
const { sendSms } = require('../services/sms.service');
const { appendEvent } = require('../services/trace.service');
const { rateLimit } = require('../middleware/rate-limit');

const router = Router();
function uuid() { return crypto.randomUUID(); }

function logScan(batchId, farmerId, farmerPhone, location, result) {
  db.prepare(`INSERT INTO scan_logs (id, batch_id, farmer_id, phone, location, result) VALUES (?,?,?,?,?,?)`).run(
    uuid(), batchId || null, farmerId || null, farmerPhone || null, location || null, result
  );
}

router.post('/', rateLimit(10, 60000), async (req, res) => {
  try {
    const { qrCode, farmerPhone, farmerId, location } = req.body;
    if (!qrCode) return res.status(400).json({ error: 'qrCode required' });

    const batch = db.prepare(`SELECT * FROM batches WHERE qr_code = ?`).get(qrCode);
    if (!batch) {
      logScan(null, farmerId, farmerPhone, location, 'counterfeit');
      if (farmerPhone) await sendSms(farmerPhone, 'Alert: This product code is unknown. It may be counterfeit.');
      return res.json({ authentic: false, reason: 'unknown_code', message: 'Code not found in system. Likely counterfeit.' });
    }

    if (new Date(batch.expiry_date) < new Date()) {
      logScan(batch.id, farmerId, farmerPhone, location, 'authentic');
      appendEvent(batch.id, 'scanned', farmerId, 'farmer', { phone: farmerPhone, result: 'expired' });
      if (farmerPhone) await sendSms(farmerPhone, `This ${batch.product_name} batch is EXPIRED (${batch.expiry_date}). Dispose properly.`);
      return res.json({ authentic: true, expired: true, product: batch.product_name, mfgDate: batch.mfg_date, expiryDate: batch.expiry_date, message: 'Product is expired.' });
    }

    if (batch.status === 'recalled') {
      logScan(batch.id, farmerId, farmerPhone, location, 'counterfeit');
      appendEvent(batch.id, 'scanned', farmerId, 'farmer', { phone: farmerPhone, result: 'recalled_batch' });
      if (farmerPhone) await sendSms(farmerPhone, `RECALL ALERT: Batch ${batch.product_name} has been OFFICIALLY RECALLED. Stop use immediately and return to dealer.`);
      return res.json({ authentic: false, reason: 'recalled', message: 'This batch has been officially recalled.', recalled: true });
    }

    if (batch.status === 'flagged') {
      logScan(batch.id, farmerId, farmerPhone, location, 'counterfeit');
      appendEvent(batch.id, 'scanned', farmerId, 'farmer', { phone: farmerPhone, result: 'flagged_batch' });
      if (farmerPhone) await sendSms(farmerPhone, `Warning: Batch ${batch.product_name} has been flagged. Contact dealer.`);
      return res.json({ authentic: false, reason: 'flagged', message: 'This batch has been flagged.' });
    }

    const recentScan = farmerId ? db.prepare(`SELECT * FROM scan_logs WHERE batch_id = ? AND farmer_id = ? AND result = 'authentic'`).get(batch.id, farmerId) : null;
    if (recentScan) {
      logScan(batch.id, farmerId, farmerPhone, location, 'already_used');
      if (farmerPhone) await sendSms(farmerPhone, `This ${batch.product_name} code was already scanned. Product is authentic.`);
      return res.json({ authentic: true, alreadyScanned: true, product: batch.product_name, mfgDate: batch.mfg_date, expiryDate: batch.expiry_date });
    }

    logScan(batch.id, farmerId, farmerPhone, location, 'authentic');
    if (farmerPhone) await sendSms(farmerPhone, `Product: ${batch.product_name}\nMfg: ${batch.mfg_date}\nExp: ${batch.expiry_date}\nStatus: AUTHENTIC`);
    res.json({ authentic: true, product: batch.product_name, mfgDate: batch.mfg_date, expiryDate: batch.expiry_date, message: 'Product is authentic.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/history', authenticate, (req, res) => {
  try {
    const rows = db.prepare(`SELECT s.*, b.product_name, b.product_type FROM scan_logs s JOIN batches b ON s.batch_id = b.id WHERE s.farmer_id = ? ORDER BY s.scanned_at DESC`).all(req.user.id);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
