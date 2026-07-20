const { Router } = require('express');
const crypto = require('crypto');
const db = require('../db/connection');
const { authenticate, authorize } = require('../middleware/auth');
const { sendSms } = require('../services/sms.service');
const { appendEvent } = require('../services/trace.service');

const router = Router();
function uuid() { return crypto.randomUUID(); }

function getSupplierId(userId) {
  const s = db.prepare(`SELECT id FROM suppliers WHERE user_id = ?`).get(userId);
  return s ? s.id : null;
}

// --- Batch Origination ---

router.post('/batch-origins', authenticate, authorize('supplier', 'admin'), (req, res) => {
  try {
    const supplierId = req.user.role === 'admin' ? req.body.supplierId : getSupplierId(req.user.id);
    if (!supplierId) return res.status(404).json({ error: 'Supplier not found' });
    const { productName, productType, batchNumber, mfgDate, expiryDate, quantity } = req.body;
    if (!productName || !productType || !mfgDate || !expiryDate) {
      return res.status(400).json({ error: 'productName, productType, mfgDate, expiryDate required' });
    }
    const id = uuid();
    db.prepare(`INSERT INTO supplier_batch_origins (id, supplier_id, product_name, product_type, batch_number, mfg_date, expiry_date, quantity) VALUES (?,?,?,?,?,?,?,?)`).run(
      id, supplierId, productName, productType, batchNumber || null, mfgDate, expiryDate, quantity || 1
    );
    const origin = db.prepare(`SELECT * FROM supplier_batch_origins WHERE id = ?`).get(id);
    res.status(201).json(origin);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/batch-origins', authenticate, authorize('supplier', 'admin'), (req, res) => {
  try {
    const supplierId = req.user.role === 'admin' ? req.query.supplierId : getSupplierId(req.user.id);
    if (!supplierId && req.user.role !== 'admin') return res.status(404).json({ error: 'Supplier not found' });
    let rows;
    if (req.user.role === 'admin' && !req.query.supplierId) {
      rows = db.prepare(`SELECT o.*, s.name AS supplier_name FROM supplier_batch_origins o JOIN suppliers s ON o.supplier_id = s.id ORDER BY o.created_at DESC`).all();
    } else {
      rows = db.prepare(`SELECT * FROM supplier_batch_origins WHERE supplier_id = ? ORDER BY created_at DESC`).all(supplierId);
    }
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Investigations ---

router.post('/investigations', authenticate, authorize('supplier', 'admin'), (req, res) => {
  try {
    const supplierId = req.user.role === 'admin' ? req.body.supplierId : getSupplierId(req.user.id);
    if (!supplierId) return res.status(404).json({ error: 'Supplier not found' });
    const { batchId } = req.body;
    if (!batchId) return res.status(400).json({ error: 'batchId required' });
    const batch = db.prepare(`SELECT * FROM batches WHERE id = ?`).get(batchId);
    if (!batch) return res.status(404).json({ error: 'Batch not found' });
    const existing = db.prepare(`SELECT id FROM investigations WHERE batch_id = ? AND supplier_id = ?`).get(batchId, supplierId);
    if (existing) return res.status(409).json({ error: 'Investigation already exists for this batch' });
    const id = uuid();
    db.prepare(`INSERT INTO investigations (id, batch_id, supplier_id) VALUES (?,?,?)`).run(id, batchId, supplierId);
    db.prepare(`UPDATE complaints SET status = 'escalated' WHERE batch_id = ? AND status IN ('filed','under_review')`).run(batchId);
    db.prepare(`UPDATE batches SET status = 'flagged' WHERE id = ? AND status NOT IN ('recalled','expired')`).run(batchId);
    const inv = db.prepare(`SELECT * FROM investigations WHERE id = ?`).get(id);
    res.status(201).json(inv);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/investigations/:id', authenticate, authorize('supplier', 'admin'), (req, res) => {
  try {
    const supplierId = req.user.role === 'admin' ? null : getSupplierId(req.user.id);
    const inv = db.prepare(`SELECT * FROM investigations WHERE id = ?`).get(req.params.id);
    if (!inv) return res.status(404).json({ error: 'Investigation not found' });
    if (supplierId && inv.supplier_id !== supplierId) return res.status(403).json({ error: 'Not your investigation' });
    const { status, finding, notes } = req.body;
    if (status && !['pending', 'investigating', 'resolved'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    if (finding && !['genuine_resold', 'dealer_diversion', 'counterfeit', 'not_ours'].includes(finding)) {
      return res.status(400).json({ error: 'Invalid finding' });
    }
    const sets = [];
    const params = [];
    if (status) { sets.push('status = ?'); params.push(status); }
    if (finding) { sets.push('finding = ?'); params.push(finding); }
    if (notes !== undefined) { sets.push('notes = ?'); params.push(notes); }
    sets.push("updated_at = datetime('now')");
    if (sets.length > 1) {
      params.push(req.params.id);
      db.prepare(`UPDATE investigations SET ${sets.join(', ')} WHERE id = ?`).run(...params);
    }
    if (status === 'resolved') {
      appendEvent(inv.batch_id, 'status_changed', req.user.id, req.user.role, { investigationId: inv.id, finding, notes });
    }
    const updated = db.prepare(`SELECT * FROM investigations WHERE id = ?`).get(req.params.id);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/investigations', authenticate, authorize('supplier', 'admin'), (req, res) => {
  try {
    const supplierId = req.user.role === 'admin' ? req.query.supplierId : getSupplierId(req.user.id);
    let rows;
    if (req.user.role === 'admin' && !req.query.supplierId) {
      rows = db.prepare(`SELECT i.*, b.product_name, b.qr_code, s.name AS supplier_name FROM investigations i JOIN batches b ON i.batch_id = b.id JOIN suppliers s ON i.supplier_id = s.id ORDER BY i.created_at DESC`).all();
    } else if (supplierId) {
      rows = db.prepare(`SELECT i.*, b.product_name, b.qr_code FROM investigations i JOIN batches b ON i.batch_id = b.id WHERE i.supplier_id = ? ORDER BY i.created_at DESC`).all(supplierId);
    } else {
      return res.status(404).json({ error: 'Supplier not found' });
    }
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Recall ---

router.post('/recall/:batchId', authenticate, authorize('supplier', 'admin'), async (req, res) => {
  try {
    const { reason } = req.body;
    const batch = db.prepare(`SELECT * FROM batches WHERE id = ?`).get(req.params.batchId);
    if (!batch) return res.status(404).json({ error: 'Batch not found' });

    if (req.user.role === 'supplier') {
      const supplierId = getSupplierId(req.user.id);
      if (!supplierId) return res.status(404).json({ error: 'Supplier not found' });
      if (batch.supplier_id !== supplierId) return res.status(403).json({ error: 'You can only recall your own batches' });
    }

    db.prepare(`UPDATE batches SET status = 'recalled' WHERE id = ?`).run(batch.id);
    appendEvent(batch.id, 'recalled', req.user.id, req.user.role, { reason: reason || 'Supplier-initiated recall' });

    const complaints = db.prepare(`SELECT DISTINCT phone FROM complaints WHERE batch_id = ? AND phone IS NOT NULL`).all(batch.id);
    for (const c of complaints) {
      await sendSms(c.phone, `URGENT: Batch ${batch.product_name} (${batch.qr_code?.slice(0,8)}) has been RECALLED. Stop use and return to dealer.`);
    }

    res.json({ recalled: true, batchId: batch.id, productName: batch.product_name, status: 'recalled' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Fraud Analytics ---

router.get('/analytics', authenticate, authorize('supplier', 'admin'), (req, res) => {
  try {
    const supplierId = req.user.role === 'admin' ? req.query.supplierId : getSupplierId(req.user.id);

    let supplierFilter = '';
    const params = [];
    if (supplierId) {
      supplierFilter = 'WHERE b.supplier_id = ?';
      params.push(supplierId);
    }

    const flagsByProduct = db.prepare(
      `SELECT b.product_name, b.product_type, COUNT(*) AS flag_count FROM complaints c JOIN batches b ON c.batch_id = b.id ${supplierFilter} GROUP BY b.product_name ORDER BY flag_count DESC`
    ).all(...params);

    const flagsByRegion = db.prepare(
      `SELECT u.upazila, COUNT(*) AS flag_count FROM complaints c JOIN batches b ON c.batch_id = b.id JOIN dealers d ON b.dealer_id = d.id JOIN users u ON d.user_id = u.id ${supplierFilter} GROUP BY u.upazila ORDER BY flag_count DESC`
    ).all(...params);

    const flagsByDealer = db.prepare(
      `SELECT d.id, d.business_name, COUNT(*) AS flag_count FROM complaints c JOIN batches b ON c.batch_id = b.id JOIN dealers d ON b.dealer_id = d.id ${supplierFilter} GROUP BY d.id ORDER BY flag_count DESC`
    ).all(...params);

    const investigationFindings = supplierId
      ? db.prepare(`SELECT finding, COUNT(*) AS count FROM investigations WHERE supplier_id = ? AND finding IS NOT NULL GROUP BY finding`).all(supplierId)
      : db.prepare(`SELECT finding, COUNT(*) AS count FROM investigations WHERE finding IS NOT NULL GROUP BY finding`).all();

    const totalFlagged = db.prepare(
      `SELECT COUNT(DISTINCT c.batch_id) AS unique_batches, COUNT(*) AS total_complaints FROM complaints c JOIN batches b ON c.batch_id = b.id ${supplierFilter}`
    ).all(...params)[0];

    res.json({
      totalFlagged,
      flagsByProduct,
      flagsByRegion,
      flagsByDealer,
      investigationFindings,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Enhanced Dashboard ---

router.get('/dashboard', authenticate, authorize('supplier', 'admin'), (req, res) => {
  try {
    const supplierId = req.user.role === 'admin' ? req.query.supplierId || req.body.supplierId : getSupplierId(req.user.id);
    if (!supplierId) return res.status(404).json({ error: 'Supplier not found' });

    const flaggedBatches = db.prepare(`SELECT COUNT(*) AS count FROM batches WHERE supplier_id = ? AND status = 'flagged'`).get(supplierId);
    const recalledBatches = db.prepare(`SELECT COUNT(*) AS count FROM batches WHERE supplier_id = ? AND status = 'recalled'`).get(supplierId);
    const totalBatches = db.prepare(`SELECT COUNT(*) AS count FROM batches WHERE supplier_id = ?`).get(supplierId);
    const totalComplaints = db.prepare(`SELECT COUNT(*) AS count FROM complaints WHERE routed_to = ?`).get(supplierId);
    const pendingComplaints = db.prepare(`SELECT COUNT(*) AS count FROM complaints WHERE routed_to = ? AND status IN ('filed','under_review','escalated')`).get(supplierId);
    const pendingInvestigations = db.prepare(`SELECT COUNT(*) AS count FROM investigations WHERE supplier_id = ? AND status IN ('pending','investigating')`).get(supplierId);
    const originCount = db.prepare(`SELECT COUNT(*) AS count FROM supplier_batch_origins WHERE supplier_id = ?`).get(supplierId);

    const complaints = db.prepare(
      `SELECT c.*, b.product_name, b.qr_code, b.status AS batch_status, d.business_name AS dealer_name FROM complaints c
       JOIN batches b ON c.batch_id = b.id
       JOIN dealers d ON b.dealer_id = d.id
       WHERE c.routed_to = ? ORDER BY c.created_at DESC`
    ).all(supplierId);

    const batches = db.prepare(
      `SELECT b.*, d.business_name AS dealer_name, i.status AS investigation_status, i.finding FROM batches b
       JOIN dealers d ON b.dealer_id = d.id
       LEFT JOIN investigations i ON i.batch_id = b.id AND i.supplier_id = ?
       WHERE b.supplier_id = ? ORDER BY b.created_at DESC`
    ).all(supplierId, supplierId);

    const origins = db.prepare(`SELECT * FROM supplier_batch_origins WHERE supplier_id = ? ORDER BY created_at DESC`).all(supplierId);

    const investigations = db.prepare(
      `SELECT i.*, b.product_name, b.qr_code FROM investigations i JOIN batches b ON i.batch_id = b.id WHERE i.supplier_id = ? ORDER BY i.created_at DESC`
    ).all(supplierId);

    res.json({
      stats: {
        totalBatches: totalBatches.count,
        flaggedBatches: flaggedBatches.count,
        recalledBatches: recalledBatches.count,
        totalComplaints: totalComplaints.count,
        pendingComplaints: pendingComplaints.count,
        pendingInvestigations: pendingInvestigations.count,
        batchOrigins: originCount.count,
      },
      complaints,
      batches,
      origins,
      investigations,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
