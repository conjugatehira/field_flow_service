const { Router } = require('express');
const crypto = require('crypto');
const db = require('../db/connection');
const { authenticate, authorize } = require('../middleware/auth');
const { generateQrCode, generateQrImage, generateQrWithPayload, buildSignedPayload } = require('../services/qr.service');
const { appendEvent } = require('../services/trace.service');

const router = Router();
function uuid() { return crypto.randomUUID(); }

router.post('/', authenticate, authorize('dealer', 'admin'), async (req, res) => {
  try {
    const { productName, productType, supplierId, mfgDate, expiryDate, quantity, supplierBatchOriginId } = req.body;
    if (!productName || !productType || !mfgDate || !expiryDate) {
      return res.status(400).json({ error: 'productName, productType, mfgDate, expiryDate required' });
    }
    let dealerId;
    if (req.user.role === 'admin') {
      if (req.body.dealerId) {
        dealerId = req.body.dealerId;
      } else {
        return res.status(400).json({ error: 'Admin must provide dealerId' });
      }
    } else {
      const dealer = db.prepare(`SELECT id FROM dealers WHERE user_id = ?`).get(req.user.id);
      if (!dealer) return res.status(400).json({ error: 'Dealer profile not found' });
      dealerId = dealer.id;
    }

    let finalSupplierId = supplierId || null;
    let finalOriginId = supplierBatchOriginId || null;

    if (supplierBatchOriginId) {
      const origin = db.prepare(`SELECT * FROM supplier_batch_origins WHERE id = ?`).get(supplierBatchOriginId);
      if (!origin) return res.status(400).json({ error: 'Supplier batch origin not found' });
      finalSupplierId = origin.supplier_id;
      db.prepare(`UPDATE supplier_batch_origins SET status = 'registered' WHERE id = ?`).run(supplierBatchOriginId);
    } else if (supplierId) {
      const sup = db.prepare(`SELECT id FROM suppliers WHERE id = ?`).get(supplierId);
      if (sup) finalSupplierId = sup.id;
    }

    const id = uuid();
    const qr = generateQrCode(id, dealerId, productName);

    db.prepare(`INSERT INTO batches (id, product_name, product_type, dealer_id, supplier_id, qr_code, qr_signature, mfg_date, expiry_date, quantity, supplier_batch_origin_id) VALUES (?,?,?,?,?,?,?,?,?,?,?)`).run(
      id, productName, productType, dealerId, finalSupplierId, qr.code, qr.signature, mfgDate, expiryDate, quantity || 1, finalOriginId
    );
    const batch = db.prepare(`SELECT * FROM batches WHERE id = ?`).get(id);
    appendEvent(id, 'batch_created', req.user.id, req.user.role, { productName, productType, quantity });
    res.status(201).json(batch);
  } catch (err) {
    if (err.message.includes('FOREIGN KEY')) return res.status(400).json({ error: 'Invalid supplier or dealer ID' });
    res.status(500).json({ error: err.message });
  }
});

router.get('/', authenticate, (req, res) => {
  try {
    let sql = `SELECT b.*, d.business_name AS dealer_name FROM batches b JOIN dealers d ON b.dealer_id = d.id`;
    const params = [];
    const conditions = [];
    if (req.user.role === 'dealer') {
      conditions.push(`b.dealer_id = (SELECT id FROM dealers WHERE user_id = ?)`);
      params.push(req.user.id);
    }
    if (req.query.qr) {
      conditions.push(`b.qr_code = ?`);
      params.push(req.query.qr);
    }
    if (conditions.length) sql += ` WHERE ${conditions.join(' AND ')}`;
    sql += ` ORDER BY b.created_at DESC`;
    const rows = db.prepare(sql).all(...params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', authenticate, (req, res) => {
  try {
    const row = db.prepare(`SELECT b.*, d.business_name AS dealer_name FROM batches b JOIN dealers d ON b.dealer_id = d.id WHERE b.id = ?`).get(req.params.id);
    if (!row) return res.status(404).json({ error: 'Batch not found' });
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/qr/code', async (req, res) => {
  try {
    const { text } = req.query;
    if (!text) return res.status(400).json({ error: 'text query param required' });
    const image = await generateQrImage(text);
    res.json({ qrImage: image });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id/qr', authenticate, async (req, res) => {
  try {
    const row = db.prepare(`SELECT * FROM batches WHERE id = ?`).get(req.params.id);
    if (!row) return res.status(404).json({ error: 'Batch not found' });
    const payload = buildSignedPayload(row);
    const { image } = await generateQrWithPayload(row);
    res.json({ qrImage: image, payload });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id/scan-logs', authenticate, (req, res) => {
  try {
    const rows = db.prepare(`SELECT s.*, u.name AS farmer_name FROM scan_logs s LEFT JOIN users u ON s.farmer_id = u.id WHERE s.batch_id = ? ORDER BY s.scanned_at DESC`).all(req.params.id);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
