const { Router } = require('express');
const crypto = require('crypto');
const db = require('../db/connection');
const { authenticate, authorize } = require('../middleware/auth');
const { sendSms } = require('../services/sms.service');
const { appendEvent } = require('../services/trace.service');

const router = Router();
function uuid() { return crypto.randomUUID(); }

const ESCALATION_THRESHOLD = 3;

router.post('/', async (req, res) => {
  try {
    const { batchId, farmerId, phone, description } = req.body;
    if (!batchId || !description) return res.status(400).json({ error: 'batchId and description required' });

    const batch = db.prepare(`SELECT * FROM batches WHERE id = ?`).get(batchId);
    if (!batch) return res.status(404).json({ error: 'Batch not found' });

    const id = uuid();
    db.prepare(`INSERT INTO complaints (id, batch_id, farmer_id, phone, description, routed_to) VALUES (?,?,?,?,?,?)`).run(
      id, batchId, farmerId || null, phone || null, description, batch.supplier_id
    );
    db.prepare(`UPDATE batches SET status = 'flagged' WHERE id = ?`).run(batchId);
    appendEvent(batchId, 'complaint_filed', farmerId || null, 'farmer', { complaintId: id, description, phone });

    const complaintCount = db.prepare(`SELECT COUNT(*) AS count FROM complaints WHERE batch_id = ? AND status IN ('filed', 'under_review')`).get(batchId);
    if (complaintCount.count >= ESCALATION_THRESHOLD && batch.supplier_id) {
      db.prepare(`UPDATE complaints SET status = 'escalated' WHERE batch_id = ? AND status IN ('filed', 'under_review')`).run(batchId);
      appendEvent(batchId, 'status_changed', null, 'system', { reason: 'escalated', threshold: ESCALATION_THRESHOLD, complaintCount: complaintCount.count });
      if (batch.supplier_id) {
        const supplier = db.prepare(`SELECT s.name, u.phone FROM suppliers s JOIN users u ON s.user_id = u.id WHERE s.id = ?`).get(batch.supplier_id);
        if (supplier?.phone) {
          await sendSms(supplier.phone, `ESCALATION: Batch ${batch.product_name} (${batch.qr_code?.slice(0,8)}) has ${complaintCount.count} complaints. Investigate immediately.`);
        }
      }
    }

    const complaint = db.prepare(`SELECT * FROM complaints WHERE id = ?`).get(id);
    if (phone) await sendSms(phone, `Your complaint has been filed (ID: ${id.slice(0, 8)}). You will be notified when resolved.`);
    res.status(201).json(complaint);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/', authenticate, (req, res) => {
  try {
    let sql = `SELECT c.*, b.product_name, b.qr_code FROM complaints c JOIN batches b ON c.batch_id = b.id`;
    const params = [];
    if (req.user.role === 'dealer') {
      sql += ` WHERE b.dealer_id = (SELECT id FROM dealers WHERE user_id = ?)`;
      params.push(req.user.id);
    } else if (req.user.role === 'farmer') {
      sql += ` WHERE c.farmer_id = ?`;
      params.push(req.user.id);
    } else if (req.user.role === 'supplier') {
      sql += ` WHERE c.routed_to = (SELECT id FROM suppliers WHERE user_id = ?)`;
      params.push(req.user.id);
    }
    sql += ` ORDER BY c.created_at DESC`;
    const rows = db.prepare(sql).all(...params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/:id/status', authenticate, authorize('admin', 'dealer', 'supplier'), async (req, res) => {
  try {
    const { status } = req.body;
    if (!['under_review', 'resolved', 'dismissed'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    db.prepare(`UPDATE complaints SET status = ?, updated_at = datetime('now') WHERE id = ?`).run(status, req.params.id);
    const complaint = db.prepare(`SELECT * FROM complaints WHERE id = ?`).get(req.params.id);
    if (!complaint) return res.status(404).json({ error: 'Complaint not found' });
    appendEvent(complaint.batch_id, 'status_changed', req.user.id, req.user.role, { complaintId: complaint.id, newStatus: status });
    if (complaint.phone) await sendSms(complaint.phone, `Your complaint (ID: ${complaint.id.slice(0, 8)}) status: ${status}.`);
    res.json(complaint);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
