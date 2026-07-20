const { Router } = require('express');
const crypto = require('crypto');
const db = require('../db/connection');
const { sendSms } = require('../services/sms.service');
const { getAdvisory } = require('../services/advisory.service');
const { rateLimit } = require('../middleware/rate-limit');
const { appendEvent } = require('../services/trace.service');

const router = Router();
function uuid() { return crypto.randomUUID(); }

router.post('/inbound', rateLimit(5, 60000), async (req, res) => {
  try {
    const { phone, message } = req.body;
    if (!phone || !message) return res.status(400).json({ error: 'phone and message required' });

    const msgId = uuid();
    db.prepare(`INSERT INTO sms_messages (id, phone, direction, message, status) VALUES (?,?,?,?,?)`).run(msgId, phone, 'inbound', message, 'processed');

    const parts = message.trim().split(/\s+/);
    const keyword = parts[0].toUpperCase();

    switch (keyword) {
      case 'VERIFY': {
        const code = parts[1];
        if (!code) {
          await sendSms(phone, 'Usage: VERIFY <QR-code>. Example: VERIFY a1b2c3d4');
          return res.json({ keyword: 'VERIFY', response: 'Usage instruction sent' });
        }

        const batch = db.prepare(`SELECT * FROM batches WHERE qr_code = ?`).get(code);
        if (!batch) {
          db.prepare(`INSERT INTO scan_logs (id, batch_id, phone, result) VALUES (?,?,?,?)`).run(uuid(), null, phone, 'counterfeit');
          await sendSms(phone, 'Product code not found. This may be COUNTERFEIT. Report to agriculture office.');
          return res.json({ keyword: 'VERIFY', result: 'counterfeit' });
        }

        if (new Date(batch.expiry_date) < new Date()) {
          db.prepare(`INSERT INTO scan_logs (id, batch_id, phone, result) VALUES (?,?,?,?)`).run(uuid(), batch.id, phone, 'authentic');
          await sendSms(phone, `${batch.product_name}: EXPIRED (${batch.expiry_date}). Please dispose.`);
          return res.json({ keyword: 'VERIFY', result: 'expired' });
        }

        if (batch.status === 'recalled') {
          db.prepare(`INSERT INTO scan_logs (id, batch_id, phone, result) VALUES (?,?,?,?)`).run(uuid(), batch.id, phone, 'counterfeit');
          await sendSms(phone, `RECALL ALERT: ${batch.product_name} batch has been OFFICIALLY RECALLED. Stop use immediately.`);
          return res.json({ keyword: 'VERIFY', result: 'recalled' });
        }

        db.prepare(`INSERT INTO scan_logs (id, batch_id, phone, result) VALUES (?,?,?,?)`).run(uuid(), batch.id, phone, 'authentic');
        appendEvent(batch.id, 'scanned', null, 'farmer', { phone, method: 'sms' });
        await sendSms(phone, `${batch.product_name}: AUTHENTIC. Mfg: ${batch.mfg_date}, Exp: ${batch.expiry_date}`);
        return res.json({ keyword: 'VERIFY', result: 'authentic', product: batch.product_name });
      }

      case 'ADVICE': {
        const user = db.prepare(`SELECT * FROM users WHERE phone = ? AND role = 'farmer'`).get(phone);
        if (!user || !user.crop_type) {
          await sendSms(phone, 'Please register first via app or visit a dealer. Set your crop type to get advice.');
          return res.json({ keyword: 'ADVICE', response: 'Registration required' });
        }
        const advisory = await getAdvisory(user.crop_type, user.soil_type, user.upazila);
        const advId = uuid();
        db.prepare(`INSERT INTO advisories (id, crop_type, soil_type, upazila, condition_rule, message_template) VALUES (?,?,?,?,?,?)`).run(
          advId, user.crop_type, user.soil_type || null, user.upazila || '', advisory.condition, advisory.message
        );
        db.prepare(`INSERT INTO advisory_logs (id, farmer_id, advisory_id, channel) VALUES (?,?,?,?)`).run(uuid(), user.id, advId, 'sms');
        await sendSms(phone, advisory.message);
        return res.json({ keyword: 'ADVICE', message: advisory.message });
      }

      case 'COMPLAIN': {
        const code = parts[1];
        const desc = parts.slice(2).join(' ') || 'Counterfeit suspected';
        if (!code) {
          await sendSms(phone, 'Usage: COMPLAIN <QR-code> [description]. Example: COMPLAIN a1b2c3d4 Fake product');
          return res.json({ keyword: 'COMPLAIN', response: 'Usage instruction sent' });
        }

        const batch = db.prepare(`SELECT * FROM batches WHERE qr_code = ?`).get(code);
        if (!batch) {
          await sendSms(phone, 'Code not found. Complaint cannot be filed without valid batch code.');
          return res.json({ keyword: 'COMPLAIN', error: 'Invalid code' });
        }

        const user = db.prepare(`SELECT id FROM users WHERE phone = ?`).get(phone);
        const complaintId = uuid();
        db.prepare(`INSERT INTO complaints (id, batch_id, farmer_id, phone, description, routed_to) VALUES (?,?,?,?,?,?)`).run(
          complaintId, batch.id, user?.id || null, phone, desc, batch.supplier_id
        );
        db.prepare(`UPDATE batches SET status = 'flagged' WHERE id = ?`).run(batch.id);
        appendEvent(batch.id, 'complaint_filed', user?.id || null, 'farmer', { phone, description: desc, method: 'sms' });

        await sendSms(phone, `Complaint filed (ID: ${complaintId.slice(0,8)}). Supplier notified. Status: under_review`);
        return res.json({ keyword: 'COMPLAIN', complaintId, status: 'filed' });
      }

      default:
        await sendSms(phone, 'Unknown command. Available: VERIFY <code>, ADVICE, COMPLAIN <code>.');
        return res.json({ keyword: 'UNKNOWN', response: 'Help text sent' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/messages', (req, res) => {
  const messages = db.prepare(`SELECT * FROM sms_messages ORDER BY created_at DESC LIMIT 50`).all();
  res.json(messages);
});

module.exports = router;
